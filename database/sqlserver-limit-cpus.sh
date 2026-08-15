#!/bin/bash
# sqlservr debe ser el proceso que no termina (Railway = Completed si el PID 1 sale).
# taskset limita CPU para no explotar fs.aio-max-nr en el host.

set -euo pipefail

export ACCEPT_EULA="${ACCEPT_EULA:-Y}"
export MSSQL_PID="${MSSQL_PID:-Developer}"
export MSSQL_MEMORY_LIMIT_MB="${MSSQL_MEMORY_LIMIT_MB:-2048}"

CPUS="${MSSQL_VISIBLE_CPUS:-0-1}"

echo "sqlservr CPU affinity=${CPUS} MSSQL_MEMORY_LIMIT_MB=${MSSQL_MEMORY_LIMIT_MB}"
echo "exec sqlservr (foreground) — if this line is the last log, the process is still starting"

if command -v taskset >/dev/null 2>&1; then
  exec taskset -c "${CPUS}" /opt/mssql/bin/sqlservr
fi

exec /opt/mssql/bin/sqlservr
