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

Otras partes del enunciado:

| Parte | Documento |
|-------|-----------|
| 2. Optimización de prompt | [PROMPTS.md](PROMPTS.md) |
| 3. Pruebas volumétricas (diseño, sin implementar) | [VOLUMETRICAS.md](VOLUMETRICAS.md) |

## Local

Requisitos: Docker Desktop, .NET 8 SDK, Node 22.

```bash
cp .env.example .env
docker compose up --build
```

| Qué | URL |
|-----|-----|
| Dashboard | http://localhost:5173 |
| API + Swagger | http://localhost:8080/swagger |
| Health | http://localhost:8080/health |

| Usuario | Contraseña |
|---------|------------|
| `analyst@invoicehub.local` | `InvoiceHub!2026` |

Sin Docker: SQL Server en `1433`, `dotnet run --project src/Invoice.Api` y `cd frontend && npm install && npm run dev`.

## Demo (Railway)

| Qué | URL |
|-----|-----|
| Dashboard | https://web-production-340e5d.up.railway.app |
| Swagger | https://api-production-563e.up.railway.app/swagger |

Variables y orden de deploy: [railway/README.md](railway/README.md).
