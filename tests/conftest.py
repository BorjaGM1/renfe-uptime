import os
import socket

import pytest

os.environ.setdefault("RENFE_UPTIME_HOME", os.path.join(os.path.dirname(__file__), ".home"))


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """Ningún test sale a la red: las comprobaciones se prueban con respuestas falsas."""
    def refuse(*args, **kwargs):
        raise OSError("red desactivada en los tests")
    monkeypatch.setattr(socket, "create_connection", refuse)
    monkeypatch.setattr(socket.socket, "connect", refuse)
