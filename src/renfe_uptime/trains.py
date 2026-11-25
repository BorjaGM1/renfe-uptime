"""Puntualidad de los trenes en una ronda: larga distancia (mapa de Renfe CLI) y Cercanías (GTFS-RT)."""

from datetime import timedelta

STALE_ENTRY = timedelta(minutes=45)  # tren del mapa con la llegada prevista tan atrás: es un resto (renfe/live.py)
EARLIEST = 30  # minutos de adelanto a partir de los cuales el dato no es creíble
PUNCTUAL = 5  # minutos: hasta aquí, el tren cuenta como puntual


def long_distance_trains(board, names: dict) -> list[tuple[int, str, str]]:
    """Los trenes del mapa ahora (un renfe.live.Board): (retraso en minutos, número, trayecto). Se descartan
    los restos de horas atrás."""
    return [(train["delay"], number, route) for train, number, route in _on_map(board, names)]


def long_distance_places(board, names: dict, provinces: dict) -> list[tuple[int, str, str, str]]:
    """Por dónde va cada tren del mapa: (retraso, número, trayecto, provincia), una por provincia de su estación
    anterior y de la siguiente. Entre dos provincias, cuenta en las dos."""
    return [(train["delay"], number, route, province) for train, number, route in _on_map(board, names)
            for province in sorted({provinces.get(train.get("previous")), provinces.get(train.get("next"))} - {None})]


def _on_map(board, names: dict):
    for train in board.trains.values():
        if train.get("delay") is None:
            continue
        expected = train.get("expected")
        if board.updated and expected and board.updated - expected > STALE_ENTRY:
            continue
        origin, destination = train.get("origin"), train.get("destination")
        yield train, str(train.get("number", "?")), f"{names.get(origin, origin)} → {names.get(destination, destination)}"


def long_distance_sample(board, names: dict) -> dict | None:
    """Puntualidad de los trenes del mapa en esta ronda."""
    return summarize(long_distance_trains(board, names), canceled=0)


def cercanias_trains(doc) -> tuple[list[tuple[int, str, str]], list[str]]:
    """Los viajes del feed de Cercanías ahora: (retraso en minutos, viaje, "") y, aparte, los cancelados."""
    delays, canceled = [], []
    for tid, minutes, _stop in _trips(doc):
        if minutes is None:
            canceled.append(tid)
        else:
            delays.append((minutes, tid, ""))
    return delays, canceled


def cercanias_places(doc, provinces: dict) -> list[tuple[int, str, str, str]]:
    """Por dónde va cada viaje de Cercanías: (retraso, viaje, "", provincia de su próxima parada). Un viaje cuya
    parada no está en la lista de estaciones de Renfe CLI se queda sin provincia y no entra."""
    return [(minutes, tid, "", provinces[stop]) for tid, minutes, stop in _trips(doc)
            if minutes is not None and provinces.get(stop)]


def _trips(doc):
    """(viaje, retraso en minutos o None si está cancelado, próxima parada) de cada viaje del feed con retraso."""
    for entity in doc.get("entity") or []:
        update = entity.get("tripUpdate") if isinstance(entity, dict) else None
        if not isinstance(update, dict):
            continue
        trip = update.get("trip") or {}
        stops = update.get("stopTimeUpdate") or [{}]
        stop = stops[0].get("stopId") if isinstance(stops[0], dict) else None
        if trip.get("scheduleRelationship") == "CANCELED":
            yield str(trip.get("tripId", "?")), None, stop
            continue
        seconds = update.get("delay")
        if not isinstance(seconds, int):
            event = stops[0].get("arrival") or stops[0].get("departure") or {}
            seconds = event.get("delay")
        if isinstance(seconds, int) and not isinstance(seconds, bool):
            yield str(trip.get("tripId", "?")), -(-seconds // 60), stop  # 301 s ya son 6 min


def cercanias_sample(doc) -> dict | None:
    """Puntualidad de los trenes del feed de Cercanías en esta ronda. Un tren cancelado cuenta como no
    puntual."""
    delays, canceled = cercanias_trains(doc)
    return summarize(delays, len(canceled))


def summarize(delays: list[tuple[int, str, str]], canceled: int) -> dict | None:
    delays = [d for d in delays if d[0] >= -EARLIEST]  # horas de adelanto: es otro día del tren, no un dato
    if not delays and not canceled:
        return None
    worst = max(delays, default=(None, None, None))
    if worst[0] is not None and worst[0] <= 0:
        worst = (None, None, None)
    return {"n": len(delays) + canceled, "on_time": sum(d <= 0 for d, _, _ in delays),
            "le5": sum(d <= PUNCTUAL for d, _, _ in delays), "le15": sum(d <= 15 for d, _, _ in delays),
            "over60": sum(d > 60 for d, _, _ in delays), "canceled": canceled,
            "worst_delay": worst[0], "worst_id": worst[1], "worst_route": worst[2]}
