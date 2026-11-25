"""¿Cuántos nueves tiene Renfe? Mide cada 5 minutos si los servicios web de Renfe funcionan y cuántos trenes van en
hora, guarda en SQLite el histórico de trenes y 30 días de comprobaciones y exporta un data.json que pinta la página de web/."""

import os
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from zoneinfo import ZoneInfo

try:
    __version__ = version("renfe-uptime")
except PackageNotFoundError:
    __version__ = "dev"

# Nos identificamos como lo que somos. No nos hacemos pasar por un navegador ni por Renfe CLI: si Renfe bloquea
# este medidor, que no le caiga a los usuarios del CLI.
USER_AGENT = f"renfe-uptime/{__version__} (+https://renfe.borjagm1.com)"
MADRID = ZoneInfo("Europe/Madrid")

# Todo cuelga del directorio de trabajo (en el VPS, /opt/renfe-uptime), o de RENFE_UPTIME_HOME.
HOME = Path(os.environ.get("RENFE_UPTIME_HOME") or Path.cwd()).resolve()
DATA = HOME / "data"  # uptime.db y la caché de Renfe CLI
OUT = HOME / "site"  # data.json generado
PAGE_DIR = HOME / "web"  # la página, tal cual se sube a Pages (solo para `serve` en local)
