from renfe import live

from renfe_uptime.trains import (cercanias_places, cercanias_sample, long_distance_places, long_distance_sample,
                                 summarize)

MAP = {
    "fechaActualizacion": "2026-11-24T17:00:00",
    "trenes": [
        {"codComercial": "03063", "ultRetraso": "2", "codOrigen": "60000", "codDestino": "71801",
         "horaLlegadaSigEst": "2026-11-24T17:10:00", "time": 1795536000},
        {"codComercial": "18061", "ultRetraso": "40", "codOrigen": "17000", "codDestino": "11511",
         "horaLlegadaSigEst": "2026-11-24T17:20:00", "time": 1795536000},
        # Resto de hace horas: su llegada prevista quedó 3 h atrás. No cuenta.
        {"codComercial": "08109", "ultRetraso": "0", "codOrigen": "60000", "codDestino": "71801",
         "horaLlegadaSigEst": "2026-11-24T14:00:00", "time": 1795536000},
    ],
}


def test_long_distance_counts_running_trains_and_drops_leftovers():
    s = long_distance_sample(live.parse(MAP), {"60000": "Madrid", "71801": "Barcelona"})
    assert (s["n"], s["le5"], s["worst_delay"], s["worst_id"]) == (2, 1, 40, "18061")
    assert s["worst_route"] == "17000 → 11511"  # sin nombre, el código


def test_cercanias_rounds_up_and_counts_cancelled_as_late():
    doc = {"entity": [
        {"tripUpdate": {"trip": {"tripId": "a"}, "delay": 300}},  # 5 min justos: puntual
        {"tripUpdate": {"trip": {"tripId": "b"}, "delay": 301}},  # 6 min
        {"tripUpdate": {"trip": {"tripId": "c", "scheduleRelationship": "CANCELED"}}},
        {"tripUpdate": {"trip": {"tripId": "d"}, "stopTimeUpdate": [{"arrival": {"delay": 0}}]}},
    ]}
    s = cercanias_sample(doc)
    assert (s["n"], s["le5"], s["canceled"], s["worst_id"]) == (4, 2, 1, "b")


def test_cercanias_survives_odd_entries():
    assert cercanias_sample({"entity": [None, {"tripUpdate": "x"}, {}]}) is None


def test_impossible_early_trains_are_dropped_and_early_is_never_the_worst():
    s = summarize([(-200, "x", ""), (-3, "y", "")], canceled=0)
    assert s["n"] == 1 and s["worst_delay"] is None


def test_a_train_counts_in_the_provinces_of_its_previous_and_next_station():
    board = live.parse({**MAP, "trenes": [
        {**MAP["trenes"][0], "codEstAnt": "60000", "codEstSig": "70600"},  # entre Madrid y Guadalajara
        {**MAP["trenes"][1], "codEstAnt": "17000", "codEstSig": "17000"},  # parado en una estación
        {**MAP["trenes"][2], "codEstAnt": "60000", "codEstSig": "60000"},  # resto de hace horas
    ]})
    provinces = {"60000": "Madrid", "70600": "Guadalajara", "17000": "León"}
    assert long_distance_places(board, {}, provinces) == [
        (2, "03063", "60000 → 71801", "Guadalajara"), (2, "03063", "60000 → 71801", "Madrid"),
        (40, "18061", "17000 → 11511", "León")]


def test_cercanias_trip_goes_to_the_province_of_its_next_stop():
    doc = {"entity": [
        {"tripUpdate": {"trip": {"tripId": "a"}, "delay": 120, "stopTimeUpdate": [{"stopId": "18000"}]}},
        {"tripUpdate": {"trip": {"tripId": "b"}, "delay": 0, "stopTimeUpdate": [{"stopId": "99999"}]}},  # fuera de la lista
        {"tripUpdate": {"trip": {"tripId": "c", "scheduleRelationship": "CANCELED"},
                        "stopTimeUpdate": [{"stopId": "18000"}]}},
        {"tripUpdate": {"trip": {"tripId": "d"}, "delay": 0}},  # sin parada
    ]}
    assert cercanias_places(doc, {"18000": "Madrid"}) == [(2, "a", "", "Madrid")]
