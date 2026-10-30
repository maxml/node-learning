#!/usr/bin/env bash
# Runs all experiments. Results go to out/*.md. Containers are removed at the end
# unless KEEP=1. Images are pinned by digest (postgres 18.6, mongo 9.0.4).
set -euo pipefail
cd "$(dirname "$0")"
PG_IMG='postgres@sha256:edb0c08dc33befd0262ab3b5cf1c4f3f8cfd8b09e88c05b45adee29d6761ddb6'   # postgres:18 = 18.6
MONGO_IMG='mongo@sha256:741da947cd8d22a4f564ece5e03c8fd93394c16ae469253b12472fe1a81412fa' # mongo:9 = 9.0.4
PG_PORT=${PG_PORT:-55461}; MONGO_PORT=${MONGO_PORT:-27061}
mkdir -p out
cleanup() { [ "${KEEP:-0}" = 1 ] || docker rm -f sd-pg sd-mongo >/dev/null 2>&1 || true; }
trap cleanup EXIT

[ -d node_modules ] || npm ci

node hashing.js  > out/hashing.md
node lb_sim.js   > out/lb_sim.md
node ids_node.js > out/ids_node.md

start_pg() { # $1 = extra postgres args
  docker rm -f sd-pg >/dev/null 2>&1 || true
  docker run -d --name sd-pg -e POSTGRES_PASSWORD=pw -p 127.0.0.1:${PG_PORT}:5432 "$PG_IMG" $1 >/dev/null
  until docker exec sd-pg pg_isready -U postgres -h 127.0.0.1 >/dev/null 2>&1; do sleep 1; done; sleep 2
}
start_mongo() { # $1 = extra mongod args
  docker rm -f sd-mongo >/dev/null 2>&1 || true
  docker run -d --name sd-mongo -p 127.0.0.1:${MONGO_PORT}:27017 "$MONGO_IMG" mongod --bind_ip_all $1 >/dev/null
  until docker exec sd-mongo mongosh --quiet --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1; do sleep 1; done
}
export PG_URL="postgres://postgres:pw@127.0.0.1:${PG_PORT}/postgres"
export MONGO_URL="mongodb://127.0.0.1:${MONGO_PORT}/?directConnection=true"

start_pg ""
node ids_pg.js > out/ids_pg_default.md
start_pg "-c shared_buffers=16MB"
node ids_pg.js > out/ids_pg_small_cache.md
# 5M rows, server-side generation only (no client-side generation cost), one run each
ROWS=5000000 REPS=1 ONLY='bigint,uuidv4() server,uuidv7() server' node ids_pg.js > out/ids_pg_small_cache_5m.md

start_mongo ""
node ids_mongo.js > out/ids_mongo_default.md
start_mongo "--wiredTigerCacheSizeGB 0.25"
node ids_mongo.js > out/ids_mongo_small_cache.md

head -n 100 out/*.md
