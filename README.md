# InvoiceHub

API REST de facturas: **ASP.NET Core 8 + SQL Server + stored procedures (sin Entity Framework)**.

## Enunciado

| Requisito | Dónde está |
|-----------|------------|
| `POST /invoice` | `POST /api/v1/invoices` |
| `GET /invoice/{id}` | `GET /api/v1/invoices/{id}` |
| `GET /invoice/search?client=` | `GET /api/v1/invoices/search?client=` |
| SQL Server | `database/` + Docker Compose / Railway |
| Stored procedures **sin EF** | ADO.NET (`SqlCommand`) → `usp_*` |
| Validación / 404 | FluentValidation + ProblemDetails |
| Acceso | JWT Bearer |
| Swagger | `/swagger` |

Otras partes del enunciado: [PROMPTS.md](PROMPTS.md) (optimización de prompt).

## Local

Requisitos: Docker Desktop, .NET 8 SDK.

```bash
cp .env.example .env
docker compose up --build
```

| Qué | URL |
|-----|-----|
| API + Swagger | http://localhost:8080/swagger |
| Health | http://localhost:8080/health |

| Usuario | Contraseña |
|---------|------------|
| `analyst@invoicehub.local` | `InvoiceHub!2026` |

Sin Docker: SQL Server en `1433` y `dotnet run --project src/Invoice.Api`.

## Railway

SQL + API. Variables y orden: [railway/README.md](railway/README.md).

Swagger público: dominio del servicio `api` + `/swagger`.
