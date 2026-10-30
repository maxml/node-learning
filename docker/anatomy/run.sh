#!/usr/bin/env bash
# What a container and an image are, seen from the host (Linux, Docker Engine):
#   1. a container is a host process: same kernel, own namespaces, a cgroup
#   2. who started it: dockerd -> containerd -> containerd-shim-runc-v2 (runc has exited)
#   3. the root filesystem is an overlay mount of image layers + one writable layer
#   4. an image is content-addressed JSON: index -> manifest -> config + layers
#   5. multi-platform: one tag, several manifests
# One container (kbdock-anatomy-<pid>) is started and removed on exit.
set -euo pipefail

IMAGE="${IMAGE:-node:24-slim}"
NAME="kbdock-anatomy-$$"
TMP="$(mktemp -d -t kbdock-anatomy-XXXXXX)"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

echo "docker $(docker version --format '{{.Server.Version}}'), containerd $(docker version --format '{{range .Server.Components}}{{if eq .Name "containerd"}}{{.Version}}{{end}}{{end}}'), runc $(docker version --format '{{range .Server.Components}}{{if eq .Name "runc"}}{{.Version}}{{end}}{{end}}')"
echo "storage driver: $(docker info -f '{{.Driver}}'), cgroup v$(docker info -f '{{.CgroupVersion}}')"
echo

docker run -d --name "$NAME" -m 512m --cpus 1.5 "$IMAGE" sleep 300 >/dev/null
PID=$(docker inspect -f '{{.State.Pid}}' "$NAME")

echo "== 1. a container is a process on the host kernel"
echo "host kernel:      $(uname -r)"
echo "container kernel: $(docker exec "$NAME" uname -r)"
echo "inside, PID 1 is: $(docker exec "$NAME" cat /proc/1/comm); on the host the same process is PID $PID: $(ps -o comm= -p "$PID")"
echo "namespaces that differ from the host's PID 1 view (by inode):"
for ns in pid mnt net uts ipc cgroup user; do
  c=$(sudo -n readlink "/proc/$PID/ns/$ns" 2>/dev/null || docker exec "$NAME" readlink "/proc/1/ns/$ns")
  h=$(readlink "/proc/self/ns/$ns")
  printf '   %-6s container %-22s host-shell %-22s %s\n' "$ns" "$c" "$h" "$([ "$c" = "$h" ] && echo SAME || echo own)"
done
echo "cgroup (inside):  $(docker exec "$NAME" cat /proc/self/cgroup)"
echo "memory.max:       $(docker exec "$NAME" cat /sys/fs/cgroup/memory.max)   (= 512 MiB)"
echo "cpu.max:          $(docker exec "$NAME" cat /sys/fs/cgroup/cpu.max)   (quota period: 1.5 CPU)"
echo

echo "== 2. the process tree on the host"
PPID_=$(ps -o ppid= -p "$PID" | tr -d ' ')
echo "parent of the container process: $(ps -o comm= -p "$PPID_") (pid $PPID_)"
echo "runc processes alive now: $(pgrep -x runc | wc -l)  (runc creates the container and exits)"
echo

echo "== 3. root filesystem = overlay of image layers + a writable upper layer"
echo "graph driver: $(docker inspect -f '{{.GraphDriver.Name}}' "$NAME")"
lower=$(docker inspect -f '{{.GraphDriver.Data.LowerDir}}' "$NAME" | tr ':' '\n' | wc -l)
echo "lower dirs (read-only): $lower  = image layers $(docker image inspect -f '{{len .RootFS.Layers}}' "$IMAGE") + 1 init layer"
docker exec "$NAME" sh -c 'echo hi > /written-in-container'
echo "file written in the container appears in: $(docker diff "$NAME" | grep written-in-container)  (docker diff = upper layer)"
echo "mount inside: $(docker exec "$NAME" sh -c 'grep " / " /proc/mounts | cut -d" " -f1-3')"
echo

echo "== 4. an image is content-addressed JSON"
docker buildx imagetools inspect --raw "$IMAGE" > "$TMP/index.json"
idx_digest=$(docker buildx imagetools inspect "$IMAGE" --format '{{.Manifest.Digest}}')
echo "index digest from registry: $idx_digest"
echo "sha256 of the index bytes:  sha256:$(sha256sum "$TMP/index.json" | cut -d' ' -f1)"
echo "index mediaType: $(python3 -I -c 'import json,sys;print(json.load(open(sys.argv[1]))["mediaType"])' "$TMP/index.json")"
amd=$(python3 -I -c 'import json,sys
for m in json.load(open(sys.argv[1]))["manifests"]:
    p=m.get("platform",{})
    if p.get("architecture")=="amd64" and p.get("os")=="linux": print(m["digest"]); break' "$TMP/index.json")
docker buildx imagetools inspect --raw "${IMAGE%%:*}@$amd" > "$TMP/manifest.json"
python3 -I -c 'import json,sys
m=json.load(open(sys.argv[1]))
print("linux/amd64 manifest:", m["mediaType"])
print("  config:", m["config"]["digest"][:19]+"…")
tot=sum(l["size"] for l in m["layers"])
print("  layers:", len(m["layers"]), "compressed total", round(tot/1e6,1), "MB")' "$TMP/manifest.json"
echo "local uncompressed size: $(( $(docker image inspect -f '{{.Size}}' "$IMAGE") / 1000000 )) MB"
echo

echo "== 5. one tag, several platforms"
python3 -I -c 'import json,sys
ms=json.load(open(sys.argv[1]))["manifests"]
plats=[m["platform"]["os"]+"/"+m["platform"]["architecture"]+("/"+m["platform"]["variant"] if m["platform"].get("variant") else "") for m in ms]
print(len(ms), "manifests:", ", ".join(plats))' "$TMP/index.json"
set +e
out=$(printf 'FROM %s\n' "$IMAGE" | docker build --platform linux/amd64,linux/arm64 -q - 2>&1)
echo "multi-platform build with the default builder: exit=$? $(echo "$out" | grep -i -m1 'not supported\|error' | cut -c1-200)"
echo "(\"unknown/unknown\" entries above are attestation manifests: provenance / SBOM, not platforms)"
echo

echo "== 6. same image, different runtime (only if gVisor's runsc is registered)"
if docker info -f '{{range $k,$v := .Runtimes}}{{$k}} {{end}}' | grep -qw runsc; then
  echo "runc:  uname -r = $(docker run --rm "$IMAGE" uname -r)"
  echo "runsc: uname -r = $(docker run --rm --runtime=runsc "$IMAGE" uname -r)   (gVisor: a user-space kernel between app and host)"
else
  echo "runsc not registered, skipped"
fi
