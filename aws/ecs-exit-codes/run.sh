#!/usr/bin/env bash
# Reproduces locally, with plain Docker, the exit codes behind ECS stopped-task
# diagnostics: kernel OOM kill vs V8 heap abort vs SIGKILL after a stop timeout.
# Uses the local node:24 image (pulls it if missing). No AWS account involved.
# Every container is named ecs-exit-<pid>-* and removed at the end.
#
# Each case states the expected "<exitCode> <OOMKilled>"; a mismatch prints
# FAIL and the run ends with "N UNEXPECTED" and exit code 1.
set -euo pipefail

IMAGE="${IMAGE:-node:24}"
DIR="$(cd "$(dirname "$0")" && pwd)"
PREFIX="ecs-exit-$$"
UNEXPECTED=0
TOTAL=0

cleanup() {
  docker ps -aq --filter "name=${PREFIX}-" | xargs -r docker rm -f >/dev/null
}
trap cleanup EXIT

report() { # name expected
  local name="$1" expected="$2" actual verdict
  actual=$(docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' "$name")
  TOTAL=$((TOTAL + 1))
  if [ "$actual" = "$expected" ]; then verdict="ok  "; else verdict="FAIL"; UNEXPECTED=$((UNEXPECTED + 1)); fi
  printf '%s %-26s expected=%-10s actual exit=%-4s OOMKilled=%s\n' \
    "$verdict" "${name#${PREFIX}-}" "${expected/ /\/}" "${actual% *}" "${actual#* }"
  docker logs "$name" 2>&1 | grep -E 'heap_size_limit|FATAL|SIGTERM' | head -3 | sed 's/^/       /' || true
}

run_until_exit() { # name expected memory [--init] node-args...
  local name="$PREFIX-$1" expected="$2" mem="$3"; shift 3
  local init=()
  if [ "${1:-}" = "--init" ]; then init=(--init); shift; fi
  docker run -d --name "$name" -m "$mem" --memory-swap "$mem" "${init[@]}" \
    -v "$DIR/workload.js:/w.js:ro" "$IMAGE" node "$@" >/dev/null
  docker wait "$name" >/dev/null
  report "$name" "$expected"
}

run_and_stop() { # name expected stop-timeout mode [extra docker-run flags...]
  local name="$PREFIX-$1" expected="$2" t="$3" mode="$4"; shift 4
  docker run -d --name "$name" -m 256m "$@" -v "$DIR/workload.js:/w.js:ro" "$IMAGE" node /w.js "$mode" >/dev/null
  sleep 2
  local start took
  start=$(date +%s)
  docker stop -t "$t" "$name" >/dev/null
  took=$(( $(date +%s) - start ))
  report "$name" "$expected"
  echo "       docker stop -t $t took ${took}s"
}

echo "docker $(docker version --format '{{.Server.Version}}'), image $IMAGE ($(docker run --rm "$IMAGE" node -v))"

# Memory limit hit outside the V8 heap: kernel OOM killer, SIGKILL.
run_until_exit offheap-512m            "137 true"  512m /w.js offheap
# V8 heap limit (default, about half of the cgroup limit) hit first: V8 aborts.
# As PID 1 the abort ends as exit 139 here; under an init process it is 134 (SIGABRT).
run_until_exit heap-default-512m       "139 false" 512m /w.js heap
run_until_exit heap-default-512m-init  "134 false" 512m --init /w.js heap
# Heap limit set above the container limit: the kernel kills before V8 notices.
run_until_exit heap-maxold1024-in-256m "137 true"  256m --max-old-space-size=1024 /w.js heap
# Stop path, as ECS does it: SIGTERM, then SIGKILL after stopTimeout.
run_and_stop   ignore-term-stop-t2     "137 false" 2  ignore-term
run_and_stop   graceful-stop-t10       "0 false"   10 graceful
# Node as PID 1 without a SIGTERM handler: the kernel does not apply the default
# action to PID 1, so SIGTERM is ignored and only SIGKILL ends it.
run_and_stop   no-handler-stop-t10     "137 false" 10 no-handler
# --init is what ECS initProcessEnabled maps to: node is no longer PID 1.
run_and_stop   no-handler-init-t10     "143 false" 10 no-handler --init

if [ "$UNEXPECTED" -eq 0 ]; then
  echo "ALL AS EXPECTED   ($TOTAL of $TOTAL)"
else
  echo "$UNEXPECTED UNEXPECTED   (of $TOTAL)"
  exit 1
fi
