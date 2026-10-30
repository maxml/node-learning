#!/usr/bin/env bash
# SSRF bypass demo. Run from this directory:  bash run.sh
# Builds a docker network with an internal "admin" target and a Node 24 fetcher,
# then shows which attacker inputs defeat a naive check and that the pinned check holds.
# Cleans up all containers/networks it creates. Uses only fake secrets.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
NET=ssrf-net
NODE=node:24
PY=python:3.12-slim
FPORT=18080

cleanup() {
  docker rm -f ssrf-target ssrf-fetcher ssrf-fetcher-dns ssrf-dns ssrf-public >/dev/null 2>&1
  docker network rm "$NET" >/dev/null 2>&1
}
cleanup
trap cleanup EXIT

echo "== node version =="
docker run --rm "$NODE" node -v

docker network create "$NET" >/dev/null

# internal target + a public redirector, both Node
docker run -d --name ssrf-target --network "$NET" --network-alias internal-admin \
  -v "$HERE":/app -w /app "$NODE" node target.js >/dev/null
docker run -d --name ssrf-public --network "$NET" --network-alias public-site \
  -v "$HERE":/app -w /app "$NODE" node target.js >/dev/null
sleep 1
TIP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ssrf-target)
echo "internal target ip = $TIP"
# decimal form of the target IPv4
DEC=$(python3 -c "import sys;a=[int(x) for x in '$TIP'.split('.')];print(a[0]<<24|a[1]<<16|a[2]<<8|a[3])")
echo "decimal form       = $DEC"

# fetcher on default docker DNS
docker run -d --name ssrf-fetcher --network "$NET" -p $FPORT:8080 \
  -v "$HERE":/app -w /app "$NODE" node fetcher.js >/dev/null
sleep 1

q() { echo; echo ">>> $1"; curl -s "http://127.0.0.1:$FPORT$2" --data-urlencode "url=$3" -G; echo; }

echo; echo "===== NAIVE string-blocklist check ====="
q "naive: direct internal hostname (expect BLOCKED)" /naive "http://internal-admin/"
q "naive: direct 127.0.0.1 (expect BLOCKED)"          /naive "http://127.0.0.1/"
q "naive: BYPASS via decimal IP of target"            /naive "http://$DEC/"
q "naive: BYPASS via open redirect through public-site" /naive "http://public-site/redirect?to=http://internal-admin/"

echo; echo "===== SAFE resolve-once + pinned-IP check ====="
q "safe: decimal IP of target (expect BLOCKED)"       /safe  "http://$DEC/"
q "safe: direct internal hostname (expect BLOCKED)"   /safe  "http://internal-admin/"
q "safe: IPv6-mapped loopback (expect BLOCKED)"       /safe  "http://[::ffff:127.0.0.1]/"
q "safe: redirect through public-site (expect BLOCKED at check)" /safe "http://public-site/redirect?to=http://internal-admin/"

echo; echo "===== DNS REBINDING (TOCTOU) ====="
# dns server: 1st A answer public, 2nd internal. INTERNAL_IP = the target's docker ip.
docker run -d --name ssrf-dns --network "$NET" --network-alias dnsr \
  -e REBIND_NAME=rebind.test -e PUBLIC_IP=192.0.2.1 -e INTERNAL_IP="$TIP" \
  -v "$HERE":/app -w /app "$PY" python3 -I dns_rebind.py >/dev/null
sleep 1
DNSIP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ssrf-dns)
echo "rebinding dns ip = $DNSIP (public=192.0.2.1 internal=$TIP)"
# fetcher that uses our DNS server as resolver
docker run -d --name ssrf-fetcher-dns --network "$NET" -p $((FPORT+1)):8080 \
  --dns "$DNSIP" -v "$HERE":/app -w /app "$NODE" node fetcher.js >/dev/null
sleep 1
q2() { echo; echo ">>> $1"; curl -s "http://127.0.0.1:$((FPORT+1))$2" --data-urlencode "url=$3" -G; echo; }
q2 "resolvecheck: validate-IP-then-fetch, rebind name (expect BYPASS: checked public, connected internal)" /resolvecheck "http://rebind.test/"
docker restart ssrf-dns >/dev/null; sleep 1
q2 "safe: pinned, rebind name (expect BLOCKED/no internal secret)" /safe "http://rebind.test/"
echo; echo "dns server log:"; docker logs ssrf-dns 2>&1 | tail -n 20

echo; echo "== done; cleaning up =="
