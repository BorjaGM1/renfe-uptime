"""Subida de data.json a R2 por su API S3, con curl. Sin las cuatro variables R2_* no sube nada."""

import hashlib
import os
import subprocess
from pathlib import Path

OBJECT_KEY = "data.json"
# El navegador revalida con ETag en cada carga y la caché del borde guarda 60 s. Nunca ?t=.
CACHE_CONTROL = "public, max-age=0, s-maxage=60, must-revalidate"
ENV = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET")


def publish(path: Path) -> str:
    env = {key: os.environ.get(key, "") for key in ENV}
    if not all(env.values()):
        return "sin credenciales de R2: no sube"
    url = f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com/{env['R2_BUCKET']}/{OBJECT_KEY}"
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    result = subprocess.run(
        ["curl", "-sS", "--fail-with-body", "--max-time", "30", "-K", "-", "--aws-sigv4", "aws:amz:auto:s3",
         "-H", f"x-amz-content-sha256: {digest}", "-H", "content-type: application/json; charset=utf-8",
         "-H", f"cache-control: {CACHE_CONTROL}", "-T", str(path), url],
        input=f'user = "{env["R2_ACCESS_KEY_ID"]}:{env["R2_SECRET_ACCESS_KEY"]}"\n',  # por stdin: no sale en ps
        capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise RuntimeError(f"subida a R2 fallida (curl {result.returncode}): {result.stdout.strip()[:300]} "
                           f"{result.stderr.strip()[:300]}")
    return "subido a R2"
