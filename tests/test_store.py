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


def test_prune_keeps_three_days():
    db = memory_db()
    for days in (4, 2.9):
        db.execute("insert into checks values (?, 'web', 1, 1, '', 1)", (int((NOW - timedelta(days=days)).timestamp()),))
    store.prune(db, NOW)
    assert db.execute("select count(*) from checks").fetchone() == (1,)


def test_now_is_hidden_when_the_last_train_sample_is_old():
    db = memory_db()
    db.execute("insert into trains (ts, kind, n, le5, canceled) values (?, 'ld', 10, 5, 0)",
               (int((NOW - timedelta(hours=3)).timestamp()),))
    assert store.export(db, NOW)["trains"][0]["now"] is None
