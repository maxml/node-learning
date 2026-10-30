#!/usr/bin/env bash
# CAP experiment, PostgreSQL 18: primary + streaming standby on a docker network.
# usage: pg_exp.sh async|sync
set -u
MODE=${1:?async|sync}
D=$(cd "$(dirname "$0")" && pwd)
NET=cap-net
P=cap-pg1; S=cap-pg2
ts() { date +%H:%M:%S.%3N; }
q()  { docker exec "$1" psql -U postgres -At -v ON_ERROR_STOP=0 -c "$2" 2>&1; }

docker rm -f $P $S >/dev/null 2>&1
docker network create $NET >/dev/null 2>&1

docker run -d --name $P --network $NET -e POSTGRES_HOST_AUTH_METHOD=trust \
  -v "$D/pg_hba.conf:/etc/cap_hba.conf:ro" postgres:18 \
  -c hba_file=/etc/cap_hba.conf -c wal_sender_timeout=0 >/dev/null
until docker exec $P pg_isready -U postgres -h localhost >/dev/null 2>&1; do sleep 0.5; done
sleep 2
until docker exec $P pg_isready -U postgres -h localhost >/dev/null 2>&1; do sleep 0.5; done

docker run -d --name $S --network $NET --user postgres \
  -v "$D/pg_hba.conf:/etc/cap_hba.conf:ro" --entrypoint bash postgres:18 -c \
  'pg_basebackup -h cap-pg1 -U postgres -D /tmp/sb -R -X stream -c fast && chmod 700 /tmp/sb && exec postgres -D /tmp/sb -c hba_file=/etc/cap_hba.conf -c wal_receiver_timeout=0' >/dev/null
until docker exec $S pg_isready -U postgres -h localhost >/dev/null 2>&1; do sleep 0.5; done

q $P "CREATE TABLE t(id int primary key, v text)"
q $P "INSERT INTO t VALUES (1,'before-partition')"
sleep 1
echo "[$(ts)] replication: $(q $P "SELECT application_name||' '||state||' '||sync_state FROM pg_stat_replication")"
echo "[$(ts)] standby sees: $(q $S "SELECT string_agg(id||'='||v, ',') FROM t")"

if [ "$MODE" = sync ]; then
  q $P "ALTER SYSTEM SET synchronous_standby_names='*'" >/dev/null
  q $P "SELECT pg_reload_conf()" >/dev/null
  sleep 1
  echo "[$(ts)] replication: $(q $P "SELECT application_name||' '||state||' '||sync_state FROM pg_stat_replication")"
fi

echo "[$(ts)] PARTITION: disconnect standby from network"
docker network disconnect $NET $S

if [ "$MODE" = async ]; then
  echo "[$(ts)] primary INSERT 2: $(q $P "INSERT INTO t VALUES (2,'acked-during-partition')")"
  echo "[$(ts)] primary sees: $(q $P "SELECT string_agg(id||'='||v, ',') FROM t")"
  echo "[$(ts)] standby (isolated) read: $(q $S "SELECT string_agg(id||'='||v, ',') FROM t")"
  echo "[$(ts)] standby write attempt: $(q $S "INSERT INTO t VALUES (3,'x')")"
  echo "[$(ts)] primary dies (docker kill), standby promoted"
  docker kill $P >/dev/null
  echo "[$(ts)] promote: $(q $S "SELECT pg_promote()")"
  sleep 1
  echo "[$(ts)] new primary sees: $(q $S "SELECT string_agg(id||'='||v, ',') FROM t")"
else
  OUT="$D/pg_sync_insert.out"
  echo "[$(ts)] primary INSERT 2 (session has statement_timeout=5s) started in background"
  ( docker exec $P psql -U postgres -At -c "SET statement_timeout='5s'" \
      -c "INSERT INTO t VALUES (2,'commit-waiting-for-standby')" > "$OUT" 2>&1; echo "psql exit=$?" >> "$OUT" ) &
  sleep 12
  echo "[$(ts)] after 12 s: $(q $P "SELECT 'waiting pid='||pid||' wait_event='||wait_event||' for '||round(extract(epoch from now()-query_start))||'s' FROM pg_stat_activity WHERE wait_event='SyncRep'")"
  echo "[$(ts)] other session on primary sees (while commit waits): $(q $P "SELECT string_agg(id||'='||v, ',') FROM t")"
  echo "[$(ts)] standby (isolated) read: $(q $S "SELECT string_agg(id||'='||v, ',') FROM t")"
  echo "[$(ts)] pg_cancel_backend on the waiting session: $(q $P "SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE wait_event='SyncRep'")"
  wait
  echo "[$(ts)] output of the cancelled INSERT session:"; sed 's/^/    /' "$OUT"
  echo "[$(ts)] other session on primary sees (after cancel): $(q $P "SELECT string_agg(id||'='||v, ',') FROM t")"
  echo "[$(ts)] standby (isolated) read: $(q $S "SELECT string_agg(id||'='||v, ',') FROM t")"
  echo "[$(ts)] primary dies (docker kill), standby promoted"
  docker kill $P >/dev/null
  echo "[$(ts)] promote: $(q $S "SELECT pg_promote()")"
  sleep 1
  echo "[$(ts)] new primary sees: $(q $S "SELECT string_agg(id||'='||v, ',') FROM t")"
fi

docker rm -f $P $S >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
echo "[$(ts)] cleaned up"
