#!/usr/bin/env bash
# Replica set diagnostics experiment: lag, flow control, oplog window, elections, initial sync.
# Three mongod containers (cdiag-m1..m3) on their own network (cdiag-net), no host ports.
# Usage: ./run.sh            (needs docker and the mongo:9 image; removes its containers on exit)
set -uo pipefail

IMG=${IMG:-mongo:9}
NET=cdiag-net
RS=cdiag
HERE=$(cd "$(dirname "$0")" && pwd)
NODES=(cdiag-m1 cdiag-m2 cdiag-m3)

cleanup() {
  docker rm -f "${NODES[@]}" >/dev/null 2>&1
  docker network rm "$NET" >/dev/null 2>&1
  return 0
}
trap cleanup EXIT

start_node() {
  docker run -d --name "$1" --hostname "$1" --network "$NET" -v "$HERE:/exp:ro" "$IMG" \
    mongod --replSet "$RS" --bind_ip_all >/dev/null
}

# js <node> <code> [ENV=VAL ...]
js() {
  local node=$1 code=$2
  shift 2
  local envs=()
  for e in "$@"; do envs+=(-e "$e"); done
  docker exec "${envs[@]}" "$node" mongosh --quiet --norc --eval "load('/exp/diag.js'); $code"
}

now_ms() { date +%s%3N; }

cleanup
docker network create "$NET" >/dev/null
for n in "${NODES[@]}"; do start_node "$n"; done
sleep 5
docker exec cdiag-m1 mongosh --quiet --norc --eval "rs.initiate({_id:'$RS', members:[
  {_id:0, host:'cdiag-m1:27017', priority:2},
  {_id:1, host:'cdiag-m2:27017'},
  {_id:2, host:'cdiag-m3:27017'}]}).ok" >/dev/null
until [ "$(docker exec cdiag-m1 mongosh --quiet --norc --eval 'db.hello().isWritablePrimary')" = "true" ]; do sleep 1; done
sleep 3
echo "== $(docker exec cdiag-m1 mongod --version | head -1), $(date -u +%FT%TZ)"
js cdiag-m1 "status('healthy baseline')"

echo
echo "== A. Secondary alive but not applying: db.fsyncLock() on cdiag-m3, writer 20 s"
docker exec cdiag-m3 mongosh --quiet --norc --eval 'db.fsyncLock().ok' >/dev/null
js cdiag-m1 "writer()" DUR=20 W=1 &
sleep 15
js cdiag-m1 "status('A: 15 s into the writer'); flow()"
js cdiag-m1 "rs.printSecondaryReplicationInfo()"
wait
js cdiag-m1 "print('w:majority with m3 locked:', JSON.stringify(db.getSiblingDB('diag').probe.insertOne({a:1},{writeConcern:{w:'majority',wtimeout:5000}}).acknowledged))"
docker exec cdiag-m3 mongosh --quiet --norc --eval 'db.fsyncUnlock().ok' >/dev/null
js cdiag-m1 "catchUp('cdiag-m3:27017', 120)"

echo
echo "== B. Secondary frozen (docker pause cdiag-m3), writer 20 s"
docker pause cdiag-m3 >/dev/null
js cdiag-m1 "writer()" DUR=20 W=1 &
sleep 15
js cdiag-m1 "status('B: 15 s into the writer'); flow()"
js cdiag-m1 "rs.printSecondaryReplicationInfo()"
wait
docker unpause cdiag-m3 >/dev/null
js cdiag-m1 "catchUp('cdiag-m3:27017', 120)"

echo
echo "== C. Majority lagging: fsyncLock on both secondaries, single-doc writer 40 s (flow control)"
js cdiag-m1 "writer()" DUR=5 W=1 BATCH=1 RATE=100000
js cdiag-m1 "flow()"
for n in cdiag-m2 cdiag-m3; do docker exec "$n" mongosh --quiet --norc --eval 'db.fsyncLock().ok' >/dev/null; done
js cdiag-m1 "writer()" DUR=40 W=1 BATCH=1 RATE=100000 &
sleep 35
js cdiag-m1 "status('C: 35 s into the writer'); flow()"
js cdiag-m1 "const ops=db.getSiblingDB('admin').aggregate([{\$currentOp:{}},{\$match:{waitingForFlowControl:true}}]).toArray(); print('\$currentOp waitingForFlowControl=true:', ops.length)"
wait
for n in cdiag-m2 cdiag-m3; do docker exec "$n" mongosh --quiet --norc --eval 'db.fsyncUnlock().ok' >/dev/null; done
js cdiag-m1 "catchUp('cdiag-m2:27017', 120); catchUp('cdiag-m3:27017', 120); flow()"

echo
echo "== D. Oplog window and replSetResizeOplog (on the primary)"
js cdiag-m1 "rs.printReplicationInfo()"
js cdiag-m1 "oplog()"

echo
echo "== E1. Clean shutdown of the primary (docker stop cdiag-m1)"
T0=$(now_ms)
docker stop cdiag-m1 >/dev/null
js cdiag-m2 "election()" T0="$T0" EXCLUDE=cdiag-m1:27017
echo "-- restart cdiag-m1 (priority 2)"
T0=$(now_ms)
docker start cdiag-m1 >/dev/null
js cdiag-m2 "waitPrimaryIs()" T0="$T0" NAME=cdiag-m1:27017
js cdiag-m1 "electionMetrics('cdiag-m1:27017'); print('  m1 lastElectionReason=' + rs.status().electionCandidateMetrics.lastElectionReason)"

echo
echo "== E2. Primary hangs (docker pause cdiag-m1)"
T0=$(now_ms)
docker pause cdiag-m1 >/dev/null
js cdiag-m2 "election()" T0="$T0" EXCLUDE=cdiag-m1:27017
docker unpause cdiag-m1 >/dev/null
sleep 3
js cdiag-m1 "electionMetrics('cdiag-m1:27017')"

echo
echo "== F. ELECTION/REPL log lines on cdiag-m2 (msg, count)"
docker logs cdiag-m2 2>&1 | grep -E '"c":"(ELECTION|REPL)"' | grep -iE 'elect|step|primary|catch|heartbeat' |
  sed -E 's/.*"msg":"([^"]*)".*/\1/' | sort | uniq -c | sort -rn | head -25

echo
echo "== G. Initial sync: recreate cdiag-m3 with an empty dbPath"
js cdiag-m2 "print('docs to copy:', db.getSiblingDB('diag').events.estimatedDocumentCount())"
docker rm -f cdiag-m3 >/dev/null
start_node cdiag-m3
until docker exec cdiag-m3 mongosh --quiet --norc --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1; do sleep 0.2; done
js cdiag-m3 "initialSync()"
docker logs cdiag-m3 2>&1 | grep -E '"c":"INITSYNC"' | sed -E 's/.*"msg":"([^"]*)".*/\1/' | sort | uniq -c | sort -rn | head -12
js cdiag-m2 "status('right after: the view from cdiag-m2')"
js cdiag-m3 "status('right after: the view from cdiag-m3 itself')"
