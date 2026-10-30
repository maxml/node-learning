#!/usr/bin/env bash
# Експеримент з тюнінгу MongoDB: один mongod у Docker з лімітом пам'яті 2 ГБ.
# Вивід: out/seed.out, out/tuning.out. Контейнер видаляється наприкінці (KEEP=1 лишає його).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
IMAGE=${IMAGE:-mongo:9}   # прогін 2026-10-30: mongo:9 = 9.0.4; версію друкує перший рядок out/tuning.out
NAME=tune-mongo

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --memory 2g "$IMAGE" >/dev/null
until docker exec "$NAME" mongosh --quiet --eval 1 >/dev/null 2>&1; do sleep 1; done
docker cp seed.js "$NAME":/tmp/ && docker cp tuning.js "$NAME":/tmp/
docker exec "$NAME" mongosh --quiet shop /tmp/seed.js   | tee out/seed.out
docker exec "$NAME" mongosh --quiet shop /tmp/tuning.js | tee out/tuning.out
[ "${KEEP:-0}" = 1 ] || docker rm -f "$NAME" >/dev/null
