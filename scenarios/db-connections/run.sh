#!/usr/bin/env bash
# DB connection exhaustion: PostgreSQL 18 limited to 2 CPUs and max_connections = 100,
# N API replicas (Node processes, each with its own pg.Pool) under a traffic spike,
# then the fixes. Output goes to out/*.out. Containers are removed at the end (KEEP=1 keeps them).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
export PGPORT=${PGPORT:-55441}
BOUNCER_PORT=${BOUNCER_PORT:-55442}
# offered load of the spike, requests/s; ~1.3x what the DB can serve with the slow query
# on this machine (see out/1-sweep.out). Re-calibrate on another machine.
SPIKE=${SPIKE:-140}
NORMAL=${NORMAL:-45}
SWEET=${SWEET:-4}

cleanup() { docker rm -f -v scen-conn-pg scen-conn-bouncer >/dev/null 2>&1 || true; docker network rm scen-conn-net >/dev/null 2>&1 || true; }
cleanup
[ "${KEEP:-0}" = 1 ] || trap cleanup EXIT
docker network create scen-conn-net >/dev/null
docker run -d --name scen-conn-pg --network scen-conn-net --cpus=2 -p 127.0.0.1:$PGPORT:5432 \
  --tmpfs /var/lib/postgresql:rw,size=2g -e POSTGRES_PASSWORD=pg postgres:18 \
  -c max_connections=100 -c shared_buffers=256MB -c max_parallel_workers_per_gather=0 \
  -c shared_preload_libraries=pg_stat_statements >/dev/null
until docker exec scen-conn-pg pg_isready -U postgres -q; do sleep 1; done
sleep 2
[ -d node_modules ] || npm ci --no-audit --no-fund
docker exec -i scen-conn-pg psql -U postgres -v ON_ERROR_STOP=1 -q < setup.sql > out/0-setup.out 2>&1
docker exec scen-conn-pg psql -U postgres -Atc 'select version()' >> out/0-setup.out

echo "== 1. what the DB does with C concurrent queries (closed loop, no app queue)"
node sweep.mjs | tee out/1-sweep.out

echo "== 2. the incident: spike of $SPIKE rps, 20s; scaling the replicas"
{
node fleet.mjs --label "2a 'twenty replicas'" --replicas 2 --pool 30 --rate $SPIKE
node fleet.mjs --label "2b 'sixty replicas' " --replicas 6 --pool 30 --rate $SPIKE
} | tee out/2-incident.out
docker exec -i scen-conn-pg psql -U postgres < diagnose.sql | tee out/2-diagnose.out

echo "== 3. cap total concurrency to the sweet spot ($SWEET connections), shed the rest fast"
docker run -d --name scen-conn-bouncer --network scen-conn-net -p 127.0.0.1:$BOUNCER_PORT:5432 \
  -e DB_HOST=scen-conn-pg -e DB_USER=app -e DB_PASSWORD=app -e DB_NAME=postgres -e AUTH_TYPE=scram-sha-256 \
  -e POOL_MODE=transaction -e DEFAULT_POOL_SIZE=$SWEET -e MAX_CLIENT_CONN=1000 -e QUERY_WAIT_TIMEOUT=0.25 \
  edoburu/pgbouncer:v1.23.1-p3 >/dev/null
sleep 2
{
node fleet.mjs --label "3a pools capped 6x1, no acquire timeout" --replicas 6 --pool 1 --rate $SPIKE
node fleet.mjs --label "3b pools capped 6x1, acquire 250ms   " --replicas 6 --pool 1 --rate $SPIKE --conn-timeout 250
node fleet.mjs --label "3c PgBouncer tx pool=$SWEET, wait 250ms " --replicas 6 --pool 30 --rate $SPIKE --port $BOUNCER_PORT
} | tee out/3-cap.out
BOUNCER_PORT=$BOUNCER_PORT node bouncer-session-state.mjs | tee out/3-bouncer-session-state.out

echo "== 4. scheduled workers on the same DB at normal traffic ($NORMAL rps)"
{
node fleet.mjs --label "4a no workers           " --replicas 3 --pool 10 --rate $NORMAL
node fleet.mjs --label "4b workers, 8 jobs/pool 8" --replicas 3 --pool 10 --rate $NORMAL --workers-jobs 8 --workers-pool 8
node fleet.mjs --label "4c workers, 8 jobs/pool 1" --replicas 3 --pool 10 --rate $NORMAL --workers-jobs 8 --workers-pool 1
} | tee out/4-workers.out

echo "== 5. fix the slow query, replay the incident"
docker exec scen-conn-pg psql -U postgres -qc 'CREATE INDEX CONCURRENTLY orders_customer_id_idx ON orders (customer_id)'
docker exec -i scen-conn-pg psql -U postgres < diagnose.sql | sed -n '/QUERY PLAN/,$p' | tee out/5-explain-after.out
node fleet.mjs --label "5 'sixty replicas' + index" --replicas 6 --pool 30 --rate $SPIKE | tee out/5-index.out

echo "done: $(ls out | tr '\n' ' ')"
