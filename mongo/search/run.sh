#!/usr/bin/env bash
# MongoDB Search / Vector Search experiment on the mongodb/mongodb-atlas-local image
# (single-node replica set with mongod + mongot in one container; dev/test only).
# No host ports are published: mongosh runs inside the container.
# Usage: ./run.sh   (removes its container on exit; pass KEEP_IMAGE=0 to also remove the image)
set -uo pipefail

IMG=${IMG:-mongodb/mongodb-atlas-local:latest}
NAME=kbsearch-atlaslocal
HERE=$(cd "$(dirname "$0")" && pwd)

cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1
  if [ "${KEEP_IMAGE:-1}" = "0" ]; then docker rmi "$IMG" >/dev/null 2>&1; fi
  return 0
}
trap cleanup EXIT

docker rm -f "$NAME" >/dev/null 2>&1
docker run -d --name "$NAME" -v "$HERE:/exp:ro" "$IMG" >/dev/null || exit 1

# Wait for the container health check (mongod and mongot up).
for _ in $(seq 1 90); do
  st=$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null)
  [ "$st" = "healthy" ] && break
  sleep 2
done
echo "container health: $st"
docker inspect -f 'image version={{index .Config.Labels "version"}} mongot={{index .Config.Labels "mongot-version"}}' "$NAME"

docker exec "$NAME" mongosh --quiet --norc --file /exp/search.js
