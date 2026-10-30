#!/usr/bin/env bash
# "exports" closes every path it does not list. Adding it to a library that had
# only "main" breaks deep imports. Local packages only, no network.
set -u
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/app/node_modules/lib/internal"
cd "$WORK/app"
echo "module.exports = 'public entry'"   > node_modules/lib/index.js
echo "module.exports = 'internal helper'" > node_modules/lib/internal/helper.js

try() {
  node -e "for (const s of ['lib', 'lib/internal/helper.js']) {
    try { console.log('  require(' + JSON.stringify(s) + ') ->', require(s)) }
    catch (e) { console.log('  require(' + JSON.stringify(s) + ') ->', e.code) } }"
}

echo "== lib@1: only \"main\" =="
echo '{ "name": "lib", "version": "1.0.0", "main": "index.js" }' > node_modules/lib/package.json
try

echo "== lib@2: \"exports\": { \".\": \"./index.js\" } =="
echo '{ "name": "lib", "version": "2.0.0", "main": "index.js", "exports": { ".": "./index.js" } }' > node_modules/lib/package.json
try
