"""SQLite: guardar cada ronda y cada tren, borrar las comprobaciones de más de 30 días (los trenes se guardan
siempre) y exportar lo que pinta la página."""

import json
import sqlite3
import statistics
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

from . import DATA, MADRID, OUT, checks, trains

INTERVAL = 300  # segundos entre rondas (el timer de systemd va cada 5 min)
RETENTION = timedelta(days=30)  # solo para las comprobaciones de las webs; el histórico de trenes no se borra
SAME_TRIP = 4 * 3600  # segundos: un tren que reaparece antes de esto sigue en el mismo viaje, aunque cruce la medianoche
MIN_TRAINS = 20  # con menos trenes de larga y media distancia, el día todavía no da para una cifra
WINDOWS = {"24h": 86400, "72h": 3 * 86400}
HOURS = 72  # barras por hora en la página

SCHEMA = """
create table if not exists checks (ts integer not null, service text not null, ok integer not null,
    ms integer not null, detail text, counted integer not null);
create index if not exists checks_ts on checks (ts);
create table if not exists trains (ts integer not null, kind text not null, n integer, on_time integer,
    le5 integer, le15 integer, over60 integer, canceled integer, worst_delay integer, worst_id text,
    worst_route text);
create index if not exists trains_ts on trains (ts);
create table if not exists train_days (day text not null, kind text not null, id text not null,
    route text not null, first_ts integer not null, last_ts integer not null, delay integer, worst integer,
    seen integer not null, canceled integer not null, primary key (day, kind, id, route));
create index if not exists train_days_trip on train_days (kind, id, route, last_ts);
create table if not exists train_provinces (day text not null, kind text not null, id text not null,
    route text not null, province text not null, first_ts integer not null, last_ts integer not null,
    delay integer, seen integer not null, primary key (day, kind, id, route, province));
"""

TRAIN_KINDS = [
    ("ld", "Larga y media distancia",
     "AVE, Alvia, Avant, Intercity y media distancia del mapa en tiempo real. Puntual: 5 min de retraso o menos."),
    ("cer", "Cercanías",
     "Trenes del feed GTFS-RT de Cercanías. Puntual: 5 min de retraso o menos. Un tren cancelado cuenta como no "
     "puntual en cada ronda en que Renfe lo mantiene en el feed."),
]


def connect(path: Path | None = None) -> sqlite3.Connection:
    path = path or DATA / "uptime.db"
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    return db


def collect(db: sqlite3.Connection, now: datetime | None = None, check_fns: dict | None = None) -> str:
    """Una ronda: comprueba todo, guarda y devuelve una línea para el log."""
    now = now or datetime.now(timezone.utc)
    ts = int(now.timestamp())
    # Sin red no se le puede echar la culpa a Renfe: la ronda se guarda pero no cuenta.
    counted = 1 if checks.network_ok() else 0
    results = checks.run_all(check_fns or checks.CHECKS, now)
    with db:
        db.executemany("insert into checks values (?, ?, ?, ?, ?, ?)",
                       [(ts, key, int(ok), ms, detail, counted) for key, (ok, ms, detail, _) in results.items()])
        if counted:
            names, provinces = checks.station_names(), checks.station_provinces()
            for kind, check, read, places in (
                    ("ld", "live", lambda b: (trains.long_distance_trains(b, names), []),
                     lambda b: trains.long_distance_places(b, names, provinces)),
                    ("cer", "cercanias", trains.cercanias_trains, lambda doc: trains.cercanias_places(doc, provinces))):
                data = results.get(check, (None, None, None, None))[3]
                try:
                    delays, canceled = read(data) if data else ([], [])
                    s = trains.summarize(delays, len(canceled))
                    if s:
                        db.execute("insert into trains values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                   (ts, kind, s["n"], s["on_time"], s["le5"], s["le15"], s["over60"], s["canceled"],
                                    s["worst_delay"], s["worst_id"], s["worst_route"]))
                        record_trains(db, ts, kind, delays, canceled)
                        record_places(db, ts, kind, places(data))
                except Exception as err:  # un tren con campos raros no se lleva por delante la ronda
                    print(f"muestra {kind} descartada: {type(err).__name__}", file=sys.stderr, flush=True)
    marks = " ".join(f"{key}:{'ok' if ok else 'KO'}" for key, (ok, *_rest) in results.items())
    return f"{now.astimezone(MADRID):%Y-%m-%d %H:%M:%S} {marks}" + ("" if counted else " (sin red: no cuenta)")


