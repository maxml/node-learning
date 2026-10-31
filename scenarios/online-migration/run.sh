#!/usr/bin/env bash
# Full run of the online-migration scenario on PostgreSQL 18 (and the MySQL 8.4 check).
# Output of each step goes to out/<step>.out. Containers are removed at the end (KEEP=1 keeps them).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
export PGPORT=${PGPORT:-55440}

cleanup() { docker rm -f -v scen-mig-pg scen-mig-mysql >/dev/null 2>&1 || true; }
cleanup
[ "${KEEP:-0}" = 1 ] || trap cleanup EXIT
# data directories on tmpfs (RAM): no anonymous volumes left on disk; fsync is nearly free there
docker run -d --name scen-mig-pg -p 127.0.0.1:$PGPORT:5432 -e POSTGRES_PASSWORD=pg --shm-size=1g \
  --tmpfs /var/lib/postgresql:rw,size=6g \
  postgres:18 -c shared_buffers=512MB -c max_wal_size=2GB -c checkpoint_timeout=30min >/dev/null
until docker exec scen-mig-pg pg_isready -U postgres -q; do sleep 1; done
sleep 2
[ -d node_modules ] || npm ci --no-audit --no-fund

docker exec -i scen-mig-pg psql -U postgres -v ON_ERROR_STOP=1 -q < setup.sql > out/00-setup.out 2>&1
docker exec scen-mig-pg psql -U postgres -Atc 'select version()' >> out/00-setup.out
node 01-add-column.mjs | tee out/01-add-column.out
node 02-lock-queue.mjs | tee out/02-lock-queue.out
node 03-dual-write.mjs | tee out/03-dual-write.out
node 04-backfill.mjs sweep | tee out/04-backfill-sweep.out
# restartable job: crash after 250 batches, then start again and finish
{ node 04-backfill.mjs run --batch 10000 --sleep 20 --crash-after 250 || true; \
  node 04-backfill.mjs run --batch 10000 --sleep 20; } | tee out/04-backfill-run.out
node 05-not-null.mjs | tee out/05-not-null.out
node 06-index.mjs | tee out/06-index.out
node 07-partitioned.mjs | tee out/07-partitioned.out

if [ "${MYSQL:-1}" = 1 ]; then
  docker run -d --name scen-mig-mysql -e MYSQL_ROOT_PASSWORD=pg -e MYSQL_DATABASE=mig \
    --tmpfs /var/lib/mysql:rw,size=3g mysql:8.4.2 >/dev/null
  until docker exec scen-mig-mysql mysql -uroot -ppg -e 'select 1' mig >/dev/null 2>&1; do sleep 2; done
  docker exec -i scen-mig-mysql mysql -uroot -ppg --force --unbuffered -vvv mig < 08-mysql.sql 2>&1 \
    | grep -E '^\| [A-Z]|ERROR|Query OK|^mysql: \[Warning\]' | grep -v Warning | tee out/08-mysql.out
fi

echo "done: $(ls out | tr '\n' ' ')"
