"""renfe-uptime once | run | serve | export

    once     una ronda: medir, recortar las comprobaciones a 30 días, exportar y subir (lo que lanza el timer de systemd)
    run      una ronda cada 5 min
    serve    lo mismo y además sirve la página y el data.json en http://127.0.0.1:8790 (para desarrollo)
    export   solo regenera site/data.json con lo que ya hay
"""

import argparse
import sys
import threading
import time
import urllib.parse
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from . import OUT, PAGE_DIR
from .publish import publish
from .store import INTERVAL, collect, connect, prune, write_data


def round_once(db) -> str:
    line = collect(db)
    prune(db, datetime.now(timezone.utc))
    return f"{line} · {publish(write_data(db))}"


def loop(interval: int) -> None:
    db = connect()
    while True:
        try:
            print(round_once(db), flush=True)
        except Exception as err:  # el bucle sigue aunque una ronda falle entera
            print(f"ronda fallida: {type(err).__name__}: {err}", file=sys.stderr, flush=True)
        time.sleep(interval - time.time() % interval)  # rondas alineadas al reloj: :00, :05, :10...


class LocalHandler(SimpleHTTPRequestHandler):
    """En local: la página de web/ y el data.json recién generado, como estarán en Pages y en R2."""

    def translate_path(self, path):
        clean = urllib.parse.unquote(urllib.parse.urlsplit(path).path)
        if clean == "/data.json":
            return str(OUT / "data.json")
        target = (PAGE_DIR / ("index.html" if clean in ("/", "/index.html") else clean.lstrip("/"))).resolve()
        return str(target) if target.is_relative_to(PAGE_DIR) else str(PAGE_DIR / "404")

    def end_headers(self):
        self.send_header("cache-control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(prog="renfe-uptime", description="¿Cuántos nueves tiene Renfe?")
    parser.add_argument("command", choices=["once", "run", "serve", "export"])
    parser.add_argument("--interval", type=int, default=INTERVAL, help="segundos entre rondas (por defecto 300)")
    parser.add_argument("--port", type=int, default=8790)
    args = parser.parse_args(argv)
    if args.command == "export":
        print(write_data(connect()))
    elif args.command == "once":
        print(round_once(connect()), flush=True)
    elif args.command == "run":
        loop(args.interval)
    else:
        threading.Thread(target=loop, args=(args.interval,), daemon=True).start()
        server = ThreadingHTTPServer(("127.0.0.1", args.port), LocalHandler)
        print(f"http://127.0.0.1:{args.port}", flush=True)
        server.serve_forever()
