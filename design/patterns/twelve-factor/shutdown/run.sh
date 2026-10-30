#!/usr/bin/env bash
# How long does `docker stop` take, and with what exit code, for different ways of
# starting Node in a container? Requires Docker and the `node:24` image.
# Run from this directory: `bash run.sh`
set -euo pipefail
IMG=node:24
DIR="$(cd "$(dirname "$0")" && pwd)"

variant() {
  local name="$1"; shift
  local id
  id=$(docker run -d -v "$DIR":/app:ro -w /app "$@")
  sleep 1.5
  local pid1
  pid1=$(docker exec "$id" sh -c 'tr "\0" " " </proc/1/cmdline' 2>/dev/null || echo "?")
  local t0 t1
  t0=$(date +%s.%N)
  docker stop "$id" >/dev/null           # SIGTERM, then SIGKILL after 10 s (default)
  t1=$(date +%s.%N)
  local code
  code=$(docker inspect -f '{{.State.ExitCode}}' "$id")
  local saw
  saw=$(docker logs "$id" 2>&1 | grep -c 'SIGTERM received' || true)
  docker rm "$id" >/dev/null
  printf '%-44s stop=%5.1fs exit=%-3s handler_ran=%s  PID1=%s\n' "$name" "$(echo "$t1 - $t0" | bc)" "$code" "$saw" "$pid1"
}

variant "A node as PID 1, no SIGTERM handler"     -e HANDLE_SIGTERM=0 "$IMG" node server.mjs
variant "B node as PID 1, with handler"           -e HANDLE_SIGTERM=1 "$IMG" node server.mjs
variant "C --init (tini), no handler"             --init -e HANDLE_SIGTERM=0 "$IMG" node server.mjs
variant "D npm start as PID 1, handler in node"   -e HANDLE_SIGTERM=1 "$IMG" npm start
variant "E sh -c 'node ...' (shell form), handler" -e HANDLE_SIGTERM=1 "$IMG" sh -c "node server.mjs; echo after"
