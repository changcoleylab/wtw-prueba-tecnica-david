#!/bin/sh
set -e
export PORT="${PORT:-80}"
export API_UPSTREAM="${API_UPSTREAM:-}"
export API_UPSTREAM="${API_UPSTREAM%/}"

if [ -z "${API_UPSTREAM}" ]; then
  echo "API_UPSTREAM is required. Local Compose: http://api:8080. Railway: https://<api-public>.up.railway.app" >&2
  exit 1
fi

echo "nginx PORT=${PORT} API_UPSTREAM=${API_UPSTREAM}"

envsubst '${PORT} ${API_UPSTREAM}' \
  < /etc/nginx/web.conf.template \
  > /etc/nginx/conf.d/default.conf

exec /docker-entrypoint.sh nginx -g "daemon off;"
