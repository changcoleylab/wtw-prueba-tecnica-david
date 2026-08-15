#!/bin/bash
set -euo pipefail

# Espera a SQL Server y aplica scripts en orden.
# Compose: servicio db-init monta ./database en /scripts.

SA_PASSWORD="${MSSQL_SA_PASSWORD:?MSSQL_SA_PASSWORD is required}"
HOST="${MSSQL_HOST:-sqlserver}"
SCRIPTS_DIR="${INIT_SCRIPTS_DIR:-/scripts}"
MARKER="${INIT_MARKER:-/var/opt/mssql/.invoicehub-schema-v1.done}"

if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then
  SQLCMD=/opt/mssql-tools18/bin/sqlcmd
elif [ -x /opt/mssql-tools/bin/sqlcmd ]; then
  SQLCMD=/opt/mssql-tools/bin/sqlcmd
else
  echo "sqlcmd not found in this image." >&2
  exit 1
fi

is_schema_initialized() {
  local result
  result=$(
    "${SQLCMD}" -S "${HOST}" -U sa -P "${SA_PASSWORD}" -C \
      -Q "SET NOCOUNT ON; IF DB_ID('InvoiceHub') IS NOT NULL AND EXISTS (SELECT 1 FROM InvoiceHub.sys.tables WHERE name = 'AppUser') SELECT 1 ELSE SELECT 0" \
      -h -1 -W 2>/dev/null | tr -d '[:space:]' || true
  )
  [ "${result}" = "1" ]
}

echo "Waiting for SQL Server at ${HOST}..."
ready=0
for i in $(seq 1 60); do
  if "${SQLCMD}" -S "${HOST}" -U sa -P "${SA_PASSWORD}" -C -Q "SELECT 1" -b >/dev/null 2>&1; then
    echo "SQL Server is ready."
    ready=1
    break
  fi
  if [ $((i % 10)) -eq 0 ]; then
    echo "Still waiting for SQL login (${i}/60)..."
  fi
  sleep 2
done

if [ "${ready}" -ne 1 ]; then
  echo "SQL Server did not become ready in time." >&2
  exit 1
fi

if [ -f "${MARKER}" ] && is_schema_initialized; then
  echo "InvoiceHub already initialized; skipping schema scripts."
  exit 0
fi

if [ -f "${MARKER}" ] && ! is_schema_initialized; then
  echo "Init marker present but schema missing; re-running init."
  rm -f "${MARKER}"
fi

if is_schema_initialized; then
  echo "InvoiceHub schema already present; skipping scripts."
  touch "${MARKER}"
  exit 0
fi

for script in "${SCRIPTS_DIR}/00-create-database.sql" \
              "${SCRIPTS_DIR}/01-tables.sql" \
              "${SCRIPTS_DIR}/02-indexes.sql" \
              "${SCRIPTS_DIR}/05-invoice-lines.sql" \
              "${SCRIPTS_DIR}/03-stored-procedures.sql" \
              "${SCRIPTS_DIR}/04-seed.sql"; do
  echo "Applying ${script}..."
  "${SQLCMD}" -S "${HOST}" -U sa -P "${SA_PASSWORD}" -C -i "${script}" -b
done

touch "${MARKER}"
echo "Database InvoiceHub initialized."
