# Deploy en Railway

Un repo → SQL Server + API + dashboard.

```
sqlserver  Dockerfile.sqlserver   red privada :1433   volume /var/opt/mssql
api        Dockerfile.api         público :8080       /swagger
web        Dockerfile.web         público             dashboard
```

SQL: **≥ 2 GB RAM** (ideal 4 GB), **2 vCPU**. Sin healthcheck HTTP. Restart: Always. Sin dominio público. Sin Serverless.

Config-as-code: `railway/sql.toml`, `railway/api.toml`, `railway/web.toml`.

## Variables (solo Railway)

`.env.example` es para localhost. Aquí van en **Variables** de cada servicio.

### Servicio `sqlserver`

El DNS queda `sqlserver.railway.internal`.

| Variable | Valor |
|----------|--------|
| `ACCEPT_EULA` | `Y` |
| `MSSQL_SA_PASSWORD` | Password fuerte (puede ser la de demo) |
| `MSSQL_PID` | `Developer` |
| `MSSQL_MEMORY_LIMIT_MB` | `2048` |
| `MSSQL_VISIBLE_CPUS` | `0-1` |

Volume: `/var/opt/mssql`.

### Servicio `api`

| Variable | Valor |
|----------|--------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `PORT` | `8080` |
| `ConnectionStrings__InvoiceDb` | Plantilla abajo |
| `Jwt__Key` | ≥ 32 caracteres (secret) |
| `Jwt__Issuer` | `InvoiceHub` |
| `Jwt__Audience` | `InvoiceHub` |

```
Server=${{sqlserver.RAILWAY_PRIVATE_DOMAIN}},1433;Database=InvoiceHub;User Id=sa;Password=${{sqlserver.MSSQL_SA_PASSWORD}};TrustServerCertificate=True;Encrypt=False
```

`Cors__Origins__0` = URL pública del **web** (`https://…`, sin `/` final). Tras crear el dominio del web, ponla y redeploy de la API.

### Servicio `web`

| Variable | Cuándo | Valor |
|----------|--------|--------|
| `API_UPSTREAM` | Runtime | URL pública del **api**, `https://….up.railway.app`, sin `/` |
| `VITE_PUBLIC_API_URL` | **Build** | La misma URL pública del **api** (botón Swagger) |

No pongas `VITE_API_URL` en Railway: el front llama a `/api` en el mismo origen; nginx reenvía a `API_UPSTREAM`.

No uses `http://api.railway.internal:8080` como `API_UPSTREAM`: el TCP privado web→API hace timeout.

Tras crear el dominio de la API, copia esa URL en las dos variables del web y **redeploy web**.

## Orden

1. Crear el proyecto y conectar este repo (`main`).
2. Servicio **sqlserver**: Root `/`, config `railway/sql.toml`, volume, vars. Esperar `SQL Server is now ready`.
3. Servicio **api**: Root `/`, config `railway/api.toml`, vars, **Generate Domain**.
4. Servicio **web**: Root `/`, config `railway/web.toml`, vars, **Generate Domain**. `Cors__Origins__0` en la API = origen del web. Redeploy API.
5. Probar `https://<api>/swagger` y el dashboard.

Schema: lo aplica la API al arrancar si `InvoiceHub` está vacío. Un push no borra el volume.

Healthcheck del deploy de la API: `/health/live`.
