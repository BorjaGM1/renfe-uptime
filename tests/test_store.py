import sqlite3
from datetime import datetime, timedelta, timezone

from renfe_uptime import checks, store

NOW = datetime(2026, 11, 24, 16, 0, tzinfo=timezone.utc)


def memory_db():
    db = sqlite3.connect(":memory:")
    db.executescript(store.SCHEMA)
    return db


def fake(ok, data=None):
    def fn(now):
        if not ok:
            raise checks.Down("caído de mentira")
        return "bien", data
    return fn


def test_round_without_network_is_stored_but_not_counted(monkeypatch):
    monkeypatch.setattr(checks, "network_ok", lambda: False)
    db = memory_db()
    line = store.collect(db, NOW, {"web": fake(False)})
    assert "no cuenta" in line
    assert db.execute("select counted from checks").fetchall() == [(0,)]
    assert store.export(db, NOW)["services"][0]["uptime"]["24h"] is None


def test_odd_train_feed_does_not_lose_the_round(monkeypatch):
    monkeypatch.setattr(checks, "network_ok", lambda: True)
    db = memory_db()
    store.collect(db, NOW, {"cercanias": fake(True, {"entity": [{"tripUpdate": {"trip": "x", "stopTimeUpdate": [None]}}]})})
    assert db.execute("select count(*) from checks").fetchone() == (1,)


def test_uptime_windows_and_all_up(monkeypatch):
    monkeypatch.setattr(checks, "network_ok", lambda: True)
    db = memory_db()
    for i, ok in enumerate([True, True, True, False]):
        store.collect(db, NOW - timedelta(minutes=5 * i), {"web": fake(ok), "gtfs": fake(True)})
    d = store.export(db, NOW)
    web = next(s for s in d["services"] if s["key"] == "web")
    assert web["uptime"]["24h"] == 0.75 and d["all_up"]["24h"] == 0.75 and d["rounds"] == 4
    assert len(web["hourly"]["values"]) == store.HOURS


def test_prune_keeps_thirty_days_of_checks_and_every_train():
    db = memory_db()
    for days in (31, 29.9):
        db.execute("insert into checks values (?, 'web', 1, 1, '', 1)", (int((NOW - timedelta(days=days)).timestamp()),))
    old = int((NOW - timedelta(days=400)).timestamp())
    db.execute("insert into trains (ts, kind, n, le5, canceled) values (?, 'ld', 10, 5, 0)", (old,))
    train_day(db, "2025-10-20", "viejo")
    train_day(db, "2026-11-20", "reciente")
    store.prune(db, NOW)
    assert db.execute("select count(*) from checks").fetchone() == (1,)
    # El histórico de trenes no se toca, tenga la edad que tenga.
    assert db.execute("select count(*) from trains").fetchone() == (1,)
    assert db.execute("select id from train_days order by day").fetchall() == [("viejo",), ("reciente",)]


def test_now_is_hidden_when_the_last_train_sample_is_old():
    db = memory_db()
    db.execute("insert into trains (ts, kind, n, le5, canceled) values (?, 'ld', 10, 5, 0)",
               (int((NOW - timedelta(hours=3)).timestamp()),))
    assert store.export(db, NOW)["trains"][0]["now"] is None


def train_day(db, day, tid, delay=0, kind="ld", canceled=0):
    db.execute("insert into train_days values (?, ?, ?, '', 0, 0, ?, ?, 1, ?)", (day, kind, tid, delay, delay, canceled))


def cercanias(*trips):
    """trips: (viaje, segundos de retraso) o (viaje, None) si está cancelado."""
    return fake(True, {"entity": [
        {"tripUpdate": {"trip": {"tripId": tid, **({} if secs is not None else {"scheduleRelationship": "CANCELED"})},
                        **({"delay": secs} if secs is not None else {})}} for tid, secs in trips]})


def test_each_train_counts_once_a_day_with_its_last_delay(monkeypatch):
    monkeypatch.setattr(checks, "network_ok", lambda: True)
    db = memory_db()
    rounds = [[("a", 900), ("b", 0), ("c", None)],   # a va 15 min tarde; c, cancelado
              [("a", 600), ("b", 0), ("c", None)],
              [("a", 60), ("b", 420), ("c", None)]]   # a recupera; b acaba 7 min tarde
    for i, trips in enumerate(rounds):
        store.collect(db, NOW + timedelta(minutes=5 * i), {"cercanias": cercanias(*trips)})
    assert db.execute("select id, delay, worst, seen, canceled from train_days order by id").fetchall() == [
        ("a", 1, 15, 3, 0), ("b", 7, 7, 3, 0), ("c", None, None, 3, 1)]
    day = next(t for t in store.export(db, NOW + timedelta(minutes=10))["trains"] if t["kind"] == "cer")["day"]
    # Tres trenes, no nueve apuntes: en hora solo «a», por cómo se le vio la última vez.
    assert (day["n"], day["le5"], day["canceled"], day["worst"]["train"], day["worst"]["delay"]) == (3, 1, 1, "a", 15)


