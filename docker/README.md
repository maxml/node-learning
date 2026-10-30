# Docker experiments

Experiments behind the vault topic **Docker** (notes «Образи та контейнери Docker»,
«Dockerfile для Node.js», «Контейнер у рантаймі», «Docker Compose для розробки»,
«Практики Docker»). Each folder has its own README with what it shows, how to run it and the
real output of the run on 2026-10-30.

| Folder      | What it measures                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------- |
| `anatomy/`  | a container as a host process (namespaces, cgroup limits, shim/runc), overlay layers, OCI digests, multi-platform index, gVisor |
| `image/`    | one Node/TS service built five ways: sizes per base, what is inside, layer cache, build context, ARG vs secret mount, `NODE_ENV` trap, apt cache, `docker build --check`; `scan.sh` runs Trivy over the five images |
| `runtime/`  | who receives `SIGTERM` (node, npm, shell form, `--init`, Debian vs Alpine), zombies, heap vs `-m`, `availableParallelism()` vs `--cpus`, `--read-only` |
| `compose/`  | `depends_on` with and without healthchecks, service DNS, the bind-mount `node_modules` trap, profiles, `compose watch`, `.env` vs `env_file` |

Environment of the recorded runs: Linux 6.8 (cgroup v2), Docker Engine 29.7.2 (upgraded
install, `overlay2` image store), containerd v2.3.3, runc 1.4.3, buildx 0.36.1, Compose v5.5.1;
images `node:24-slim` / `node:24-alpine` (Node v24.22.2, npm 11.19.1), `node:22-bookworm-slim`
(v22.23.3), `node:20-alpine` (v20.20.2), `gcr.io/distroless/nodejs24-debian13`,
`cgr.dev/chainguard/node:latest` (v26.12.1), `mongo:9` (9.0.4), `redis:8.10.3`,
`aquasec/trivy:0.76.1`.

Every script names its containers/images `kbdock-*` and removes them on exit. Base images that
get pulled are left in place, and BuildKit's build cache is not pruned (it is shared with other
builds on the host).

Related, not repeated here: `../aws/ecs-exit-codes/` (OOM vs V8 heap abort vs stop timeout exit
codes) and `../security/secrets/` (secrets left in layers, `docker inspect`, git history).
