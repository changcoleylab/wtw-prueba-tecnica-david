# Pruebas volumétricas — Parte 3

Objetivo del enunciado: diseñar una estrategia de pruebas volumétricas para esta API, **sin implementar ni ejecutar**.

Esto es diseño. No hay script k6 en el repo. No se corrió contra Railway. Los números de este documento son **umbrales propuestos**: no hay SLA publicado.

Hecho = está en el código. Supuesto = se declara antes de usarlo.

---

## 1. Qué es una prueba volumétrica (y qué no)

Una prueba volumétrica responde: **¿el sistema sigue cumpliendo su contrato cuando crece la cantidad de datos que guarda, procesa o devuelve?**

La variable que se mueve es el **dato**: filas en `Invoice`, ancho de `LinesJson`, tamaño del JSON de `search`. El tráfico se deja en un nivel operacional y se **congela**. Si algo se degrada, la causa buscada es el histórico, no el número de usuarios.

| | Volumétrica (esta parte) | Carga | Estrés |
|---|--------------------------|-------|--------|
| Pregunta | ¿Aguanta el *dato*? | ¿Aguanta el *tráfico esperado*? | ¿Dónde se rompe? |
| Variable | Filas, payload, result set | RPS / usuarios | RPS por encima del diseño |
| Datos | Crecen por diseño | Estables | Estables o irrelevantes |
| Tráfico | Operacional, constante | El del plan de capacidad | Hasta error o colapso |
| En InvoiceHub | V0→V3 a 30 RPS | Overlay opcional 90 RPS en V2 | Después; no es esta prueba |

Subir el RPS fase a fase y llamarlo volumétrico es el error que hay que evitar. Eso mide carga o estrés.

**Por qué 30 RPS y no 1 000.** No hay requisito de mil solicitudes por segundo. Treinta es un supuesto de tráfico de un equipo de analistas más una integración. Se elige para *aislar* el efecto del histórico. Si el uso real fuera un batch a 200 RPS, se cambia el número y se mantiene el principio: el RPS no es la palanca.

---

## 2. Escenario: esta API, no un CRUD genérico

**Supuesto de negocio.** Un analista busca el histórico de un cliente mientras el sistema ya guarda meses de facturas. Lectura dominante; altas puntuales.

El riesgo volumétrico de InvoiceHub no es “muchos usuarios”. Es el endpoint del enunciado:

`GET /api/v1/invoices/search?client=`

| Qué hace hoy | Dónde se ve |
|--------------|-------------|
| `LIKE '%' + @ClientName + '%'` | `usp_Invoice_Search` |
| Sin `TOP` ni paginación | El mismo SP |
| Proyecta `LinesJson` (`NVARCHAR(MAX)`) | Search, listado y detalle |
| El validador no limita el número de líneas | `CreateInvoiceRequestValidator` |
| El listado pagina (tope 100) pero hace `COUNT(*)` en cada llamada | `usp_Invoice_List` |
| JWT 120 min; rate limit **solo** en login (10/min) | `Program.cs`, `Jwt:ExpirationMinutes` |
| Pool ADO.NET sin `Max Pool Size` (default SqlClient = 100); `ConnectTimeout = 10` | `SqlConnectionFactory` |
| Sin caché, sin cola, un solo servicio | `Program.cs`, un solo host |

`GET /api/v1/invoices/{id}` es el **control**: seek por PK. Si él se cae, hay saturación general. Si solo se cae `search`, el contrato de ese endpoint no escala.

`PATCH /api/v1/invoices/{id}/status` existe y no entra en el mix: es un update puntual.

### Mix A — lectura (corrida principal)

Mismo RPS en todas las fases. El dataset es lo que cambia.

