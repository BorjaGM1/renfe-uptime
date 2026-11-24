import subprocess

from renfe_uptime import publish


def test_without_credentials_nothing_is_sent(monkeypatch, tmp_path):
    for key in publish.ENV:
        monkeypatch.delenv(key, raising=False)
    assert "no sube" in publish.publish(tmp_path / "data.json")


def test_secret_goes_through_stdin_not_argv(monkeypatch, tmp_path):
    for key, value in zip(publish.ENV, ("acct", "KEYID", "SECRET", "bucket")):
        monkeypatch.setenv(key, value)
    data = tmp_path / "data.json"
    data.write_text("{}")
    seen = {}

    def run(args, **kwargs):
        seen.update(args=args, input=kwargs["input"])
        return subprocess.CompletedProcess(args, 0, "", "")

    monkeypatch.setattr(subprocess, "run", run)
    assert publish.publish(data) == "subido a R2"
    assert "SECRET" not in " ".join(seen["args"]) and "SECRET" in seen["input"]
    assert seen["args"][-1] == "https://acct.r2.cloudflarestorage.com/bucket/data.json"
    assert f"cache-control: {publish.CACHE_CONTROL}" in seen["args"]
