#!/usr/bin/env bash
# Runtime behaviour of Node in a container, measured with plain Docker:
#   A. who receives SIGTERM: node / npm start / shell form / --init
#   B. zombie reaping with and without an init process
#   C. heap limit vs memory limit, per Node major
#   D. CPU limits vs os.availableParallelism()
#   E. read-only root filesystem
# Containers are named kbdock-rt-<pid>-* and removed on exit. No images are built.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE="${IMAGE:-node:24-slim}"
P="kbdock-rt-$$"
cleanup() { docker ps -aq --filter "name=${P}-" | xargs -r docker rm -f >/dev/null; }
trap cleanup EXIT
MNT=(-v "$DIR:/app:ro" -w /app)

echo "docker $(docker version --format '{{.Server.Version}}'), image $IMAGE:" \
     "node $(docker run --rm "$IMAGE" node -v), npm $(docker run --rm "$IMAGE" npm -v)"
echo

# ------------------------------------------------------------------ A. signals
echo "== A. docker stop -t 5 (SIGTERM, SIGKILL after 5 s)"
stop_case() { # label [docker-run flags...] -- command...
  local label="$1"; shift
  local flags=()
  while [ "$1" != "--" ]; do flags+=("$1"); shift; done; shift
  local name="$P-$label"
  docker run -d --name "$name" "${flags[@]}" "${MNT[@]}" "$IMAGE" "$@" >/dev/null
  sleep 2
  local tree
  tree=$(docker exec "$name" sh -c 'for p in /proc/[0-9]*; do [ -r $p/cmdline ] && printf "%s:%s " "${p#/proc/}" "$(tr "\0" " " < $p/cmdline | cut -c1-40)"; done' 2>/dev/null | tr -s ' ')
  local t0 t1
  t0=$(date +%s.%N); docker stop -t 5 "$name" >/dev/null; t1=$(date +%s.%N)
  printf '%-34s exit=%-3s stop took %4.1fs  app saw SIGTERM: %s\n' "$label" \
    "$(docker inspect -f '{{.State.ExitCode}}' "$name")" "$(echo "$t1 - $t0" | bc)" \
    "$(docker logs "$name" 2>&1 | grep -q 'got SIGTERM' && echo yes || echo no)"
  echo "    processes: $tree"
}
stop_case node-pid1-no-handler            -- node w.js no-handler
stop_case node-pid1-handler               -- node w.js handler
stop_case init-no-handler        --init   -- node w.js no-handler
stop_case npm-start-handler               -- npm start
stop_case npm-start-no-handler            -- npm run start:nohandler
stop_case npm-start-exec-handler          -- npm run start:exec
stop_case npm-start-handler-init --init   -- npm start
stop_case shell-form-single               -- sh -c 'node w.js handler'
stop_case shell-form-two-commands         -- sh -c 'node w.js handler; echo after'
# Same two cases on Alpine: /bin/sh there is busybox ash, which execs the last
# command of `sh -c`, so node replaces the shell. Debian's dash does not.
IMAGE_SAVED="$IMAGE"; IMAGE=node:24-alpine
stop_case alpine-npm-start-handler        -- npm start
stop_case alpine-shell-form-single        -- sh -c 'node w.js handler'
IMAGE="$IMAGE_SAVED"
echo

# ------------------------------------------------------------------ B. zombies
echo "== B. orphaned grandchildren (20 x 'sh -c \"sleep 0.2 &\"'), counted after 1.5 s"
for flags in "" "--init"; do
  printf '%-8s ' "${flags:-pid1}"
  docker run --rm $flags "${MNT[@]}" "$IMAGE" node w.js orphans
done
echo

# ------------------------------------------------------------------ C. memory
echo "== C. V8 heap limit vs container memory limit"
for img in node:20-alpine node:22-bookworm-slim "$IMAGE"; do
  for mem in "" 512m 2g; do
    printf '%-22s -m %-5s ' "$img" "${mem:-none}"
    docker run --rm ${mem:+-m $mem} "${MNT[@]}" "$img" node w.js limits
  done
done
printf '%-22s -m %-5s ' "$IMAGE (pct=75)" 512m
docker run --rm -m 512m "${MNT[@]}" "$IMAGE" node --max-old-space-size-percentage=75 w.js limits
echo

# ------------------------------------------------------------------ D. CPU
echo "== D. CPU limits vs os.availableParallelism() (host has $(nproc) CPUs)"
for img in node:20-alpine node:22-bookworm-slim "$IMAGE"; do
  for flags in "" "--cpus=2" "--cpus=0.5" "--cpuset-cpus=0,1"; do
    printf '%-22s %-18s ' "$img" "${flags:-no limit}"
    docker run --rm $flags "${MNT[@]}" "$img" node -p \
      "const os=require('os');'libuv '+process.versions.uv+' availableParallelism='+os.availableParallelism()+' cpus().length='+os.cpus().length"
  done
done
echo

# ------------------------------------------------------------------ E. read-only rootfs
echo "== E. --read-only root filesystem"
printf '%-22s\n' "read-only:"
docker run --rm --read-only "${MNT[@]}" "$IMAGE" node w.js write
printf '%-22s\n' "read-only + tmpfs /tmp:"
docker run --rm --read-only --tmpfs /tmp "${MNT[@]}" "$IMAGE" node w.js write
printf '%-22s\n' "npm start, read-only (exit code and stderr):"
set +e
out=$(docker run --rm --read-only "${MNT[@]}" -e HOME=/nonexistent "$IMAGE" timeout 3 npm run start:nohandler 2>&1)
echo "    exit=$? $(echo "$out" | grep -E 'ready|EROFS|ENOENT|npm (warn|error)' | head -3 | tr '\n' ' ')"
set -e
