#!/usr/bin/env bash
# Повний прогін експериментів. Порти 56391–56394 на 127.0.0.1 (6379 на хості може бути зайнятий).
set -euo pipefail
cd "$(dirname "$0")"

VALKEY=valkey/valkey:9.1.3
REDIS=redis:8.10.3

cleanup() { docker rm -f sdc-cache sdc-redis sdc-primary sdc-replica >/dev/null 2>&1 || true; docker network rm sdc-net >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker network create sdc-net >/dev/null
docker run -d --rm --name sdc-cache -p 127.0.0.1:56391:6379 "$VALKEY" valkey-server --save '' --enable-debug-command yes >/dev/null
docker run -d --rm --name sdc-redis -p 127.0.0.1:56394:6379 "$REDIS" redis-server --save '' --enable-debug-command yes >/dev/null
sleep 1.5

npm ci --no-audit --no-fund >/dev/null

node stampede.js
node xfetch.js
BETA=0.5 node xfetch.js | tail -1
BETA=2 node xfetch.js | tail -1
node race.js
node replication_loss.js
IMAGE="$REDIS" node replication_loss.js
node eviction.js
PAUSE_MS=0 POLICIES=allkeys-lru,allkeys-lfu node eviction.js
CACHE_URL=redis://127.0.0.1:56394 node eviction.js
node blocking.js
CACHE_URL=redis://127.0.0.1:56394 node blocking.js
