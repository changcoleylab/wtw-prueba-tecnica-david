# Deploy en Railway

Un repo → dos servicios por ahora (SQL + API). El front se añade después.

```
sqlserver  Dockerfile.sqlserver   red privada :1433   volume /var/opt/mssql
api        Dockerfile.api         público :8080       /swagger
```

SQL: **≥ 2 GB RAM** (ideal 4 GB), **2 vCPU**. Sin healthcheck HTTP. Restart: Always. Sin dominio público. Sin Serverless.

Config-as-code: `railway/sql.toml`, `railway/api.toml`.

## Variables (solo Railway)

`.env.example` es para localhost. Aquí van en **Variables** de cada servicio.

### Servicio SQL

Nombre sugerido: `sqlserver` (el DNS queda `sqlserver.railway.internal`).

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

Si el servicio SQL se llama `test`, usa `${{test.RAILWAY_PRIVATE_DOMAIN}}`.

`Cors__Origins__0` se pone cuando exista el front (URL `https://…` sin `/` final). Swagger no lo necesita.

## Orden

1. Crear el proyecto y conectar este repo (`main`).
2. Servicio **sqlserver**: Root `/`, config `railway/sql.toml`, volume, vars. Esperar `SQL Server is now ready`.
3. Servicio **api**: Root `/`, config `railway/api.toml`, vars, **Generate Domain**.
4. Probar `https://<api>/health/live`, `/health/ready` y `/swagger`.

Schema: lo aplica la API al arrancar si `InvoiceHub` está vacío. Un push no borra el volume.

Healthcheck del deploy de la API: `/health/live`.
