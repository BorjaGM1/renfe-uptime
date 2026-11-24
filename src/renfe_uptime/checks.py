"""Las comprobaciones de cada servicio. Cada una devuelve (detalle, datos) o lanza Down con el motivo.

La búsqueda, el mapa en tiempo real, las estaciones y las URLs que Renfe CLI ya conoce salen de Renfe CLI (fijado
a un commit en pyproject.toml), con sus reintentos: un servicio cuenta como caído cuando falla también tras ellos.
Lo que Renfe CLI no usa (la portada, la venta antigua, el horario y Cercanías) se pide aquí directamente."""

import json
import os
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import certifi

from . import DATA, MADRID, USER_AGENT

os.environ.setdefault("RENFE_CACHE_DIR", str(DATA / "renfe-cli"))  # antes de importar renfe: sesión y ritmo aquí

from renfe import config as renfe_config  # noqa: E402
from renfe import delays, live, stations  # noqa: E402
from renfe import search as renfe_search  # noqa: E402
from renfe.client import RsvClient  # noqa: E402
from renfe.errors import RenfeError  # noqa: E402

renfe_config.USER_AGENT = USER_AGENT  # Renfe CLI lo lee en cada petición

TIMEOUT = 15  # segundos por petición propia: si Renfe tarda más, cuenta como caído
CHECK_DEADLINE = 60  # segundos por comprobación, reintentos de Renfe CLI incluidos
MAX_BODY = 8 * 1024 * 1024
# Los certificados de certifi, como httpx en Renfe CLI: el almacén de macOS no tiene el emisor de renfe.com.
TLS = ssl.create_default_context(cafile=certifi.where())
WEB = "https://www.renfe.com/es/es"
LEGACY = getattr(renfe_config, "LEGACY_SHOP_URL", "https://venta.renfe.com/vol/")
GTFS = delays.TIMETABLE_URL
CERCANIAS = "https://gtfsrt.renfe.com/trip_updates.json"
CONTROL = "https://www.gstatic.com/generate_204"  # si esto falla, la que falla es nuestra red

MADRID_ATOCHA, BARCELONA_SANTS = "60000", "71801"
SEARCH_AHEAD = timedelta(days=14)
FRESH = timedelta(minutes=10)  # un feed de tiempo real más viejo que esto está parado
GTFS_FRESH = timedelta(hours=48)  # Renfe renueva el horario cada madrugada
SERVICE_HOURS = range(7, 23)  # horas de Madrid en que el mapa de larga distancia debe tener trenes

SERVICES = [  # (clave, nombre en la página, qué se comprueba)
    ("web", "Web renfe.com", "La portada carga y no te manda a la cola virtual."),
    ("search", "Buscador (venta nueva)", "Búsqueda real Madrid-Atocha → Barcelona-Sants con Renfe CLI: tiene que "
                                         "devolver trenes."),
    ("legacy", "Venta antigua", "venta.renfe.com/vol carga su portada y no te manda a la cola virtual."),
    ("live", "Mapa en tiempo real (larga distancia)", f"Leído con Renfe CLI: se ha actualizado en los últimos "
                                                      f"{FRESH.seconds // 60} min. De noche, vacío, basta con que "
                                                      f"responda."),
    ("gtfs", "Horario GTFS", f"El fichero de horarios existe y, si Renfe dice su fecha, se ha renovado en las "
                             f"últimas {GTFS_FRESH.days * 24} h."),
    ("cercanias", "Cercanías en tiempo real", f"El feed GTFS-RT se ha actualizado en los últimos "
                                              f"{FRESH.seconds // 60} min."),
]


class Down(Exception):
    """El servicio no hace lo que tiene que hacer. El mensaje es el motivo, para la página."""


