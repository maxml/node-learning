#!/usr/bin/env bash
# Phantom dependency: the app declares only `debug`, but imports `ms`,
# which is debug's own dependency. npm hoists `ms` to the top of node_modules,
# so the import works by accident. pnpm's isolated layout does not hoist it.
#
# Both packages are well known and have no install scripts; --ignore-scripts anyway.
# Everything happens in a throwaway temp dir.
set -u
PNPM_VERSION="${PNPM_VERSION:-12.16.1}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

make_app() {
  mkdir -p "$1"
  cat > "$1/package.json" <<'JSON'
{
  "name": "phantom-demo",
  "version": "1.0.0",
  "private": true,
  "dependencies": { "debug": "4.4.3" }
}
JSON
  cat > "$1/index.js" <<'JS'
// `ms` is NOT in package.json: it is a dependency of `debug`
try {
  const ms = require('ms');
  console.log('require("ms") OK ->', ms('2h'), 'ms; resolved from', require.resolve('ms').replace(process.cwd(), '.'));
} catch (e) {
  console.log('require("ms") FAILED ->', e.code);
}
JS
}

echo "== npm $(npm -v): flat (hoisted) node_modules =="
make_app "$WORK/npm"
( cd "$WORK/npm" && npm install --ignore-scripts --no-audit --no-fund >/dev/null 2>&1 \
  && ls node_modules && node index.js && npm ls ms )

echo
echo "== npm --install-strategy=linked: npm's own isolated layout (node_modules/.store) =="
make_app "$WORK/npm-linked"
( cd "$WORK/npm-linked" && npm install --ignore-scripts --no-audit --no-fund --install-strategy=linked >/dev/null 2>&1 \
  && ls -A node_modules && node index.js )

echo
echo "== pnpm $PNPM_VERSION: isolated node_modules (symlinks into a content-addressed store) =="
make_app "$WORK/pnpm"
( cd "$WORK/pnpm" && npx -y "pnpm@$PNPM_VERSION" install --ignore-scripts --config.store-dir="$WORK/store" >/dev/null 2>&1 \
  && ls -A node_modules && echo "debug -> $(readlink node_modules/debug)" \
  && echo "siblings visible to debug: $(ls node_modules/.pnpm/debug@4.4.3/node_modules | tr '\n' ' ')" \
  && echo "ms -> $(readlink node_modules/.pnpm/debug@4.4.3/node_modules/ms)" \
  && node index.js )

echo
echo "== pnpm with node-linker=hoisted (npm-compatible layout): the phantom comes back =="
make_app "$WORK/pnpm-hoisted"
( cd "$WORK/pnpm-hoisted" && npx -y "pnpm@$PNPM_VERSION" install --ignore-scripts --config.node-linker=hoisted --config.store-dir="$WORK/store" >/dev/null 2>&1 \
  && node index.js )
