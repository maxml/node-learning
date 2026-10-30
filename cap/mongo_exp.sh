#!/usr/bin/env bash
# CAP experiment, MongoDB: 3-node replica set in 3 containers; isolate the primary
# (docker network disconnect) and probe both sides per operation type.
# usage: mongo_exp.sh [image]   (default mongo:9)
set -u
IMG=${1:-mongo:9}
NET=cap-net
ts() { date +%H:%M:%S.%3N; }
# js on a node via a direct connection (no driver retries, no server selection to other nodes)
m() { docker exec "$1" mongosh --quiet "mongodb://localhost:27017/test?directConnection=true&retryWrites=false&serverSelectionTimeoutMS=3000" --eval "$2" 2>&1 | tr '\n' ' ' | sed 's/ *$//'; echo; }

docker rm -f cap-m1 cap-m2 cap-m3 >/dev/null 2>&1
docker network create $NET >/dev/null 2>&1
for i in 1 2 3; do
  docker run -d --name cap-m$i --hostname cap-m$i --network $NET $IMG --replSet rs --bind_ip_all >/dev/null
done
sleep 3
m cap-m1 'rs.initiate({_id:"rs",members:[{_id:0,host:"cap-m1:27017",priority:2},{_id:1,host:"cap-m2:27017"},{_id:2,host:"cap-m3:27017"}]}).ok' >/dev/null
until [ "$(m cap-m1 'db.hello().isWritablePrimary')" = "true" ]; do sleep 1; done
until [ "$(m cap-m1 'rs.status().members.filter(x=>x.stateStr=="SECONDARY").length')" = "2" ]; do sleep 1; done
echo "[$(ts)] version: $(m cap-m1 'db.version()') primary: $(m cap-m1 'db.hello().primary')"
echo "[$(ts)] insert k v=1 w:majority: $(m cap-m1 'JSON.stringify(db.c.insertOne({_id:"k",v:1},{writeConcern:{w:"majority"}}))')"
sleep 1

echo "[$(ts)] PARTITION: disconnect cap-m1 (primary) from the network"
docker network disconnect $NET cap-m1
T0=$(date +%s)

echo "--- minority side (cap-m1), right after the cut"
echo "[$(ts)] m1 hello: $(m cap-m1 'const h=db.hello(); "isWritablePrimary="+h.isWritablePrimary')"
echo "[$(ts)] m1 update v=2 w:1: $(m cap-m1 'try{JSON.stringify(db.c.updateOne({_id:"k"},{$set:{v:2}},{writeConcern:{w:1}}))}catch(e){e.codeName||e.message}')"
echo "[$(ts)] m1 read readConcern local: $(m cap-m1 'JSON.stringify(db.c.findOne({_id:"k"}))')"
echo "[$(ts)] m1 read readConcern majority: $(m cap-m1 'JSON.stringify(db.c.find({_id:"k"}).readConcern("majority").toArray())')"
echo "[$(ts)] m1 read readConcern linearizable (maxTimeMS 4000): $(m cap-m1 'try{JSON.stringify(db.runCommand({find:"c",filter:{_id:"k"},readConcern:{level:"linearizable"},maxTimeMS:4000}).cursor.firstBatch)}catch(e){e.codeName||e.message}')"
echo "[$(ts)] m1 update v=99 w:majority wtimeout 3000: $(m cap-m1 'try{JSON.stringify(db.c.updateOne({_id:"k"},{$set:{v:99}},{writeConcern:{w:"majority",wtimeout:3000}}))}catch(e){(e.codeName||"")+" "+(e.writeConcernError?JSON.stringify(e.writeConcernError.codeName):"")}')"

echo "--- majority side (cap-m2, cap-m3)"
until [ "$(m cap-m2 'db.hello().isWritablePrimary')" = "true" ] || [ "$(m cap-m3 'db.hello().isWritablePrimary')" = "true" ]; do sleep 0.5; done
if [ "$(m cap-m2 'db.hello().isWritablePrimary')" = "true" ]; then NP=cap-m2; else NP=cap-m3; fi
echo "[$(ts)] new primary $NP elected $(( $(date +%s) - T0 )) s after the cut"
echo "[$(ts)] $NP update v=3 w:majority: $(m $NP 'JSON.stringify(db.c.updateOne({_id:"k"},{$set:{v:3}},{writeConcern:{w:"majority"}}))')"
echo "[$(ts)] $NP read linearizable: $(m $NP 'JSON.stringify(db.runCommand({find:"c",filter:{_id:"k"},readConcern:{level:"linearizable"},maxTimeMS:4000}).cursor.firstBatch)')"

echo "--- minority side again"
until [ "$(m cap-m1 'db.hello().isWritablePrimary')" = "false" ]; do sleep 0.5; done
echo "[$(ts)] m1 stepped down $(( $(date +%s) - T0 )) s after the cut: $(m cap-m1 'const h=db.hello(); "isWritablePrimary="+h.isWritablePrimary+" secondary="+h.secondary')"
echo "[$(ts)] m1 write w:1: $(m cap-m1 'try{JSON.stringify(db.c.insertOne({_id:"z"},{writeConcern:{w:1}}))}catch(e){e.codeName||e.message}')"
echo "[$(ts)] m1 read secondaryPreferred local: $(m cap-m1 'db.getMongo().setReadPref("secondaryPreferred"); JSON.stringify(db.c.findOne({_id:"k"}))')"
echo "[$(ts)] m1 read secondaryPreferred majority: $(m cap-m1 'db.getMongo().setReadPref("secondaryPreferred"); JSON.stringify(db.c.find({_id:"k"}).readConcern("majority").toArray())')"
echo "[$(ts)] m1 linearizable read: $(m cap-m1 'try{JSON.stringify(db.runCommand({find:"c",filter:{_id:"k"},readConcern:{level:"linearizable"},maxTimeMS:4000}))}catch(e){e.codeName||e.message}')"
echo "[$(ts)] (same instant) majority side value: $(m $NP 'JSON.stringify(db.c.findOne({_id:"k"}))')"

echo "--- heal"
docker network connect $NET cap-m1
until [ "$(m cap-m1 'db.hello().secondary')" = "true" ] && [ "$(m cap-m1 'JSON.stringify(db.c.findOne({_id:"k"}))')" = '{"_id":"k","v":3}' ]; do sleep 1; done
echo "[$(ts)] m1 after heal: $(m cap-m1 'JSON.stringify(db.c.findOne({_id:"k"}))')"
echo "[$(ts)] m1 rollback files: $(docker exec cap-m1 bash -c 'find /data/db/rollback -name "*.bson" 2>/dev/null | wc -l')"
echo "[$(ts)] m1 log rollback lines: $(docker logs cap-m1 2>&1 | grep -c '"c":"ROLLBACK"')"

docker rm -f cap-m1 cap-m2 cap-m3 >/dev/null 2>&1
docker network rm $NET >/dev/null 2>&1
echo "[$(ts)] cleaned up"
