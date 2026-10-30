#!/usr/bin/env bash
# Compose for local development, measured:
#   1. depends_on: service_healthy vs service_started (the startup race)
#   2. service DNS on the project network vs the default bridge
#   3. the node_modules trap of a bind mount, and the anonymous-volume fix
#   4. profiles
#   5. compose watch: a source edit reaches the running container without rebuild
#   6. .env (interpolation) vs env_file (container environment)
# The project is copied to a temp dir first, so the repo is never modified.
# Project name kbdock-compose; `down -v --rmi local` removes containers, network,
# volume and the built app image on exit.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d -t kbdock-compose-XXXXXX)"
cp -r "$SRC/." "$TMP/"
cd "$TMP"
cp dotenv.example .env
DC=(docker compose -p kbdock-compose)
WATCH_PID=""
cleanup() {
  [ -n "$WATCH_PID" ] && kill "$WATCH_PID" 2>/dev/null || true
  "${DC[@]}" --profile tools down -v --rmi local --remove-orphans >/dev/null 2>&1 || true
  docker rm -f kbdock-compose-probe >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "docker $(docker version --format '{{.Server.Version}}'), $(docker compose version)"
echo

# ------------------------------------------------------------------ 1
echo "== 1. startup order"
"${DC[@]}" build -q app
t0=$(date +%s)
"${DC[@]}" up -d --wait >/dev/null 2>&1
echo "service_healthy: up --wait took $(( $(date +%s) - t0 ))s"
"${DC[@]}" ps --format '   {{.Service}} {{.Status}}'
echo "   app log: $("${DC[@]}" logs app --no-log-prefix | head -1)"
"${DC[@]}" down -v >/dev/null 2>&1

# On this host mongo:9 and redis accept connections within ~1 s of start, so the
# race rarely shows with the real images. A dependency that needs 4 s to become
# ready (recovery, migrations, a cold cloud emulator) makes it deterministic.
cat > compose.slow.yaml <<'YAML'
services:
  redis:
    command: ["sh", "-c", "sleep 4 && exec redis-server"]
YAML
t0=$(date +%s)
"${DC[@]}" -f compose.yaml -f compose.slow.yaml up -d --wait >/dev/null 2>&1
echo "service_healthy, redis needs 4 s: up --wait took $(( $(date +%s) - t0 ))s;" \
     "app log: $("${DC[@]}" logs app --no-log-prefix | head -1)"
"${DC[@]}" down -v >/dev/null 2>&1

cat > compose.race.yaml <<'YAML'
services:
  app:
    depends_on:
      mongo: !override
        condition: service_started
      redis: !override
        condition: service_started
YAML
"${DC[@]}" -f compose.yaml -f compose.slow.yaml -f compose.race.yaml up -d >/dev/null 2>&1 || true
sleep 3
echo "service_started, redis needs 4 s: app state=$(docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}}' kbdock-compose-app-1);" \
     "app log: $("${DC[@]}" logs app --no-log-prefix 2>&1 | head -1)"
"${DC[@]}" down -v >/dev/null 2>&1
rm compose.race.yaml compose.slow.yaml
echo

# ------------------------------------------------------------------ 2
echo "== 2. service discovery"
"${DC[@]}" up -d --wait >/dev/null 2>&1
echo "on project network: $("${DC[@]}" exec -T app getent hosts mongo | awk '{print "mongo -> " $1}')"
echo "network: $(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' kbdock-compose-app-1)"
echo "on default bridge:  $(docker run --rm --name kbdock-compose-probe node:24-slim getent hosts mongo || echo 'mongo -> not resolvable')"
echo

# ------------------------------------------------------------------ 3
echo "== 3. bind mount over /app (node_modules live only in the image)"
"${DC[@]}" stop app >/dev/null 2>&1
out=$("${DC[@]}" run --rm --no-deps -v "$TMP/app:/app" app 2>&1 || true)
echo "bind mount only:            $(echo "$out" | grep -o "Cannot find package '[^']*'" | head -1)"
out=$("${DC[@]}" run --rm --no-deps -v "$TMP/app:/app" -v /app/node_modules app timeout 3 node src/index.js 2>&1 || true)
echo "bind mount + anon volume:   $(echo "$out" | grep -E 'deps|Cannot find' | head -1)"
echo

# ------------------------------------------------------------------ 4
echo "== 4. profiles"
echo "services without --profile: $("${DC[@]}" config --services | sort | tr '\n' ' ')"
echo "services with --profile tools: $("${DC[@]}" --profile tools config --services | sort | tr '\n' ' ')"
echo "seed run: $("${DC[@]}" --profile tools run --rm seed 2>/dev/null | tail -1)"
echo

# ------------------------------------------------------------------ 5
echo "== 5. compose watch"
"${DC[@]}" up -d --wait app >/dev/null 2>&1
"${DC[@]}" watch --no-up > "$TMP/watch.log" 2>&1 &
WATCH_PID=$!
sleep 4
echo "// watched-edit-$$" >> app/src/index.js
synced=no
for _ in $(seq 1 20); do
  if "${DC[@]}" exec -T app grep -q "watched-edit-$$" /app/src/index.js 2>/dev/null; then synced=yes; break; fi
  sleep 0.5
done
echo "edit visible inside running container: $synced"
echo "image rebuilt: $(grep -c -i 'rebuild' "$TMP/watch.log" || true) rebuild lines; watch log: $(grep -i -m1 'sync' "$TMP/watch.log" | cut -c1-90)"
kill "$WATCH_PID" 2>/dev/null || true; WATCH_PID=""
echo

# ------------------------------------------------------------------ 6
echo "== 6. .env vs env_file"
echo "compose.yaml says GREETING: \${GREETING:-hello}; .env sets GREETING=$(grep GREETING .env | cut -d= -f2)"
echo "inside the container: GREETING=$("${DC[@]}" exec -T app printenv GREETING)," \
     "FROM_ENV_FILE=$("${DC[@]}" exec -T app printenv FROM_ENV_FILE)," \
     "APP_PORT=$("${DC[@]}" exec -T app printenv APP_PORT || echo '<unset>')"
echo "published port from .env APP_PORT: $(docker port kbdock-compose-app-1 3000)"