def record_trains(db: sqlite3.Connection, ts: int, kind: str, delays: list, canceled: list) -> None:
    """Cada tren y trayecto, una fila por día: un tren, un voto. Se queda con el retraso de la última vez que
    se le vio (y con el peor). El día es el de la primera vez que se vio ese viaje: si cruza la medianoche
    sigue contando en el día en que salió."""
    day = datetime.fromtimestamp(ts, MADRID).date().isoformat()
    seen = [(d, tid, route, 0) for d, tid, route in delays if d >= -trains.EARLIEST] + [(None, tid, "", 1) for tid in canceled]
    for delay, tid, route, gone in seen:
        if tid == "?":
            continue
        trip = db.execute("select day from train_days where kind = ? and id = ? and route = ? and last_ts >= ? "
                          "order by last_ts desc limit 1", (kind, tid, route, ts - SAME_TRIP)).fetchone()
        db.execute("""insert into train_days (day, kind, id, route, first_ts, last_ts, delay, worst, seen, canceled)
                      values (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                      on conflict (day, kind, id, route) do update set last_ts = excluded.last_ts,
                          delay = excluded.delay, seen = seen + 1, canceled = excluded.canceled,
                          worst = case when excluded.worst is null then worst
                                       when worst is null or excluded.worst > worst then excluded.worst else worst end""",
                   (trip[0] if trip else day, kind, tid, route, ts, ts, delay, delay, gone))


def record_places(db: sqlite3.Connection, ts: int, kind: str, places: list) -> None:
    """Por qué provincias pasa cada tren y trayecto cada día, con el retraso de la última vez que se le vio en
    cada una. El día es el del viaje en train_days (record_trains va antes en la misma ronda). Todavía no sale
    en la página: se guarda para ver si da para una cifra por provincia."""
    for delay, tid, route, province in places:
        trip = db.execute("select day from train_days where kind = ? and id = ? and route = ? and last_ts = ?",
                          (kind, tid, route, ts)).fetchone()
        if not trip:  # un tren que train_days no cuenta (sin número, horas de adelanto) tampoco cuenta aquí
            continue
        db.execute("""insert into train_provinces (day, kind, id, route, province, first_ts, last_ts, delay, seen)
                      values (?, ?, ?, ?, ?, ?, ?, ?, 1)
                      on conflict (day, kind, id, route, province) do update set last_ts = excluded.last_ts,
                          delay = excluded.delay, seen = seen + 1""",
                   (trip[0], kind, tid, route, province, ts, ts, delay))


def prune(db: sqlite3.Connection, now: datetime) -> None:
    """De las comprobaciones de las webs se guardan los últimos RETENTION. Los trenes no se borran nunca: ni las
    cuentas de cada ronda ni cada tren de cada día, ni por qué provincias pasó. Es el histórico, y de ahí saldrá cómo cambian los retrasos."""
    cutoff = int((now - RETENTION).timestamp())
    with db:
        db.execute("delete from checks where ts < ?", (cutoff,))


def day_bounds(day: date) -> tuple[int, int]:
    """Principio y fin (en segundos) de un día de Madrid."""
    start = datetime.combine(day, time.min, MADRID)
    return int(start.timestamp()), int((start + timedelta(days=1)).timestamp())


def shown_day(db: sqlite3.Connection, now: datetime) -> tuple[date, bool]:
    """El día que enseña la página: hoy, en cuanto han circulado bastantes trenes; hasta entonces (de madrugada),
    ayer. El segundo valor dice si ese día da para una cifra."""
    today = now.astimezone(MADRID).date()
    for day in (today, today - timedelta(days=1)):
        n, = db.execute("select count(*) from train_days where day = ? and kind = 'ld'", (day.isoformat(),)).fetchone()
        if n >= MIN_TRAINS:
            return day, True
    return today, False


def ratio(num, den):
    return round(num / den, 5) if den else None


def hourly(rows, now_ts: int) -> dict:
    """rows: (ts, aciertos, total). Una proporción por hora de las últimas HOURS, de la más antigua a la actual."""
    start = now_ts - now_ts % 3600 - (HOURS - 1) * 3600
    acc = [[0, 0] for _ in range(HOURS)]
    for ts, num, den in rows:
        i = (ts - start) // 3600
        if 0 <= i < HOURS:
            acc[i][0] += num
            acc[i][1] += den
    return {"start": start, "values": [ratio(n, d) for n, d in acc]}


