# Instrucciones para agentes

Qué es y cómo está montado: [README](README.md). Recursos de Cloudflare: [infra/cloudflare](infra/cloudflare/README.md).

## Git

- Todo va directo a `main`. Sin pull requests.
- Sin ramas de trabajo que se queden abiertas. Si usas una, fusiónala en `main` y bórrala en la misma sesión.
- Sin atribución de IA en los commits (nada de `Co-Authored-By` de Claude).

## Reglas que no se ven en el código

- **Nada de infraestructura privada en el repo**: ni nombres ni IPs de máquinas, ni IDs de cuenta o de zona, ni
  otros proyectos o repos del dueño. Lo que los scripts necesitan va en `infra/deploy.env`, que git ignora
  (plantilla en `infra/deploy.env.example`).
- **Renfe CLI se actualiza solo con `uv lock --upgrade-package renfe-cli`**, con los tests en verde, y se
  despliega con `infra/deploy-vps.sh`. No copies su código aquí: si falta algo, se usa desde el paquete.
- **El User-Agent es `renfe-uptime/...`, también en las peticiones de Renfe CLI** (`checks.py` lo sobrescribe).
  No te hagas pasar por un navegador ni por el CLI.
- **Nunca cache-busting con `?t=`**: la página revalida con ETag (`cache: "no-cache"`).
- **El token de R2 solo vive en `/etc/renfe-uptime.env` del VPS** (modo 600). Nunca en el repo, en argv ni en
  el chat.
- **En el VPS este proyecto solo usa `/opt/renfe-uptime`, `/etc/renfe-uptime.env` y sus dos unidades de
  systemd.** No toques nada más de esa máquina.
- **Lo que enseña la página tiene que ser verdad.** Si cambias cómo se mide, cambia también el texto de la
  página y el README.
