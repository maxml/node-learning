#!/usr/bin/env bash
# peerDependencies since npm 7: installed automatically, and a conflict is an error.
# "plugin" is a LOCAL tarball that declares peerDependencies { semver: "^6.0.0" }
# (semver plays the role of the host framework; it has no install scripts).
set -u
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
Q="--ignore-scripts --no-audit --no-fund --cache $WORK/.npm-cache"

mkdir -p "$WORK/plugin"
cat > "$WORK/plugin/package.json" <<'JSON'
{ "name": "local-plugin", "version": "1.0.0", "peerDependencies": { "semver": "^6.0.0" } }
JSON
( cd "$WORK/plugin" && npm pack --pack-destination "$WORK" $Q >/dev/null 2>&1 )

app() { # $1 = dir, $2 = dependencies JSON
  mkdir -p "$WORK/$1"
  echo "{ \"name\": \"$1\", \"version\": \"1.0.0\", \"private\": true, \"dependencies\": $2 }" > "$WORK/$1/package.json"
}

echo "== 1. app depends only on the plugin: npm installs the peer itself =="
app a '{ "local-plugin": "file:../local-plugin-1.0.0.tgz" }'
( cd "$WORK/a" && npm install $Q >/dev/null 2>&1; echo "exit=$?"; npm ls --all 2>/dev/null | tail -n +2;
  node -p "'lock marks it: peer=' + require('./package-lock.json').packages['node_modules/semver'].peer" )

echo
echo "== 2. app pins the host at a version outside the peer range: ERESOLVE =="
app b '{ "local-plugin": "file:../local-plugin-1.0.0.tgz", "semver": "7.8.5" }'
( cd "$WORK/b" && npm install $Q 2>&1 | grep -E "npm error (code|ERESOLVE|Found|Could not resolve|peer semver)" | head -5; echo "exit=${PIPESTATUS[0]}" )

echo
echo "== 3. same app with --legacy-peer-deps: installs, contract silently broken =="
( cd "$WORK/b" && npm install --legacy-peer-deps $Q >/dev/null 2>&1; echo "exit=$?";
  echo "semver actually installed: $(node -p "require('semver/package.json').version") (plugin asked for ^6.0.0)";
  npm ls semver 2>&1 | grep -E "invalid|semver@" | head -3 )