def export(db: sqlite3.Connection, now: datetime | None = None) -> dict:
    """Todo lo que pinta la página, ya calculado: la página solo da formato."""
    now = now or datetime.now(timezone.utc)
    now_ts = int(now.timestamp())
    since = {name: now_ts - seconds for name, seconds in WINDOWS.items()}
    bars_from = now_ts - HOURS * 3600
    first, rounds = db.execute("select min(ts), count(distinct ts) from checks where counted = 1").fetchone()
    # Lo del día: es lo que enseña la página. Las ventanas de 24 y 72 h siguen saliendo para quien las quiera.
    day, enough = shown_day(db, now)
    day_from, day_to = day_bounds(day)
    in_day = (day_from, day_to)

    services = []
    for key, name, how in checks.SERVICES:
        last = db.execute("select ok, detail, ts from checks where service = ? and counted = 1 order by ts desc "
                          "limit 1", (key,)).fetchone()
        uptime = {}
        for window, start in since.items():
            ok, total = db.execute("select coalesce(sum(ok), 0), count(*) from checks where service = ? "
                                   "and counted = 1 and ts >= ?", (key, start)).fetchone()
            uptime[window] = ratio(ok, total)
        ms = [r[0] for r in db.execute("select ms from checks where service = ? and counted = 1 and ok = 1 "
                                       "and ts >= ?", (key, since["24h"]))]
        series = db.execute("select ts, ok, 1 from checks where service = ? and counted = 1 and ts >= ?",
                            (key, bars_from)).fetchall()
        day_ok, day_n = db.execute("select coalesce(sum(ok), 0), count(*) from checks where service = ? "
                                   "and counted = 1 and ts >= ? and ts < ?", (key, *in_day)).fetchone()
        services.append({"key": key, "name": name, "how": how, "day": {"ok": day_ok, "n": day_n},
                         "now": {"ok": bool(last[0]), "detail": last[1], "ts": last[2]} if last else None,
                         "uptime": uptime, "latency_ms": round(statistics.median(ms)) if ms else None,
                         "hourly": hourly(series, now_ts)})
    all_up = {}
    for window, start in since.items():
        rounds_in, all_ok = db.execute("""select count(*), coalesce(sum(all_ok), 0) from (select min(ok) as all_ok
                                          from checks where counted = 1 and ts >= ? group by ts)""",
                                       (start,)).fetchone()
        all_up[window] = ratio(all_ok, rounds_in)

    train_stats = []
    for kind, title, note in TRAIN_KINDS:
        last = db.execute("select n, le5, ts from trains where kind = ? order by ts desc limit 1", (kind,)).fetchone()
        if last and now_ts - last[2] > 2 * INTERVAL:
            last = None  # «ahora» con una muestra de hace horas sería mentira
        punctual, canceled = {}, {}
        for window, start in since.items():
            n, le5, cancel = db.execute("select coalesce(sum(n), 0), coalesce(sum(le5), 0), "
                                        "coalesce(sum(canceled), 0) from trains where kind = ? and ts >= ?",
                                        (kind, start)).fetchone()
            punctual[window], canceled[window] = ratio(le5, n), ratio(cancel, n)
        worst = db.execute("select worst_delay, worst_id, worst_route, ts from trains where kind = ? and ts >= ? "
                           "and worst_delay is not null order by worst_delay desc limit 1",
                           (kind, since["24h"])).fetchone()
        series = db.execute("select ts, le5, n from trains where kind = ? and ts >= ?", (kind, bars_from)).fetchall()
        n, le5, cancel, first_seen = db.execute(
            "select count(*), coalesce(sum(canceled = 0 and delay <= ?), 0), coalesce(sum(canceled), 0), "
            "min(first_ts) from train_days where day = ? and kind = ?", (trains.PUNCTUAL, day.isoformat(), kind)).fetchone()
        day_worst = db.execute("select worst, id, route, last_ts from train_days where day = ? and kind = ? "
                               "and worst > 0 order by worst desc limit 1", (day.isoformat(), kind)).fetchone()
        of_day = {"n": n, "le5": le5, "punctual": ratio(le5, n), "canceled": cancel if kind == "cer" else None,
                  "first_ts": first_seen,
                  "worst": {"delay": day_worst[0], "train": day_worst[1], "route": day_worst[2] or None,
                            "ts": day_worst[3]} if day_worst else None}
        train_stats.append({"kind": kind, "title": title, "note": note, "day": of_day,
                            "now": {"punctual": ratio(last[1], last[0]), "n": last[0], "ts": last[2]} if last else None,
                            "punctual": punctual, "canceled": canceled if kind == "cer" else None,
                            "worst_24h": {"delay": worst[0], "train": worst[1], "route": worst[2] or None,
                                          "ts": worst[3]} if worst else None,
                            "hourly": hourly(series, now_ts)})

    day_rounds, day_all_ok, round_first, round_last = db.execute(
        """select count(*), coalesce(sum(all_ok), 0), min(ts), max(ts) from (select ts, min(ok) as all_ok
           from checks where counted = 1 and ts >= ? and ts < ? group by ts)""", in_day).fetchone()
    of_day = {"date": day.isoformat(), "today": day == now.astimezone(MADRID).date(), "enough": enough,
              "min_trains": MIN_TRAINS, "from_ts": round_first, "to_ts": round_last,
              "rounds": day_rounds, "all_ok": day_all_ok}
    return {"generated_at": now.isoformat(timespec="seconds"), "day": of_day, "interval_s": INTERVAL, "timeout_s": checks.TIMEOUT, "check_deadline_s": checks.CHECK_DEADLINE,
            "retention_h": int(RETENTION.total_seconds() // 3600), "first_ts": first, "rounds": rounds,
            "all_up": all_up, "services": services, "trains": train_stats}


def write_data(db: sqlite3.Connection) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path, tmp = OUT / "data.json", OUT / "data.json.tmp"
    tmp.write_text(json.dumps(export(db), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)
    return path
