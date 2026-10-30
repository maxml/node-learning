#!/usr/bin/env bash
# Повний прогін експериментів з індексами: PostgreSQL 18 (і 17 для skip scan) та MongoDB 9.
# Вивід кожного скрипта пишеться в out/<скрипт>.out. Контейнери видаляються наприкінці (KEEP=1 лишає їх).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
PG_PORT=${PG_PORT:-55434} PG17_PORT=${PG17_PORT:-55435} MONGO_PORT=${MONGO_PORT:-27051}

docker rm -f idx-pg idx-pg17 idx-mongo >/dev/null 2>&1 || true
docker run -d --name idx-pg   -p 127.0.0.1:$PG_PORT:5432   -e POSTGRES_PASSWORD=pg postgres:18 -c shared_buffers=512MB -c work_mem=4MB >/dev/null
docker run -d --name idx-pg17 -p 127.0.0.1:$PG17_PORT:5432 -e POSTGRES_PASSWORD=pg postgres:17 -c shared_buffers=512MB -c work_mem=4MB >/dev/null
docker run -d --name idx-mongo -p 127.0.0.1:$MONGO_PORT:27017 mongo:9 >/dev/null
until docker exec idx-pg pg_isready -U postgres -q && docker exec idx-pg17 pg_isready -U postgres -q \
      && docker exec idx-mongo mongosh --quiet --eval 1 >/dev/null 2>&1; do sleep 1; done
sleep 2

# Дані: генеруються в PostgreSQL, ті самі рядки йдуть у MongoDB
docker exec -i idx-pg   psql -U postgres -q < gen.sql > out/gen.out
docker exec -i idx-pg17 psql -U postgres -q < gen.sql > out/gen17.out
docker exec -i idx-pg psql -U postgres -q < export-mongo.sql \
  | docker exec -i idx-mongo mongoimport --quiet -d shop -c orders --drop
for f in mongolib.js esr_mongo.js nuances_mongo.js card_mongo.js unique_mongo.js; do docker cp "$f" idx-mongo:/tmp/; done

python3 esr_pg.py      > out/esr_pg.out
python3 nuances_pg.py  > out/nuances_pg.out
python3 card_pg.py     > out/card_pg.out
PG_CONTAINER=idx-pg17 python3 card_pg.py > out/card_pg17.out
docker exec -i idx-pg psql -U postgres -e < unique_pg.sql > out/unique_pg.out 2>&1
python3 race_pg.py     > out/race_pg.out

docker exec idx-mongo mongosh --quiet shop /tmp/mongolib.js /tmp/esr_mongo.js     > out/esr_mongo.out
docker exec idx-mongo mongosh --quiet shop /tmp/mongolib.js /tmp/nuances_mongo.js > out/nuances_mongo.out
docker exec idx-mongo mongosh --quiet shop /tmp/mongolib.js /tmp/card_mongo.js    > out/card_mongo.out
docker exec idx-mongo mongosh --quiet /tmp/unique_mongo.js                        > out/unique_mongo.out

[ "${KEEP:-0}" = 1 ] || docker rm -f idx-pg idx-pg17 idx-mongo >/dev/null
echo "done: $(ls out | tr '\n' ' ')"
