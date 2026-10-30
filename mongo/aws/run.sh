#!/usr/bin/env bash
# Single-node replica set in Docker (container kbaws-mongo, 127.0.0.1:27093), then faas-monitoring.js
# twice: as a normal process and with AWS_EXECUTION_ENV set (driver's FaaS detection).
# Usage: ./run.sh   (needs docker, the mongo:9 image and `npm install` in examples/mongo)
set -uo pipefail

IMG=${IMG:-mongo:9}
NAME=kbaws-mongo
PORT=27093
HERE=$(cd "$(dirname "$0")" && pwd)

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1; return 0; }
trap cleanup EXIT

cleanup
docker run -d --name "$NAME" -p 127.0.0.1:$PORT:$PORT "$IMG" \
  mongod --replSet kbaws --port $PORT --bind_ip_all >/dev/null || exit 1
sleep 4
docker exec "$NAME" mongosh --quiet --port $PORT --eval \
  "rs.initiate({_id:'kbaws',members:[{_id:0,host:'127.0.0.1:$PORT'}]})" >/dev/null
sleep 6

URI="mongodb://127.0.0.1:$PORT/?replicaSet=kbaws"
cd "$HERE/.." || exit 1
node aws/faas-monitoring.js "$URI" normal
AWS_EXECUTION_ENV=AWS_Lambda_nodejs24.x node aws/faas-monitoring.js "$URI" lambda-env
