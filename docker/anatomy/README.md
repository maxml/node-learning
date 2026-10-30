# Anatomy: what a container and an image are

Backs the vault note «Образи та контейнери Docker».

`run.sh` starts one `node:24-slim` container (`-m 512m --cpus 1.5`) and shows, from the host:

1. the container is a host process on the host kernel, with its own namespaces (except `user`)
   and a cgroup carrying the limits;
2. its parent is `containerd-shim`, and no `runc` process stays alive;
3. its root filesystem is an overlay of the 5 image layers + an init layer + a writable layer;
4. the image index is content-addressed: `sha256` of its raw bytes equals the registry digest;
5. one tag holds several platform manifests plus attestation manifests, and a multi-platform build
   fails with the classic `overlay2` image store and the default `docker` builder driver;
6. (if gVisor's `runsc` runtime is registered) the same image sees a different kernel under `runsc`.

## Run

```sh
bash run.sh
```

Needs Linux, Docker Engine, `python3`, network access to Docker Hub. The container is named
`kbdock-anatomy-<pid>` and removed on exit; nothing is built or left behind.

## Output of the run on 2026-10-30

Docker Engine 29.7.2 (upgraded install, storage driver `overlay2`), containerd v2.3.3, runc 1.4.3,
kernel 6.8, cgroup v2, `node:24-slim` = `sha256:c86ecead…`.

```
docker 29.7.2, containerd v2.3.3, runc 1.4.3
storage driver: overlay2, cgroup v2

== 1. a container is a process on the host kernel
host kernel:      6.8.0-138-generic
container kernel: 6.8.0-138-generic
inside, PID 1 is: sleep; on the host the same process is PID 4141094: sleep
namespaces that differ from the host's PID 1 view (by inode):
   pid    container pid:[4026532926]       host-shell pid:[4026531836]       own
   mnt    container mnt:[4026532854]       host-shell mnt:[4026531841]       own
   net    container net:[4026532928]       host-shell net:[4026531840]       own
   uts    container uts:[4026532858]       host-shell uts:[4026531838]       own
   ipc    container ipc:[4026532925]       host-shell ipc:[4026531839]       own
   cgroup container cgroup:[4026532927]    host-shell cgroup:[4026531835]    own
   user   container user:[4026531837]      host-shell user:[4026531837]      SAME
cgroup (inside):  0::/
memory.max:       536870912   (= 512 MiB)
cpu.max:          150000 100000   (quota period: 1.5 CPU)

== 2. the process tree on the host
parent of the container process: containerd-shim (pid 4141056)
runc processes alive now: 0  (runc creates the container and exits)

== 3. root filesystem = overlay of image layers + a writable upper layer
graph driver: overlay2
lower dirs (read-only): 6  = image layers 5 + 1 init layer
file written in the container appears in: A /written-in-container  (docker diff = upper layer)
mount inside: overlay / overlay

== 4. an image is content-addressed JSON
index digest from registry: sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
sha256 of the index bytes:  sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
index mediaType: application/vnd.oci.image.index.v1+json
linux/amd64 manifest: application/vnd.oci.image.manifest.v1+json
  config: sha256:9564952982df…
  layers: 5 compressed total 81.0 MB
local uncompressed size: 230 MB

== 5. one tag, several platforms
6 manifests: linux/amd64, unknown/unknown, linux/arm64/v8, unknown/unknown, linux/ppc64le, unknown/unknown
multi-platform build with the default builder: exit=1 ERROR: failed to build: Multi-platform build is not supported for the docker driver.
("unknown/unknown" entries above are attestation manifests: provenance / SBOM, not platforms)

== 6. same image, different runtime (only if gVisor's runsc is registered)
runc:  uname -r = 6.8.0-138-generic
runsc: uname -r = 4.19.0-gvisor   (gVisor: a user-space kernel between app and host)
```

The host PIDs and namespace inodes differ on every run.