def fetch(url: str, *, headers: dict | None = None, method: str | None = None):
    req = urllib.request.Request(url, method=method,
                                 headers={"user-agent": USER_AGENT, "accept-language": "es-ES", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=TLS) as resp:
            return resp.status, resp.geturl(), resp.headers, resp.read(MAX_BODY)
    except urllib.error.HTTPError as err:
        raise Down(f"HTTP {err.code}") from None
    except (TimeoutError, urllib.error.URLError, OSError) as err:
        reason = getattr(err, "reason", err)
        if isinstance(reason, TimeoutError):
            raise Down(f"no respondió en {TIMEOUT} s") from None
        raise Down(f"sin conexión ({type(reason).__name__})") from None


def as_json(body: bytes):
    try:
        return json.loads(body)
    except ValueError:
        raise Down("no devuelve JSON (¿bloqueo o página de error?)") from None


def not_queued(url: str) -> None:
    if "queue-it" in (urllib.parse.urlsplit(url).hostname or ""):
        raise Down("te manda a la cola virtual")


def minutes(delta: timedelta) -> int:
    return int(delta.total_seconds() // 60)


def lag(now: datetime, updated: datetime) -> timedelta:
    """Lo viejo que es una hora de Madrid sin zona. La hora repetida al atrasar el reloj vale la más reciente."""
    return min(now - updated, now - updated.replace(fold=1))


def station_names() -> dict[str, str]:
    return {s.code: s.name for s in stations.bundled()}


def check_web(now):
    _, url, _, body = fetch(WEB)
    not_queued(url)
    if b"renfe" not in body.lower():
        raise Down("la portada no parece de Renfe")
    return "carga", None


def check_search(now):
    by_code = {s.code: s for s in stations.bundled()}
    # Antes de esta fecha Renfe CLI busca en la venta antigua: así se prueba siempre la nueva.
    first_sale = getattr(renfe_config, "NSV_FIRST_SALE_DATE", date.min)
    day = max((now.astimezone(MADRID) + SEARCH_AHEAD).date(), first_sale)
    try:
        with RsvClient() as client:
            result = renfe_search.search(client, by_code[MADRID_ATOCHA], by_code[BARCELONA_SANTS], day,
                                         names=station_names(), fares=False)
    except RenfeError as err:
        raise Down(f"Renfe CLI: {err.message}") from None
    found = len(result["trains"])
    if not found:
        raise Down(f"la búsqueda Madrid → Barcelona del {day:%d/%m} no devuelve trenes")
    return f"{found} trenes Madrid → Barcelona el {day:%d/%m}", None


def check_legacy(now):
    _, url, _, body = fetch(LEGACY)
    not_queued(url)
    if urllib.parse.urlsplit(url).hostname != "venta.renfe.com" or len(body) < 1024:
        raise Down("no carga su portada")
    return "carga", None


def check_live(now):
    try:
        board = live.fetch()
    except RenfeError as err:
        raise Down(f"Renfe CLI: {err.message}") from None
    if not board.trains:  # de noche el mapa está vacío y no hay nada que medir
        if now.astimezone(MADRID).hour in SERVICE_HOURS:
            raise Down("el mapa no tiene ningún tren en horario de servicio")
        return "sin trenes (de noche es normal)", board
    if board.updated is None:
        raise Down("el mapa no dice cuándo se actualizó")
    if lag(now, board.updated) > FRESH:
        raise Down(f"el mapa lleva {minutes(lag(now, board.updated))} min sin actualizarse")
    return f"{len(board.trains)} trenes en el mapa", board


def check_gtfs(now):
    _, _, headers, _ = fetch(GTFS, method="HEAD")
    try:
        modified = parsedate_to_datetime(headers.get("last-modified"))
    except (TypeError, ValueError):
        return "existe (sin fecha)", None
    if now - modified > GTFS_FRESH:
        raise Down(f"sin renovar desde hace {minutes(now - modified) // 60} h")
    return f"renovado a las {modified.astimezone(MADRID):%H:%M}", None


def check_cercanias(now):
    doc = as_json(fetch(CERCANIAS, headers={"accept": "application/json"})[3])
    updated = datetime.fromtimestamp(int(doc["header"]["timestamp"]), timezone.utc)
    entities = doc.get("entity") or []
    if now - updated > FRESH:
        raise Down(f"el feed lleva {minutes(now - updated)} min sin actualizarse")
    return f"{len(entities)} trenes en el feed", doc


CHECKS = {"web": check_web, "search": check_search, "legacy": check_legacy, "live": check_live, "gtfs": check_gtfs,
          "cercanias": check_cercanias}


def network_ok() -> bool:
    try:
        fetch(CONTROL)
        return True
    except Exception:
        return False


def run_check(fn, now):
    started = time.monotonic()
    try:
        detail, data = fn(now)
        ok = True
    except Down as err:
        ok, detail, data = False, str(err), None
    except (KeyError, IndexError, TypeError, ValueError, AttributeError):
        ok, detail, data = False, "responde con otra forma (¿ha cambiado la API?)", None
    except Exception as err:  # una comprobación nunca tumba la ronda
        ok, detail, data = False, f"error inesperado ({type(err).__name__})", None
    return ok, round((time.monotonic() - started) * 1000), detail, data


def run_all(fns: dict, now) -> dict:
    """Todas las comprobaciones a la vez, cada una con CHECK_DEADLINE. La que no acaba a tiempo cuenta como caída:
    así una ronda nunca se pierde entera por un Renfe lento, y el timer no la mata a medias."""
    results: dict = {}
    threads = {key: threading.Thread(target=lambda k=key, f=fn: results.__setitem__(k, run_check(f, now)), daemon=True)
               for key, fn in fns.items()}
    for thread in threads.values():
        thread.start()
    end = time.monotonic() + CHECK_DEADLINE
    for thread in threads.values():
        thread.join(max(0.0, end - time.monotonic()))
    late = (False, CHECK_DEADLINE * 1000, f"no terminó en {CHECK_DEADLINE} s", None)
    return {key: results.get(key, late) for key in fns}
