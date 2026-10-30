#!/usr/bin/env bash
# Who runs a dependency's install scripts, and in what order.
# The "dependency" is a LOCAL tarball built here with `npm pack`; nothing is
# published and no third-party package with scripts is installed.
# Every script only appends a line to $DEMO_LOG and reports whether it could
# see a fake secret from the environment (the point: scripts inherit your env).
#
# Usage: bash run.sh            -> uses the npm on PATH
#        NPM12=12.2.1 bash run.sh -> also runs the same cases with npm@12.2.1 via npx
set -u
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
export DEMO_LOG="$WORK/log.txt"
export SECRET_TOKEN="fake-ci-token"
Q="--no-audit --no-fund --cache $WORK/.npm-cache"

hook() { # $1 = label; a node one-liner that logs and checks the env
  echo "node -e \\\"require('fs').appendFileSync(process.env.DEMO_LOG, '$1 ' + (process.env.SECRET_TOKEN ? 'saw SECRET_TOKEN' : 'no env') + '\\\\n')\\\""
}

# --- the dependency: a local package with every install-time hook
mkdir -p "$WORK/dep"
cat > "$WORK/dep/package.json" <<JSON
{
  "name": "local-hooked-dep",
  "version": "1.0.0",
  "scripts": {
    "preinstall":  "$(hook dep:preinstall)",
    "install":     "$(hook dep:install)",
    "postinstall": "$(hook dep:postinstall)",
    "prepare":     "$(hook dep:prepare)"
  }
}
JSON
( cd "$WORK/dep" && npm pack --ignore-scripts --pack-destination "$WORK" $Q >/dev/null 2>&1 )

# --- the app: depends on the tarball, has its own root lifecycle scripts
make_app() {
  rm -rf "$WORK/app"; mkdir -p "$WORK/app"
  cat > "$WORK/app/package.json" <<JSON
{
  "name": "app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "preinstall":  "$(hook root:preinstall)",
    "postinstall": "$(hook root:postinstall)",
    "prepare":     "$(hook root:prepare)",
    "pretest":     "$(hook root:pretest)",
    "test":        "$(hook root:test)",
    "posttest":    "$(hook root:posttest)"
  },
  "dependencies": { "local-hooked-dep": "file:../local-hooked-dep-1.0.0.tgz" }
}
JSON
}

run_case() { # $1 = title, rest = command run inside the app dir
  local title="$1"; shift
  : > "$DEMO_LOG"
  ( cd "$WORK/app" && "$@" >"$WORK/out.txt" 2>&1 ); local rc=$?
  echo "-- $title (exit $rc)"
  if [ -s "$DEMO_LOG" ]; then sed 's/^/   /' "$DEMO_LOG"; else echo "   (no scripts ran)"; fi
  grep -iE "allowScripts" "$WORK/out.txt" | head -1 | sed 's/^/   npm says: /'
}

suite() { # $1 = npm command (e.g. "npm" or "npx -y npm@12.2.1")
  local NPM="$1"
  echo "== $($NPM -v 2>/dev/null | tail -1) =="
  make_app
  run_case "npm install"                    $NPM install $Q
  run_case "npm ci (lockfile present)"      $NPM ci $Q
  run_case "npm ci --ignore-scripts"        $NPM ci --ignore-scripts $Q
  run_case "npm test (pre/post hooks)"      $NPM test
  run_case "npm test --ignore-scripts"      $NPM test --ignore-scripts
  echo
}

suite npm
if [ -n "${NPM12:-}" ]; then
  suite "npx -y npm@$NPM12"
  echo "== npm@$NPM12: approve the dependency, then rebuild =="
  ( cd "$WORK/app" && npx -y "npm@$NPM12" install-scripts ls $Q 2>&1 | grep -E "allowScripts|^Run" | sed 's/^/   ls: /' )
  ( cd "$WORK/app" && npx -y "npm@$NPM12" install-scripts approve local-hooked-dep $Q >/dev/null 2>&1 )
  echo "   allowScripts in package.json: $(node -p "JSON.stringify(require('$WORK/app/package.json').allowScripts)")"
  run_case "npm rebuild after approve"     npx -y "npm@$NPM12" rebuild $Q
  run_case "npm ci after approve"          npx -y "npm@$NPM12" ci $Q
fi
