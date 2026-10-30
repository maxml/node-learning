#!/bin/sh
# Does installing a dependency run its postinstall script? npm vs npm --ignore-scripts vs pnpm.
# Run inside node:24: sh /ex/supply-chain.sh   (needs network only for `npx pnpm`)
set -e
node --version; echo "npm $(npm --version)"; echo "pnpm $(npx -y pnpm@latest --version)"

# a "malicious" dependency packed as a tarball, like it would come from the registry
mkdir -p /w/dep && cd /w/dep
cat > package.json <<'EOF'
{ "name": "innocent-dep", "version": "1.0.0",
  "scripts": { "postinstall": "node -e \"require('fs').writeFileSync('/tmp/PWNED-'+process.env.npm_config_user_agent.split('/')[0], process.env.HOME||'')\"" } }
EOF
npm pack --silent >/dev/null
TGZ=/w/dep/innocent-dep-1.0.0.tgz

try() {  # $1 = label, $2.. = install command
  label=$1; shift
  rm -rf /w/app /tmp/PWNED-*; mkdir -p /w/app && cd /w/app
  echo "{ \"name\": \"app\", \"version\": \"1.0.0\", \"dependencies\": { \"innocent-dep\": \"file:$TGZ\" } }" > package.json
  "$@" > /w/log 2>&1 || true
  if ls /tmp/PWNED-* >/dev/null 2>&1; then r="postinstall RAN ($(ls /tmp/PWNED-*))"; else r="postinstall did NOT run"; fi
  echo "$label: $r"
  grep -iE "ignored|build script|approve" /w/log | head -3 | sed 's/^/    | /' || true
}

try "npm install"                  npm install --no-audit --no-fund
try "npm install --ignore-scripts" npm install --no-audit --no-fund --ignore-scripts
try "npm ci (after lock)"          sh -c 'npm install --ignore-scripts --no-audit --no-fund >/dev/null && rm -rf node_modules /tmp/PWNED-* && npm ci --no-audit --no-fund'
try "pnpm install"                 npx -y pnpm@latest install