| Operación | % | A 30 RPS | Rol |
|-----------|--:|---------:|-----|
| `search` cliente típico (≤ 50 facturas) | 40 | 12 | Uso diario |
| `search` cliente caliente | 15 | 4,5 | Sonda de volumen |
| `GET /{id}` | 25 | 7,5 | Control |
| `GET` listado `page=1, pageSize=20` | 15 | 4,5 | `COUNT(*)` |
| `GET /exists?number=` | 5 | 1,5 | Testigo barato |

No se promedia el search caliente con el típico. Cada uno tiene su serie.

### Mix B — payload (corrida aparte, sobre V2)

`POST /api/v1/invoices` con 200 líneas, 5 RPS, 10 minutos, `Idempotency-Key` e `InvoiceNumber` únicos. Aísla `LinesJson` e `IdempotencyRecord.ResponseBody`. **No** se usa el POST para crear el millón de filas: a 5 RPS eso tardaría días y mediría ingestión, no histórico.

### Auth

Un login en `setup()`, token reutilizado. Si la ventana total supera 120 min, se renueva **entre fases**. Login por VU produce 429 y tumba la corrida.

### Dataset (variable independiente)

Precarga por `sqlcmd` + `BULK INSERT`, no por HTTP. Tras cada carga: `UPDATE STATISTICS` y comprobar unicidad de `InvoiceNumber`.

Estimación (orden de magnitud): fila + 5 líneas ≈ 1–1,5 KB. Un millón de facturas ≈ 1,5–3 GB más índices. Search del cliente caliente ≈ `N × 0,9 KB` de JSON: 20 000 facturas ≈ **18 MB**; 50 000 ≈ **45 MB**.

| Nivel | Facturas | Clientes | Cliente caliente | Líneas | Para qué |
|-------|---------:|---------:|-----------------:|--------|----------|
| V0 línea base | 1 000 | 50 | 40 | 5 | Calibrar; ya no es la demo de 3 filas |
| V1 incremento | 100 000 | 500 | 2 000 | 5 | Primera pendiente medible |
| V2 objetivo | 1 000 000 | 2 000 | 20 000 | 5 | Orden de magnitud donde un scan + result set sin tope se ve |
| V3 máximo | 2 000 000 | 2 000 | 50 000 | 5 (10 % con 200) | Caracterizar techo; no es un SLA |

V2 = 1 millón es **supuesto**. Si el histórico real fuera 20 000, se baja el objetivo y se endurece el cliente caliente. 10 millones exigirían hardware que esta prueba no justifica. 10 000 no discrimina.

**Entorno (supuesto).** Dedicado: API 2 vCPU / 2 GB; SQL 4 vCPU / 16 GB; SSD. Inyector en **otra** máquina. Railway (`MSSQL_MEMORY_LIMIT_MB=2048`) no es este experimento: en 2 GB, V2 es un test de OOM.

**Cliente caliente.** Supuesto de borde para poner contra la pared a `search` sin paginar. Si en producción nadie tiene 20 000 facturas, se declara worst case; no se presenta como dato observado.

---

## 3. Métricas y herramientas

Un p95 global esconde el problema. `GET /{id}` puede seguir en 40 ms mientras `search` baja 18 MB.

| Capa | Qué se mira | Para decidir |
|------|-------------|--------------|
| Cliente (k6) | p50 / p95 / p99 **por endpoint**, RPS ofrecido vs logrado, 5xx, timeout, **bytes de respuesta**, TTFB vs tiempo total | Si el volumen se fue a la red o a SQL |
| API / .NET | CPU, RSS, GC gen2, cola del thread pool | Serializar 18 MB es CPU y LOH, no I/O |
| SQL | Duración de `usp_Invoice_Search` y `usp_Invoice_List`, logical reads, plan, waits (`PAGEIOLATCH_*`, `SOS_SCHEDULER_YIELD`, `LCK_*`), memory grant, tempdb, pool | Scan vs sort vs count |
| Host | `docker stats`, disco libre, bytes/s | OOM, NIC, disco |
| Servicio | `/health/ready` cada 5 s | La API puede estar viva y SQL no |

