#!/usr/bin/env bash
# Builds the sample service with five Dockerfiles and measures what the vault note
# "Dockerfile для Node.js" claims: image size per base, what ends up inside,
# layer-cache behaviour, build-context size with and without .dockerignore, and
# whether a build secret leaks into history (ARG) or not (--mount=type=secret).
#
# Every image, container and temp dir is prefixed kbdock- and removed on exit.
# BuildKit's own build cache is not pruned (it is shared with other builds on the
# host); remove it with `docker builder prune` if you want it gone.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/app"
TMP="$(mktemp -d -t kbdock-XXXXXX)"
P=kbdock-img
FAKE_TOKEN="kbdock-fake-token-$$"

cleanup() {
  docker ps -aq --filter "name=${P}-" | xargs -r docker rm -f >/dev/null
  docker images --format '{{.Repository}}:{{.Tag}}' | grep "^${P}:" | xargs -r docker rmi -f >/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT

printf '//npm.example.invalid/:_authToken=%s\n' "$FAKE_TOKEN" > "$TMP/npmrc"
SECRET=(--secret "id=npmrc,src=$TMP/npmrc")

echo "docker $(docker version --format '{{.Server.Version}}'), buildx $(docker buildx version | awk '{print $2}')"
echo

# ---------------------------------------------------------------- 1. sizes
echo "== 1. image size per Dockerfile (uncompressed = docker image inspect .Size; gz = docker save | gzip)"
build() { # tag dockerfile [extra args]
  local tag="$1" file="$2"; shift 2
  local t0 t1
  t0=$(date +%s)
  docker build -q -f "$APP/$file" -t "$P:$tag" "$@" "$APP" >/dev/null
  t1=$(date +%s)
  local size gz layers
  size=$(docker image inspect -f '{{.Size}}' "$P:$tag")
  gz=$(docker save "$P:$tag" | gzip -c | wc -c)
  layers=$(docker image inspect -f '{{len .RootFS.Layers}}' "$P:$tag")
  printf '%-11s %-22s %6d MB  gz %5d MB  layers %2d  build %3ds\n' \
    "$tag" "$file" $((size / 1000000)) $((gz / 1000000)) "$layers" $((t1 - t0))
}
build naive      Dockerfile.naive
build slim       Dockerfile "${SECRET[@]}"
build alpine     Dockerfile.alpine
build distroless Dockerfile.distroless
build chainguard Dockerfile.chainguard
echo

# ---------------------------------------------------------------- 2. contents
echo "== 2. what is inside: user, Node, NODE_ENV, typescript in node_modules?"
for tag in naive slim alpine distroless chainguard; do
  name="$P-$tag"
  docker run -d --name "$name" -p 127.0.0.1::3000 "$P:$tag" >/dev/null
  port=$(docker port "$name" 3000 | head -1 | sed 's/.*://')
  body=""
  for _ in $(seq 1 30); do body=$(curl -fsS "http://127.0.0.1:$port/" 2>/dev/null) && break; sleep 0.3; done
  ts=$(docker run --rm --entrypoint "" "$P:$tag" ls /app/node_modules 2>/dev/null | grep -c '^typescript$' || true)
  [ -z "$ts" ] && ts="n/a"
  # distroless has no ls; check by trying to resolve the module with node itself
  if [ "$tag" = distroless ]; then
    ts=$(docker run --rm "$P:$tag" -e "try{require.resolve('/app/node_modules/typescript');console.log(1)}catch{console.log(0)}")
  fi
  shell=$(docker run --rm --entrypoint sh "$P:$tag" -c 'echo yes' 2>/dev/null || echo no)
  printf '%-11s %s  typescript=%s  shell=%s\n' "$tag" "$body" "$ts" "$shell"
  docker rm -f "$name" >/dev/null
done
echo

# ---------------------------------------------------------------- 3. healthcheck
echo "== 3. HEALTHCHECK of the slim image"
docker run -d --name "$P-health" "$P:slim" >/dev/null
for _ in $(seq 1 40); do
  st=$(docker inspect -f '{{.State.Health.Status}}' "$P-health")
  [ "$st" = healthy ] && break
  sleep 0.5
done
echo "status=$st  last probe exit=$(docker inspect -f '{{(index .State.Health.Log 0).ExitCode}}' "$P-health")"
docker rm -f "$P-health" >/dev/null
echo

# ---------------------------------------------------------------- 4. cache
echo "== 4. layer cache after a source-only edit (which steps re-ran?)"
cp -r "$APP" "$TMP/app"
docker build -q -f "$TMP/app/Dockerfile" -t "$P:cache" "${SECRET[@]}" "$TMP/app" >/dev/null
docker build -q -f "$TMP/app/Dockerfile.naive" -t "$P:cache-naive" "$TMP/app" >/dev/null
echo "// edit $$" >> "$TMP/app/src/server.ts"
echo "-- Dockerfile (lockfile copied before source):"
docker build --progress=plain -f "$TMP/app/Dockerfile" -t "$P:cache" "${SECRET[@]}" "$TMP/app" 2>&1 |
  grep -E '^#[0-9]+ (\[.*npm (ci|run)|CACHED|DONE)' | sed -E 's/^#([0-9]+) /\1 /' |
  awk '/\[/{step[$1]=$0} /CACHED/{c[$1]=1} END{for(k in step){sub(/^[0-9]+ /,"",step[k]); print (c[k]?"CACHED  ":"re-ran  ") step[k]}}' | sort
echo "-- Dockerfile.naive (COPY . . before npm install):"
echo "// edit2 $$" >> "$TMP/app/src/server.ts"
docker build --progress=plain -f "$TMP/app/Dockerfile.naive" -t "$P:cache-naive" "$TMP/app" 2>&1 |
  grep -E '^#[0-9]+ (\[.*npm (install|run)|CACHED|DONE)' | sed -E 's/^#([0-9]+) /\1 /' |
  awk '/\[/{step[$1]=$0} /CACHED/{c[$1]=1} END{for(k in step){sub(/^[0-9]+ /,"",step[k]); print (c[k]?"CACHED  ":"re-ran  ") step[k]}}' | sort
echo

# ---------------------------------------------------------------- 5. context
echo "== 5. build context with junk node_modules (120 MB) and .git (30 MB)"
mkdir -p "$TMP/app/node_modules/junk" "$TMP/app/.git"
head -c 120000000 /dev/urandom > "$TMP/app/node_modules/junk/blob"
head -c 30000000 /dev/urandom > "$TMP/app/.git/blob"
# BuildKit sends the context incrementally and only the paths that COPY/ADD use,
# so the number printed is what THIS build had to transfer.
ctx() { # dockerfile
  docker build --no-cache --progress=plain -f "$TMP/app/$1" -t "$P:ctx" "${SECRET[@]}" "$TMP/app" 2>&1 |
    grep -E 'transferring context: [0-9.]+[kMG]?B .*done' | tail -1 | sed -E 's/.*transferring context: ([^ ]+).*/\1/'
}
for f in Dockerfile Dockerfile.naive; do
  echo "$f with .dockerignore:    sent $(ctx "$f")"
  mv "$TMP/app/.dockerignore" "$TMP/app/dockerignore.off"
  echo "$f without .dockerignore: sent $(ctx "$f")"
  mv "$TMP/app/dockerignore.off" "$TMP/app/.dockerignore"
done
echo

# ---------------------------------------------------------------- 6. secrets
echo "== 6. private-registry token: ARG vs BuildKit secret"
docker build -q -f "$APP/Dockerfile.argleak" -t "$P:argleak" --build-arg "NPM_TOKEN=$FAKE_TOKEN" "$APP" >/dev/null 2>&1
echo "ARG:    docker history hits = $(docker history --no-trunc "$P:argleak" | grep -c "$FAKE_TOKEN" || true)"
echo "        $(docker history --no-trunc --format '{{.CreatedBy}}' "$P:argleak" | grep -o "NPM_TOKEN=$FAKE_TOKEN" | head -1)"
echo "secret: docker history hits = $(docker history --no-trunc "$P:slim" | grep -c "$FAKE_TOKEN" || true)," \
     "hits in docker save = $(docker save "$P:slim" | grep -a -c "$FAKE_TOKEN" || true)"
echo

# ---------------------------------------------------------------- 7. tag vs digest
echo "== 7. ENV NODE_ENV=production set before the build stage's npm ci"
docker run --rm -e NODE_ENV=production -v "$APP:/s:ro" node:24-slim sh -c \
  'cp /s/package.json /s/package-lock.json /tmp/ && cd /tmp && npm ci --ignore-scripts --no-audit --no-fund >/dev/null 2>&1;
   echo "node_modules: $(ls node_modules | tr "\n" " ")"; npx --no-install tsc -v >/dev/null 2>&1 && echo "tsc: found" || echo "tsc: NOT found (devDependencies omitted)"'
echo

echo "== 8. a tag is a pointer, a digest is content"
echo "node:24-slim now resolves to $(docker buildx imagetools inspect node:24-slim --format '{{.Manifest.Digest}}')"
echo "Dockerfile pins            $(grep -o 'sha256:[0-9a-f]*' "$APP/Dockerfile" | head -1)"
echo

# ---------------------------------------------------------------- 9. apt cache
echo "== 9. apt-get install curl on node:24-slim: where the package lists end up"
mkdir -p "$TMP/apt"
BASE=$(grep -o 'node:24-slim@sha256:[0-9a-f]*' "$APP/Dockerfile" | head -1)
apt_case() { # tag run-lines...
  local tag="$1"; shift
  { echo "FROM $BASE"; printf '%s\n' "$@"; } > "$TMP/apt/Dockerfile.$tag"
  docker build -q -f "$TMP/apt/Dockerfile.$tag" -t "$P:apt-$tag" "$TMP/apt" >/dev/null
  printf '%-34s %4d MB  (+%d MB over the base)\n' "$tag" \
    $(( $(docker image inspect -f '{{.Size}}' "$P:apt-$tag") / 1000000 )) \
    $(( ($(docker image inspect -f '{{.Size}}' "$P:apt-$tag") - $(docker image inspect -f '{{.Size}}' "$BASE")) / 1000000 ))
}
apt_case same-run-cleanup \
  'RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*'
apt_case no-cleanup \
  'RUN apt-get update && apt-get install -y --no-install-recommends curl'
apt_case cleanup-in-later-run \
  'RUN apt-get update && apt-get install -y --no-install-recommends curl' 'RUN rm -rf /var/lib/apt/lists/*'
apt_case with-recommends-and-cleanup \
  'RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*'
echo

# ---------------------------------------------------------------- 10. lint
echo "== 10. docker build --check (Dockerfile linter built into BuildKit)"
for f in Dockerfile Dockerfile.naive Dockerfile.argleak; do
  printf '%-20s %s\n' "$f" "$(docker build --check -f "$APP/$f" "$APP" 2>&1 | grep -E '^WARNING|no warnings' | tr '\n' ' ')"
done
printf 'FROM %s\nCMD node server.js\n' "$BASE" > "$TMP/apt/Dockerfile.shellform"
printf '%-20s %s\n' "shell-form CMD" "$(docker build --check -f "$TMP/apt/Dockerfile.shellform" "$TMP/apt" 2>&1 | grep -E '^WARNING|no warnings' | tr '\n' ' ')"
