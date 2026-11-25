# ¿Cuántos nueves tiene Renfe?

https://renfe.borjagm1.com

Mide cada 5 minutos si los servicios web de Renfe funcionan y cuántos trenes van en hora, y lo enseña con los
«nueves» de cada cosa, como el uptime de un servicio de software. Cada medición sale como un billete de tren
numerado y fechado: cien casillas, y picada la de cada tren de cada cien que va con retraso.

**Medidor independiente. No está afiliado a Renfe ni la representa.** «Renfe» y «Cercanías» son marcas de sus
titulares; aquí solo se nombran para decir qué se mide. La página no usa sus logotipos, su tipografía ni sus
billetes reales, y lo que dibuja no es un título de transporte ni vale para viajar.

```
timer de systemd en un VPS, cada 5 min (usuario renfe-uptime, sin privilegios)
  → renfe-uptime once: medir, guardar en SQLite, borrar las comprobaciones de más de 30 días (los trenes se guardan siempre), exportar site/data.json
  → PUT por la API S3 a R2, bucket renfe-uptime → https://renfe-data.borjagm1.com/data.json

navegador
  → Pages: la página de web/, estática, sin Functions → https://renfe.borjagm1.com
  → fetch del data.json con cache: "no-cache" (revalida con ETag; nunca ?t=)
```

Las visitas no tocan el VPS ni gastan cuota de Workers: solo Pages y R2.

## El repo

| Ruta | Qué |
|---|---|
| `src/renfe_uptime/checks.py` | Las seis comprobaciones. La búsqueda y el mapa en tiempo real van con Renfe CLI |
| `src/renfe_uptime/trains.py` | Los trenes de cada ronda, uno a uno: larga distancia y Cercanías |
| `src/renfe_uptime/store.py` | SQLite: guardar, recortar las comprobaciones a 30 días y exportar `data.json` |
| `src/renfe_uptime/publish.py` | Subida a R2 con curl (el secreto va por stdin, nunca en argv) |
| `src/renfe_uptime/cli.py` | `renfe-uptime once \| run \| serve \| export` |
| `web/index.html` | La página: el billete, su cartela, el dorso con los datos y las otras dos piezas |
| `web/billete.js` | Compone y pinta los billetes (en SVG para la página y en canvas para guardarlos como imagen) |
| `web/common.js` | Carga `data.json` (en local, el de al lado; en producción, el de R2) y le da formato |
| `web/fonts/` | Las letras, autoalojadas, cada una con su licencia (SIL OFL) |
| `web/pruebas/` | Casos de prueba de la página (`?estado=` en local). No se publican |
| `web/og.png` | La imagen de la vista previa al compartir el enlace: el billete tumbado de una ronda. Es fija |
| `infra/build-page.py` | Monta lo que se publica: `web/` sin los casos de prueba y con la versión en las direcciones |
| `infra/` | systemd, scripts de despliegue, token de R2 y la ficha de Cloudflare |
| `tests/` | Sin red. `deploy-vps.sh` no despliega si alguno falla |

## Renfe CLI como dependencia

Renfe CLI ([luisgonzaleznf/renfe-cli](https://github.com/luisgonzaleznf/renfe-cli), MIT) está fijado a un commit
en `pyproject.toml` y `uv.lock`. De él salen:
- la búsqueda en la venta nueva, con su cliente: clave, token y cabeceras;
- el mapa en tiempo real;
- la lista de estaciones;
- las URLs de la venta antigua y del horario.

Si Renfe cambia algo y Luis lo arregla, se actualiza así:

```bash
uv lock --upgrade-package renfe-cli
uv run pytest
infra/deploy-vps.sh
```

Dos cosas que cambian respecto a usar el CLI tal cual:
- **El User-Agent es el nuestro**, `renfe-uptime/<versión> (+https://renfe.borjagm1.com)`, también en las
  peticiones de Renfe CLI. Si Renfe bloquea el medidor, que no les caiga a los usuarios del CLI.
- **La búsqueda y el mapa usan los reintentos de Renfe CLI** (hasta 3 intentos ante un 5xx o una conexión
  caída). Cuentan como caídos cuando fallan también tras ellos. Las otras cuatro comprobaciones no reintentan.

## Qué mide

| Servicio | Caído si |
|---|---|
| Web renfe.com | no carga la portada o te manda a la cola virtual |
| Buscador (venta nueva) | una búsqueda real Madrid-Atocha → Barcelona-Sants no devuelve trenes |
| Venta antigua | venta.renfe.com/vol no carga o te manda a la cola virtual |
| Mapa en tiempo real | lleva más de 10 min sin actualizarse, o está vacío entre las 7 y las 23 |
| Horario GTFS | no existe o lleva más de 48 h sin renovarse |
| Cercanías en tiempo real | el feed lleva más de 10 min sin actualizarse |

Además, cualquier servicio cuenta como caído si una petición no contesta en 15 s, si la comprobación entera no
acaba en 60 s (reintentos incluidos) o si da un error. Las seis comprobaciones van a la vez. Si antes de la ronda falla la
conexión del propio medidor, la ronda no cuenta.

**Trenes:** cada tren y trayecto cuenta una vez al día, con el retraso de la última vez que se le vio en el mapa:
va en hora con 5 minutos o menos. Es retraso en ruta, no a la llegada. Un tren que cruza la medianoche cuenta en el
día en que salió, y en Cercanías un tren cancelado cuenta como no puntual. `data.json` trae en `day` las cuentas del
día que se enseña: hoy o, de madrugada, hasta que han circulado 20 trenes de larga y media distancia, ayer. Es lo
que enseña la página. También sigue saliendo la proporción por ronda de las últimas 24 y 72 horas (cada tren, una
vez por ronda mientras circula).

Renfe actualiza el mapa de larga distancia cada ~15 s, Cercanías cada ~20 s y el horario una vez al día (medido
el 24 nov 2026).

## En local

```bash
uv sync
uv run pytest
uv run renfe-uptime serve     # mide cada 5 min y sirve la página en http://127.0.0.1:8790
```

En local la página admite además `?datos=prod` (los datos de producción) y `?estado=` con un caso de prueba de
`web/pruebas/`: `normal`, `web-caida`, `noche`, `parados`, `ayer`, `sin-cifra`, `clase-1` o `clase-2`. Con
`?paleta=historica`, `1969` o `contemporanea` se ven las otras tres paletas, también en producción.

Sin las variables `R2_*` no sube nada.

## Desplegar

Los scripts leen `infra/deploy.env` (git lo ignora; plantilla en `infra/deploy.env.example`): el alias SSH del VPS y
la cuenta de Cloudflare.

```bash
infra/deploy-vps.sh       # tests, copia al VPS, uv sync --frozen, instala/actualiza el timer y lanza una ronda
infra/deploy-pages.sh     # monta la página (build-page.py) y la publica en Pages
infra/set-r2-token.sh     # pone o rota el token de R2 en el VPS (pide la clave en la terminal)
ssh "$HOST" journalctl -u renfe-uptime -n 20 --no-pager -o cat
```

Los recursos de Cloudflare (bucket, dominios, CORS, DNS y Pages), y cómo se crearon, están en
[`infra/cloudflare/README.md`](infra/cloudflare/README.md).

## Licencia

MIT. Ver [LICENSE](LICENSE).
