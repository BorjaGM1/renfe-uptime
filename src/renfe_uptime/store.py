"""SQLite: guardar cada ronda, borrar lo de más de 3 días y exportar lo que pinta la página."""

import json
import sqlite3
import statistics
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import DATA, MADRID, OUT, checks, trains

INTERVAL = 300  # segundos entre rondas (el timer de systemd va cada 5 min)
RETENTION = timedelta(days=3)
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
            for kind, check, sample in (("ld", "live", lambda b: trains.long_distance_sample(b, checks.station_names())),
                                        ("cer", "cercanias", trains.cercanias_sample)):
                data = results.get(check, (None, None, None, None))[3]
                try:
                    s = data and sample(data)
                except Exception as err:  # un tren con campos raros no se lleva por delante la ronda
                    print(f"muestra {kind} descartada: {type(err).__name__}", file=sys.stderr, flush=True)
                    continue
                if s:
                    db.execute("insert into trains values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                               (ts, kind, s["n"], s["on_time"], s["le5"], s["le15"], s["over60"], s["canceled"],
                                s["worst_delay"], s["worst_id"], s["worst_route"]))
    marks = " ".join(f"{key}:{'ok' if ok else 'KO'}" for key, (ok, *_rest) in results.items())
    return f"{now.astimezone(MADRID):%Y-%m-%d %H:%M:%S} {marks}" + ("" if counted else " (sin red: no cuenta)")


def prune(db: sqlite3.Connection, now: datetime) -> None:
    """Solo se guardan los últimos RETENTION: es lo que la página enseña."""
    cutoff = int((now - RETENTION).timestamp())
    with db:
        db.execute("delete from checks where ts < ?", (cutoff,))
        db.execute("delete from trains where ts < ?", (cutoff,))


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
        services.append({"key": key, "name": name, "how": how,
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
        train_stats.append({"kind": kind, "title": title, "note": note,
                            "now": {"punctual": ratio(last[1], last[0]), "n": last[0], "ts": last[2]} if last else None,
                            "punctual": punctual, "canceled": canceled if kind == "cer" else None,
                            "worst_24h": {"delay": worst[0], "train": worst[1], "route": worst[2] or None,
                                          "ts": worst[3]} if worst else None,
                            "hourly": hourly(series, now_ts)})

    return {"generated_at": now.isoformat(timespec="seconds"), "interval_s": INTERVAL, "timeout_s": checks.TIMEOUT, "check_deadline_s": checks.CHECK_DEADLINE,
            "retention_h": int(RETENTION.total_seconds() // 3600), "first_ts": first, "rounds": rounds,
            "all_up": all_up, "services": services, "trains": train_stats}


def write_data(db: sqlite3.Connection) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path, tmp = OUT / "data.json", OUT / "data.json.tmp"
    tmp.write_text(json.dumps(export(db), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)
    return path
