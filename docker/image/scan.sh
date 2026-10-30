#!/usr/bin/env bash
# Scans the five variants with Trivy (run as a container, pinned by digest) and
# prints vulnerability counts per severity. The numbers are a snapshot of the
# Trivy DB on the day of the run; they change daily, the ranking rarely does.
# Trivy 0.76.1 was chosen deliberately: v0.69.4 and the 0.69.5/0.69.6 Docker Hub
# images were malicious (GHSA-69fq-xp46-6x23, March 2026), so pin the scanner too.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/app"
TMP="$(mktemp -d -t kbdock-scan-XXXXXX)"
P=kbdock-scan
TRIVY=aquasec/trivy:0.76.1@sha256:790fd66d1697395d8693d1acaa1ea702406a20f109b6fc7bac8db623eca6c06c
cleanup() {
  docker images --format '{{.Repository}}:{{.Tag}}' | grep "^${P}:" | xargs -r docker rmi -f >/dev/null
  # the scanner writes its DB cache as root inside the container: remove it from there
  docker run --rm -v "$TMP:/w" --entrypoint sh "$TRIVY" -c 'rm -rf /w/*' >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT
printf '//npm.example.invalid/:_authToken=fake\n' > "$TMP/npmrc"

docker build -q -f "$APP/Dockerfile.naive"      -t "$P:naive"      "$APP" >/dev/null
docker build -q -f "$APP/Dockerfile"            -t "$P:slim"       --secret "id=npmrc,src=$TMP/npmrc" "$APP" >/dev/null
docker build -q -f "$APP/Dockerfile.alpine"     -t "$P:alpine"     "$APP" >/dev/null
docker build -q -f "$APP/Dockerfile.distroless" -t "$P:distroless" "$APP" >/dev/null
docker build -q -f "$APP/Dockerfile.chainguard" -t "$P:chainguard" "$APP" >/dev/null

echo "trivy $(docker run --rm "$TRIVY" --version | head -1)"
printf '%-11s %8s %5s %6s %4s %4s  %s\n' image CRITICAL HIGH MEDIUM LOW UNK "os packages / npm packages with findings"
for tag in naive slim alpine distroless chainguard; do
  docker save "$P:$tag" -o "$TMP/$tag.tar"
  docker run --rm -v "$TMP:/w" "$TRIVY" image --quiet --cache-dir /w/cache \
    --input "/w/$tag.tar" --format json --scanners vuln > "$TMP/$tag.json"
  python3 -I - "$TMP/$tag.json" "$tag" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
sev = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "UNKNOWN": 0}
classes = {}
for r in d.get("Results", []):
    vs = r.get("Vulnerabilities") or []
    for v in vs:
        sev[v["Severity"]] = sev.get(v["Severity"], 0) + 1
    if vs:
        classes[r.get("Class")] = classes.get(r.get("Class"), 0) + len(vs)
os_ = d.get("Metadata", {}).get("OS", {})
print(f'{sys.argv[2]:<11} {sev["CRITICAL"]:>8} {sev["HIGH"]:>5} {sev["MEDIUM"]:>6} {sev["LOW"]:>4} {sev["UNKNOWN"]:>4}  '
      f'{os_.get("Family","?")} {os_.get("Name","")}; by class: {classes}')
PY
  rm -f "$TMP/$tag.tar"
done