def test_a_trip_across_midnight_stays_in_the_day_it_left():
    db = memory_db()
    before = int(datetime(2026, 11, 24, 22, 50, tzinfo=timezone.utc).timestamp())  # 23:50 en Madrid
    store.record_trains(db, before, "ld", [(3, "100", "A → B")], [])
    store.record_trains(db, before + 1200, "ld", [(9, "100", "A → B")], [])       # 00:10 del día siguiente
    assert db.execute("select day, delay, seen from train_days").fetchall() == [("2026-11-24", 9, 2)]
    # El mismo número al día siguiente, tras la noche, ya es otro viaje.
    store.record_trains(db, before + 20 * 3600, "ld", [(0, "100", "A → B")], [])
    assert [r[0] for r in db.execute("select day from train_days order by day")] == ["2026-11-24", "2026-11-25"]


def test_same_number_on_another_route_is_another_trip():
    db = memory_db()
    ts = int(NOW.timestamp())
    store.record_trains(db, ts, "ld", [(0, "100", "A → B"), (30, "100", "B → A"), (-200, "200", "A → B")], [])
    # El 200 trae horas de adelanto: no es un dato y no se apunta.
    assert db.execute("select id, route, delay from train_days order by route").fetchall() == [
        ("100", "A → B", 0), ("100", "B → A", 30)]


def test_the_page_shows_yesterday_until_today_has_enough_trains():
    db = memory_db()
    assert store.export(db, NOW)["day"]["enough"] is False   # nada todavía: hoy, y sin cifra
    for i in range(store.MIN_TRAINS):
        train_day(db, "2026-11-23", f"t{i}", delay=10 if i < 5 else 0)
    train_day(db, "2026-11-24", "madrugador")
    d = store.export(db, NOW)
    assert (d["day"]["date"], d["day"]["today"], d["day"]["enough"]) == ("2026-11-23", False, True)
    assert d["trains"][0]["day"]["punctual"] == 0.75
    for i in range(store.MIN_TRAINS):
        train_day(db, "2026-11-24", f"t{i}")
    d = store.export(db, NOW)
    assert (d["day"]["date"], d["day"]["today"]) == ("2026-11-24", True)


def test_day_counts_only_its_own_rounds(monkeypatch):
    monkeypatch.setattr(checks, "network_ok", lambda: True)
    db = memory_db()
    store.collect(db, NOW - timedelta(days=1), {"web": fake(False)})   # ayer falló
    for i in range(3):
        store.collect(db, NOW - timedelta(minutes=5 * i), {"web": fake(True)})
    d = store.export(db, NOW)
    web = next(s for s in d["services"] if s["key"] == "web")
    assert (d["day"]["rounds"], d["day"]["all_ok"], web["day"]) == (3, 3, {"ok": 3, "n": 3})
    assert d["day"]["to_ts"] == int(NOW.timestamp())


def test_provinces_keep_each_trains_last_delay_there_and_its_day():
    db = memory_db()
    before = int(datetime(2026, 11, 24, 22, 50, tzinfo=timezone.utc).timestamp())  # 23:50 en Madrid
    rounds = [[(3, "100", "A → B", "Madrid")],
              [(6, "100", "A → B", "Madrid"), (6, "100", "A → B", "Toledo")],
              [(9, "100", "A → B", "Toledo")]]  # ya pasada la medianoche
    for i, places in enumerate(rounds):
        ts = before + 600 * i
        store.record_trains(db, ts, "ld", [p[:3] for p in places[:1]], [])
        store.record_places(db, ts, "ld", places + [(-200, "200", "A → B", "Madrid")])  # 200: no es un dato
    assert db.execute("select day, id, province, delay, seen from train_provinces order by province").fetchall() == [
        ("2026-11-24", "100", "Madrid", 6, 2), ("2026-11-24", "100", "Toledo", 9, 2)]


def test_a_round_stores_where_each_train_was(monkeypatch):
    monkeypatch.setattr(checks, "network_ok", lambda: True)
    monkeypatch.setattr(checks, "station_provinces", lambda: {"18000": "Madrid"})
    db = memory_db()
    feed = fake(True, {"entity": [{"tripUpdate": {"trip": {"tripId": "a"}, "delay": 60,
                                                  "stopTimeUpdate": [{"stopId": "18000"}]}}]})
    store.collect(db, NOW, {"cercanias": feed})
    assert db.execute("select kind, id, province, delay from train_provinces").fetchall() == [("cer", "a", "Madrid", 1)]
