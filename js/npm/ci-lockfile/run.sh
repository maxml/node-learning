#!/usr/bin/env bash
# What `npm install` and `npm ci` do with package-lock.json.
# Uses only `semver` (no install scripts) in a throwaway temp dir.
set -u
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"
# private cache inside the temp dir: step 6 must not clear (or be served by) your real ~/.npm cache
Q="--ignore-scripts --no-audit --no-fund --cache $WORK/.npm-cache"
locked() { node -p "require('./package-lock.json').packages['node_modules/semver'].version"; }
declared() { node -p "require('./package.json').dependencies.semver"; }

cat > package.json <<'JSON'
{ "name": "ci-demo", "version": "1.0.0", "private": true }
JSON

echo "== 1. npm install semver@7.7.0: what gets saved =="
npm install semver@7.7.0 $Q >/dev/null 2>&1
echo "package.json: \"$(declared)\"   lock: $(locked)   lockfileVersion: $(node -p "require('./package-lock.json').lockfileVersion")"

echo
echo "== 2. lock satisfies the range: npm ci installs exactly the lock (7.7.0), not the newest ^7 =="
rm -rf node_modules
npm ci $Q >/dev/null 2>&1; echo "npm ci exit=$?  installed: $(node -p "require('semver/package.json').version")"

echo
echo "== 3. npm install with no lock: resolves the range afresh to the newest match =="
rm -rf node_modules package-lock.json
npm install $Q >/dev/null 2>&1
echo "package.json: \"$(declared)\"   lock now: $(locked)"

echo
echo "== 4. package.json edited by hand to a range the lock does not satisfy =="
node -e "const f='./package.json',p=require(f);p.dependencies.semver='~7.6.0';require('fs').writeFileSync(f,JSON.stringify(p,null,2))"
echo "package.json: \"$(declared)\"   lock: $(locked)"
cp package-lock.json lock.before
npm ci $Q 2>&1 | grep -E "npm error (code|\`npm ci\` can only|Invalid|Missing)" | head -4
echo "npm ci exit=${PIPESTATUS[0]}   lock changed by npm ci: $(cmp -s lock.before package-lock.json && echo no || echo yes)"

echo
echo "== 5. same state, npm install: no error, silently rewrites the lock =="
npm install $Q >/dev/null 2>&1; echo "npm install exit=$?   lock now: $(locked)"

echo
echo "== 6. integrity: tamper with the lock hash, npm ci refuses the tarball =="
rm -rf node_modules
rm -rf "$WORK/.npm-cache"   # force a fresh download so the hash is checked against the registry tarball
node -e "const f='./package-lock.json',l=require(f);const e=l.packages['node_modules/semver'];e.integrity='sha512-'+Buffer.alloc(64,1).toString('base64');require('fs').writeFileSync(f,JSON.stringify(l,null,2))"
npm ci $Q 2>&1 | grep -E "npm error code|EINTEGRITY|integrity checksum failed" | head -2
echo "npm ci exit=${PIPESTATUS[0]}"