401 y 429 no cuentan como fallo de capacidad: son error del script (token / login). 409 en Mix B por `InvoiceNumber` repetido tampoco: se corrige el generador y se descarta la corrida.

| Herramienta | Para qué aquí |
|-------------|----------------|
| **k6** (`constant-arrival-rate`) | 30 RPS constantes, umbrales por endpoint, JWT en `setup()`. Si la latencia sube, abre VUs hasta un techo (200). Si no sostiene 30 RPS, el volumen redujo capacidad. |
| **sqlcmd + BULK INSERT** | Sembrar V0–V3. El POST no es un seeder de 1 M filas. |
| **Query Store + DMVs** | Tiempo y lecturas de los dos SPs, sin montar APM. |
| **dotnet-counters** | CPU, GC, thread pool del proceso. Ya está en el runtime. |
| **`/health/ready`** | Disponibilidad. Ya existe. |

No se propone Prometheus, Grafana ni OpenTelemetry como prerrequisito: el repo no los tiene. Si el entorno ya los ofrece, se usan; no se añaden para “completar el stack”.

---

## 4. Ejecución y criterios

Preparación: seed V0, estadísticas, JWT, warmup 2 min a 5 RPS (JIT, pool, buffer pool). El warmup no se reporta.

La palanca entre fases es el **dataset**. El RPS no.

| Fase | Dataset | Tráfico | Duración | Objetivo | Avanzar si | Parar si |
|------|---------|---------|----------|----------|------------|----------|
| 1 Línea base | V0 | Mix A, 30 RPS | 20 min | Calibrar mix, auth y métricas | 5xx+timeout < 0,1 %; `GET /{id}` p95 ≤ 100 ms; `/ready` OK | Semilla o auth mal (401/429) |
| 2 Incremento | V1 | Igual | 20 min | Ver la primera pendiente | Control en umbral; delta de search/list registrado | `/ready` > 30 s; 5xx+timeout ≥ 5 %; `GET /{id}` p99 > 2 s; OOM |
| 3 Objetivo | V2 | Igual. Overlay opcional 90 RPS × 5 min **al final**, etiquetado como carga | 20 min (+5) | Aceptar o rechazar V2 | Control + search típico en umbral. El caliente se reporta aparte | Igual. Mezclar el overlay con Mix A **descarta** la corrida |
| 4 Máximo | V3 | Mix A, 30 RPS (no se sube) | 20 min o hasta paro | Caracterizar techo | No hay fase 5 de volumen; se caracteriza o se para | Disco < 10 %; SQL/API irrecuperables |
| 5 Recuperación | Se **deja** V3; se **quita** el search caliente | Mix A sin caliente, 30 RPS | 15 min | ¿Vuelve el control sin reciclar el proceso? | Control a ±20 % del perfil de fase 3; RSS estable | A los 15 min no volvió; RSS sigue subiendo |

**Paro global:** OOM, disco lleno, pool timeouts sostenidos, `/ready` caído, o el inyector saturado (entonces se **descarta** la corrida: no se midió InvoiceHub).

### Umbrales propuestos en V2 (30 RPS)

| Endpoint | p95 | p99 | 5xx + timeout |
|----------|-----|-----|----------------|
| `GET /{id}` | ≤ 100 ms | ≤ 250 ms | < 0,1 % |
| `GET /exists` | ≤ 50 ms | ≤ 150 ms | < 0,1 % |
| Listado `pageSize=20` | ≤ 500 ms | ≤ 1,0 s | < 0,1 % |
| `search` típico (≤ 50 filas) | ≤ 300 ms | ≤ 800 ms | < 0,1 % |
| `search` caliente (20 000 filas) | ≤ 8 s | ≤ 15 s | < 1 % |
| Mix B POST 200 líneas | ≤ 500 ms | ≤ 1,0 s | < 0,1 % |

