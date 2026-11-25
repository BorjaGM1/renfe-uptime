"""Monta la página para publicarla: web/ sin los casos de prueba y con la versión en las direcciones.

El dominio sirve el JavaScript y las hojas con cuatro horas de caché de navegador: sin una dirección nueva en cada
cambio, quien ya entró vería el HTML nuevo con el JavaScript viejo. La versión es la huella de lo publicado, así
que si nada cambia, las direcciones tampoco.

    python3 infra/build-page.py web <carpeta de salida>
"""

import hashlib
import shutil
import sys
from pathlib import Path

VERSIONED = ["billete.js", "billete.css", "common.js", "fonts/renfe-actual.css"]


def digest(*paths: Path) -> str:
    h = hashlib.sha256()
    for path in paths:
        h.update(path.read_bytes())
    return h.hexdigest()[:8]


def stamp(path: Path, pairs: list[tuple[str, str, int]]) -> None:
    text = path.read_text(encoding="utf-8")
    for old, new, times in pairs:
        if text.count(old) != times:
            raise SystemExit(f"{path.name}: se esperaba {times} vez/veces «{old}» y hay {text.count(old)}")
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def build(src: Path, out: Path) -> str:
    shutil.copytree(src, out, dirs_exist_ok=True, ignore=shutil.ignore_patterns("pruebas"))
    v = digest(src / "index.html", *(src / name for name in VERSIONED))
    og = digest(src / "og.png")
    stamp(out / "index.html", [
        ('import * as c from "./common.js";', f'import * as c from "./common.js?v={v}";', 1),
        ('import * as b from "./billete.js";', f'import * as b from "./billete.js?v={v}";', 1),
        ('<link rel="stylesheet" href="billete.css">', f'<link rel="stylesheet" href="billete.css?v={v}">', 1),
        ('<link rel="stylesheet" href="fonts/renfe-actual.css">', f'<link rel="stylesheet" href="fonts/renfe-actual.css?v={v}">', 1),
        ('https://renfe.borjagm1.com/og.png"', f'https://renfe.borjagm1.com/og.png?v={og}"', 2),
    ])
    # Los dos módulos tienen que pedir common.js por la misma dirección: si no, se cargaría dos veces.
    stamp(out / "billete.js", [
        ('import * as c from "./common.js";', f'import * as c from "./common.js?v={v}";', 1),
        ('hoja: "fonts/renfe-actual.css",', f'hoja: "fonts/renfe-actual.css?v={v}",', 1),
    ])
    return v


if __name__ == "__main__":
    print("versión", build(Path(sys.argv[1]), Path(sys.argv[2])))
