# Cloudflare

La cuenta va en `CLOUDFLARE_ACCOUNT_ID` de `infra/deploy.env`. Antes de crear o desplegar nada, comprueba con
`wrangler whoami` que esa cuenta sale en la lista.

| Recurso | Qué |
|---|---|
| Bucket R2 `renfe-uptime` | weur. Solo guarda `data.json`. Sin URL `r2.dev`: se lee solo por su dominio |
| `renfe-data.borjagm1.com` | Dominio propio del bucket, público. Sin el límite de peticiones de `r2.dev` |
| CORS del bucket | `*` GET/HEAD ([`r2-cors.json`](r2-cors.json)) |
| Pages `renfe-uptime` | Clásico, sin Functions, rama `main` |
| `renfe.borjagm1.com` | CNAME con proxy a `renfe-uptime.pages.dev`, registrado como dominio del proyecto de Pages |
| Token de R2 | Account API token, «Object Read & Write» solo sobre `renfe-uptime`, sin caducidad. Solo está en `/etc/renfe-uptime.env` del VPS |

## Cómo recrearlo

```bash
. infra/deploy.env && export CLOUDFLARE_ACCOUNT_ID
wrangler r2 bucket create renfe-uptime --location weur
wrangler r2 bucket domain add renfe-uptime --domain renfe-data.borjagm1.com --zone-id <id de la zona> --min-tls 1.2
wrangler r2 bucket cors set renfe-uptime --file infra/cloudflare/r2-cors.json
wrangler pages project create renfe-uptime --production-branch main --force
```

- **El `--force` de Pages:** wrangler 4.167 crea los proyectos nuevos como Worker. Con `--force` queda como
  Pages clásico. Solo hace falta al crearlo: los despliegues van sin `--force`.
- **El dominio de Pages:** wrangler no tiene comando para esto. Son dos pasos:
  1. Registrar `renfe.borjagm1.com` con la API, `POST /accounts/:id/pages/projects/renfe-uptime/domains`.
  2. Crear el CNAME en el DNS de la zona.
- **El token de R2:** se crea en el panel, en R2 → Manage API tokens → Create Account API token. Para rotarlo,
  crea uno nuevo igual, ejecuta `infra/set-r2-token.sh` y borra el viejo en el panel.

La caché del borde no está activada: cada visita llega al bucket, que devuelve siempre el objeto más nuevo. Si
hace falta, se añade una Cache Rule que respete el `s-maxage=60` del objeto.
