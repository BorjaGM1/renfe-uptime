from datetime import datetime, timedelta, timezone

import pytest
from renfe import live
from renfe.errors import UpstreamError

from renfe_uptime import checks


def test_repeated_hour_when_clocks_go_back_is_fresh():
    now = datetime(2026, 10, 25, 1, 31, tzinfo=timezone.utc)  # 02:31 de Madrid, segunda pasada
    updated = live.parse({"fechaActualizacion": "2026-10-25T02:30:00", "trenes": []}).updated
    assert checks.lag(now, updated) == timedelta(minutes=1)


def test_live_map_down_is_reported_with_renfe_cli_message(monkeypatch):
    def boom(**kwargs):
        raise UpstreamError("live map: Renfe did not answer in time")
    monkeypatch.setattr(live, "fetch", boom)
    with pytest.raises(checks.Down, match="Renfe CLI: live map"):
        checks.check_live(datetime.now(timezone.utc))


def test_empty_map_is_fine_at_night_but_not_by_day(monkeypatch):
    monkeypatch.setattr(live, "fetch", lambda **kw: live.parse({"fechaActualizacion": None, "trenes": []}))
    night = datetime(2026, 11, 24, 2, 0, tzinfo=timezone.utc)
    assert "noche" in checks.check_live(night)[0]
    with pytest.raises(checks.Down):
        checks.check_live(datetime(2026, 11, 24, 12, 0, tzinfo=timezone.utc))


def test_stale_cercanias_feed_is_down(monkeypatch):
    now = datetime(2026, 11, 24, 16, 0, tzinfo=timezone.utc)
    old = int((now - timedelta(minutes=30)).timestamp())
    monkeypatch.setattr(checks, "fetch", lambda *a, **k: (200, "", {}, f'{{"header":{{"timestamp":"{old}"}}}}'.encode()))
    with pytest.raises(checks.Down, match="30 min"):
        checks.check_cercanias(now)


def test_queue_it_redirect_is_down(monkeypatch):
    monkeypatch.setattr(checks, "fetch", lambda *a, **k: (200, "https://renfe.queue-it.net/?c=renfe", {}, b"x" * 2000))
    with pytest.raises(checks.Down, match="cola virtual"):
        checks.check_legacy(None)


def test_a_check_that_breaks_never_breaks_the_round():
    ok, _, detail, _ = checks.run_check(lambda now: {}["missing"], None)
    assert not ok and "otra forma" in detail


def test_own_requests_and_renfe_cli_say_who_we_are():
    from renfe import config
    assert config.USER_AGENT.startswith("renfe-uptime/") and "renfe.borjagm1.com" in config.USER_AGENT


def test_a_slow_check_counts_as_down_and_the_others_still_land(monkeypatch):
    import time as _time
    monkeypatch.setattr(checks, "CHECK_DEADLINE", 0.2)
    results = checks.run_all({"slow": lambda now: _time.sleep(2), "fast": lambda now: ("bien", None)}, None)
    assert results["fast"][0] and results["fast"][2] == "bien"
    assert not results["slow"][0] and "no terminó" in results["slow"][2]
    assert list(results) == ["slow", "fast"]
