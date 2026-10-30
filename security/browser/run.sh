#!/usr/bin/env bash
# Запуск: bash run.sh            (усі три браузери, з 125-секундним очікуванням для Lax+POST)
#         LAX_POST_WAIT_MS=-1 bash run.sh   (без сценарію Lax+POST)
#         BROWSERS=chromium bash run.sh
# Нічого не публікує назовні: сервер і браузери живуть в одному контейнері, порти не прокидаються.
set -euo pipefail
cd "$(dirname "$0")"
IMG=mcr.microsoft.com/playwright:v1.61.0-noble
docker run --rm --name sec-browser-exp \
  --add-host a.test:127.0.0.1 --add-host sub.a.test:127.0.0.1 \
  --add-host b.test:127.0.0.1 --add-host cdn.test:127.0.0.1 \
  -e LAX_POST_WAIT_MS="${LAX_POST_WAIT_MS:-125000}" -e BROWSERS="${BROWSERS:-chromium,firefox,webkit}" \
  -v "$PWD":/work:ro "$IMG" bash -c '
    set -e
    mkdir -p /tmp/certs /tmp/pw
    openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=a.test" \
      -addext "subjectAltName=DNS:a.test,DNS:sub.a.test,DNS:b.test,DNS:cdn.test" \
      -keyout /tmp/certs/key.pem -out /tmp/certs/cert.pem 2>/dev/null
    (cd /tmp/pw && npm i --silent --no-audit --no-fund playwright@1.61.0 dompurify@3.2.6 >/dev/null)
    node /work/server.js & sleep 1
    PW=/tmp/pw/node_modules/playwright node /work/run.js
  '