El search caliente tiene **presupuesto de caracterización**. Superar 8 s en V2 es un **hallazgo** (el endpoint del enunciado no escala sin tope), no un “suspende toda la API”. El veredicto de producto lo dan el control y el search típico.

Un p95 de 200 ms para *todos* los endpoints sería mentira: imposible en 18 MB e inútilmente laxo en `GET /{id}`.

| Sistema (V2) | Éxito propuesto | Falla |
|--------------|-----------------|-------|
| Throughput | ≥ 28 de 30 RPS | < 24 RPS (si no es el inyector) |
| `/health/ready` | ≥ 99,5 % de probes; ningún hueco > 30 s | < 99 % o hueco > 30 s |
| CPU API | p95 < 80 % de 2 vCPU | 95 % + cola de thread pool |
| CPU SQL | p95 < 85 % de 4 vCPU | 95 % + waits de CPU/I/O |
| RAM API | RSS ±20 % tras warmup | Crecimiento lineal u OOM |
| Pool | Checkout p95 < 50 ms; 0 errores | Timeout 10 s |
| `usp_Invoice_Search` típico | p95 SQL ≤ 200 ms | p95 > 500 ms |
| `usp_Invoice_List` | p95 SQL ≤ 400 ms | p95 > 800 ms |

---

## 5. Cuellos de botella y qué haría primero

Problema → síntoma → métrica → arreglo. Solo lo que este código puede producir. No hay balanceador ni servicio externo en la arquitectura; no se inventan.

| Zona | Problema | Síntoma | Métrica | Qué haría |
|------|----------|---------|---------|-----------|
| `search` | Lista ilimitada + `LinesJson` | Respuestas de 10–45 MB | Bytes k6; p95 caliente | Paginar; tope duro; no devolver líneas |
| SQL `search` | `LIKE '%…%'` no usa `IX_Client_Name` | Scan al crecer N | Plan, logical reads, duración del SP | `ClientId` o prefijo; Full-Text solo si el substring es requisito |
| SQL `search` | Sort de miles de filas con `NVARCHAR(MAX)` | Memory grant, tempdb | Spills, waits | Misma proyección corta |
| .NET | Materializar y serializar la lista | CPU API alta, gen2, RSS que no baja en fase 5 | `dotnet-counters`; tiempo total ≫ tiempo del SP | Tope de filas; DTO de ficha |
| Listado | `COUNT(*)` en cada request | Page 1 lenta a N grande | Duración count vs fetch | Count opcional, estimado o cacheado 30–60 s |
| Pool | 100 conexiones × `search` de varios segundos | Timeout a los 10 s | Checkout, conexiones activas | Paginar primero; subir el pool *después* de medir |
| Red | 18 MB × 4,5 RPS | TTFB OK, tiempo total alto | Bytes/s | Sin tope, el resto es cosmética |
| Idempotencia | `ResponseBody NVARCHAR(MAX)` 1:1 con POST | Tabla que no para de crecer | Tamaño de `IdempotencyRecord` | TTL 24–48 h |
| POST | Sin máximo de líneas | Mix B caro | p95 POST | Tope en FluentValidation (p. ej. 100 líneas) |

### Orden (una corrección, luego repetir la misma fase)

1. Paginación y tope en `search` (el mismo patrón que el listado).
2. Sacar `LinesJson` del search; el detalle ya está en `GET /{id}`.
3. Dejar de usar `LIKE '%…%'` como único camino.
4. Relajar el `COUNT(*)` síncrono.
5. Tope de líneas y `CommandTimeout` explícito.
6. Purge de `IdempotencyRecord`.
7. Índice de ficha *después* de (2).
8. Ajustar pool.
9. Caché de fichas **solo** cuando (1) y (2) existan. Cachear el `search` actual cachearía 40 MB.
10. Más RAM en SQL, después de Query Store. No como primera respuesta.

No pondría Redis, un segundo microservicio ni “16 instancias” como respuesta al hallazgo. Un result set sin tope no se arregla con más cajas.
