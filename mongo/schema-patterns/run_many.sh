#!/usr/bin/env bash
# Вимір ціни колекцій: файли, дескриптори, data handles, чекпойнт, рестарт.
# Використання: [NOFILE=64000] ./run_many.sh [NCOLL]
#   NCOLL  — колекцій, кожна з _id та ще одним індексом (типово 10000 → 30 000 об'єктів)
#   NOFILE — ліміт відкритих файлів mongod (типово 64000, як радить документація;
#            NOFILE=1024 відтворює типовий soft-ліміт контейнера і зависання)
set -euo pipefail
N="${1:-10000}"
NOFILE="${NOFILE:-64000}"
NAME=schpat-many
PORT=27068
DIR="$(cd "$(dirname "$0")" && pwd)"

PHASE_TIMEOUT="${PHASE_TIMEOUT:-3600}"   # зависла фаза (низький ulimit) обривається
sh_() { timeout "$PHASE_TIMEOUT" docker exec "$NAME" mongosh --quiet --eval "var MODE='$1'; var NCOLL=$N;" /work/many_collections.js; }
files() {
  docker exec "$NAME" bash -c 'echo "{\"wtFiles\": $(ls /data/db/*.wt | wc -l), \"openFds\": $(ls /proc/1/fd | wc -l), \"dbpathMB\": $(du -sm /data/db | cut -f1)}"'
}
wait_up() {
  local t0; t0=$(date +%s%N)
  until docker exec "$NAME" mongosh --quiet --eval 'db.adminCommand({ping:1}).ok' >/dev/null 2>&1; do sleep 0.2; done
  echo "{\"startupMs\": $(( ($(date +%s%N) - t0) / 1000000 ))}"
}

docker rm -f "$NAME" >/dev/null 2>&1 || true
trap 'echo "{\"collectionFilesAtExit\": $(docker exec "$NAME" bash -c "ls /data/db/collection-*.wt | wc -l" 2>/dev/null || echo null)}"; docker logs "$NAME" 2>&1 | grep -m1 "Too many open files" | cut -c1-200 || true; docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$NAME" --ulimit nofile="$NOFILE:$NOFILE" -p 127.0.0.1:$PORT:27017 -v "$DIR":/work:ro mongo:9 >/dev/null
wait_up >/dev/null
docker exec "$NAME" mongosh --quiet --eval 'print("server " + db.version())'
docker exec "$NAME" bash -c 'grep "Max open files" /proc/1/limits'

echo "== порожня база"; files; sh_ stats
echo "== рестарт порожньої бази"
t0=$(date +%s%N); docker restart "$NAME" >/dev/null; wait_up
echo "{\"restartTotalMs\": $(( ($(date +%s%N) - t0) / 1000000 ))}"
echo "== створення $N колекцій"; sh_ create
sleep 65   # дочекатися чекпойнту (типово раз на 60 с)
files; sh_ stats
echo "== вставки"; sh_ write
echo "== рестарт"
t0=$(date +%s%N); docker restart "$NAME" >/dev/null; wait_up
echo "{\"restartTotalMs\": $(( ($(date +%s%N) - t0) / 1000000 ))}"
files; sh_ stats
echo "== читання з кожної колекції"; sh_ touch; files
sleep 65; sh_ stats
