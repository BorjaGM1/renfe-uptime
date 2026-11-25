"""La página que se publica (infra/build-page.py) y sus casos de prueba."""

import importlib.util
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from renfe_uptime import store

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def builder():
    spec = importlib.util.spec_from_file_location("build_page", ROOT / "infra" / "build-page.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_published_page_is_versioned_and_leaves_test_cases_out(tmp_path):
    out = tmp_path / "pagina"
    v = builder().build(WEB, out)
    assert not (out / "pruebas").exists()
    index, billete = (out / "index.html").read_text(), (out / "billete.js").read_text()
    for name in ("common.js", "billete.js", "billete.css", "fonts/renfe-actual.css"):
        assert f"{name}?v={v}" in index
    # Los dos módulos piden common.js por la misma dirección: si no, se cargaría dos veces.
    assert f'"./common.js?v={v}"' in billete and '"./common.js"' not in billete
    assert index.count("og.png?v=") == 2
    # Todo lo que la página pide de su propia carpeta está en lo publicado.
    for ref in re.findall(r'(?:href|src)="(?!https?:|data:)([^"#?]+)', index.split("</head>")[0]):
        assert (out / ref).is_file(), ref


def test_page_test_cases_follow_the_shape_of_data_json():
    db = sqlite3.connect(":memory:")
    db.executescript(store.SCHEMA)
    real = store.export(db, datetime(2026, 11, 24, 16, 0, tzinfo=timezone.utc))
    cases = sorted((WEB / "pruebas").glob("data-*.json"))
    assert cases
    for path in cases:
        case = json.loads(path.read_text())
        assert set(real) <= set(case), path.name
        assert set(real["day"]) <= set(case["day"]), path.name
        assert set(real["services"][0]) <= set(case["services"][0]), path.name
        for kind in real["trains"]:
            train = next(t for t in case["trains"] if t["kind"] == kind["kind"])
            assert set(kind) <= set(train) and set(kind["day"]) <= set(train["day"]), path.name
