# Runtime: PID 1, signals, zombies, memory, CPU, read-only rootfs

Backs the vault note «Контейнер у рантаймі». Complements `../../aws/ecs-exit-codes/`, which
measured OOM vs heap-abort exit codes and is not repeated here.

`w.js` holds the workloads (one file, many modes); `package.json` has the npm scripts used in the
`npm start` cases. `run.sh` mounts this folder read-only into stock images and measures:

- **A.** `docker stop -t 5` for: node as PID 1 with/without a `SIGTERM` handler, `--init`,
  `npm start` (Debian and Alpine), an `exec`-style npm script, `npm start` under `--init`, and
  shell-form `sh -c`. For each: exit code, stop time, whether the handler ran, the process tree.
- **B.** zombies: 20 orphaned grandchildren with node as PID 1 vs `--init` (tini).
- **C.** V8 heap limit vs `-m` on Node 20, 22, 24, and `--max-old-space-size-percentage`.
- **D.** `os.availableParallelism()` vs `--cpus` / `--cpuset-cpus` on Node 20, 22, 24 (libuv
  version printed).
- **E.** writes under `--read-only`, with and without `--tmpfs /tmp`.

## Run

```sh
bash run.sh
```

Uses `node:24-slim`, `node:24-alpine`, `node:22-bookworm-slim`, `node:20-alpine` (pulled if
missing). Containers are named `kbdock-rt-<pid>-*` and removed on exit; nothing is built.

## Output of the run on 2026-10-30

Docker Engine 29.7.2, cgroup v2, 12-CPU host, `node:24-slim` = Node v24.22.2 + npm 11.19.1
(Debian 12, `/bin/sh` = dash 0.5.12), `node:24-alpine` (`/bin/sh` = busybox ash).

```
docker 29.7.2, image node:24-slim: node v24.22.2, npm 11.19.1

== A. docker stop -t 5 (SIGTERM, SIGKILL after 5 s)
node-pid1-no-handler               exit=137 stop took  5.3s  app saw SIGTERM: no
    processes: 1:node w.js no-handler 14:sh -c for p in /proc/[0-9]*; do [ -r $p/ 
node-pid1-handler                  exit=0   stop took  0.2s  app saw SIGTERM: yes
    processes: 1:node w.js handler 14:sh -c for p in /proc/[0-9]*; do [ -r $p/ 
init-no-handler                    exit=143 stop took  0.3s  app saw SIGTERM: no
    processes: 1:/sbin/docker-init -- docker-entrypoint.s 15:sh -c for p in /proc/[0-9]*; do [ -r $p/ 7:node w.js no-handler 
npm-start-handler                  exit=1   stop took  4.0s  app saw SIGTERM: no
    processes: 1:npm start 19:sh -c node w.js handler 20:node w.js handler 27:sh -c for p in /proc/[0-9]*; do [ -r $p/ 
npm-start-no-handler               exit=1   stop took  3.9s  app saw SIGTERM: no
    processes: 1:npm run start:nohandler 19:sh -c node w.js no-handler 20:node w.js no-handler 27:sh -c for p in /proc/[0-9]*; do [ -r $p/ 
npm-start-exec-handler             exit=0   stop took  3.9s  app saw SIGTERM: yes
    processes: 1:npm run start:exec 19:node w.js handler 26:sh -c for p in /proc/[0-9]*; do [ -r $p/ 
npm-start-handler-init             exit=143 stop took  0.3s  app saw SIGTERM: no
    processes: 1:/sbin/docker-init -- docker-entrypoint.s 21:sh -c node w.js handler 22:node w.js handler 29:sh -c for p in /proc/[0-9]*; do [ -r $p/ 8:npm start 
shell-form-single                  exit=137 stop took  5.3s  app saw SIGTERM: no
    processes: 1:sh -c node w.js handler 15:sh -c for p in /proc/[0-9]*; do [ -r $p/ 8:node w.js handler 
shell-form-two-commands            exit=137 stop took  5.3s  app saw SIGTERM: no
    processes: 1:sh -c node w.js handler; echo after 15:sh -c for p in /proc/[0-9]*; do [ -r $p/ 8:node w.js handler 
alpine-npm-start-handler           exit=0   stop took  0.4s  app saw SIGTERM: yes
    processes: 1:npm start 19:node w.js handler 26:sh -c for p in /proc/[0-9]*; do [ -r $p/ 
alpine-shell-form-single           exit=0   stop took  0.3s  app saw SIGTERM: yes
    processes: 1:node w.js handler 14:sh -c for p in /proc/[0-9]*; do [ -r $p/ 

== B. orphaned grandchildren (20 x 'sh -c "sleep 0.2 &"'), counted after 1.5 s
pid1     [orphans pid=1] zombies=20
--init   [orphans pid=7] zombies=0

== C. V8 heap limit vs container memory limit
node:20-alpine         -m none  {"node":"v20.20.2","heapLimitMiB":4144,"constrainedMemoryMiB":17592186044416,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:20-alpine         -m 512m  {"node":"v20.20.2","heapLimitMiB":259,"constrainedMemoryMiB":512,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:20-alpine         -m 2g    {"node":"v20.20.2","heapLimitMiB":1048,"constrainedMemoryMiB":2048,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:22-bookworm-slim  -m none  {"node":"v22.23.3","heapLimitMiB":4144,"constrainedMemoryMiB":17592186044416,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:22-bookworm-slim  -m 512m  {"node":"v22.23.3","heapLimitMiB":259,"constrainedMemoryMiB":512,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:22-bookworm-slim  -m 2g    {"node":"v22.23.3","heapLimitMiB":1048,"constrainedMemoryMiB":2048,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:24-slim           -m none  {"node":"v24.22.2","heapLimitMiB":4288,"constrainedMemoryMiB":17592186044416,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:24-slim           -m 512m  {"node":"v24.22.2","heapLimitMiB":259,"constrainedMemoryMiB":512,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:24-slim           -m 2g    {"node":"v24.22.2","heapLimitMiB":1120,"constrainedMemoryMiB":2048,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}
node:24-slim (pct=75)  -m 512m  {"node":"v24.22.2","heapLimitMiB":387,"constrainedMemoryMiB":512,"totalmemMiB":31954,"availableParallelism":12,"cpusLength":12}

== D. CPU limits vs os.availableParallelism() (host has 12 CPUs)
node:20-alpine         no limit           libuv 1.46.0 availableParallelism=12 cpus().length=12
node:20-alpine         --cpus=2           libuv 1.46.0 availableParallelism=12 cpus().length=12
node:20-alpine         --cpus=0.5         libuv 1.46.0 availableParallelism=12 cpus().length=12
node:20-alpine         --cpuset-cpus=0,1  libuv 1.46.0 availableParallelism=2 cpus().length=12
node:22-bookworm-slim  no limit           libuv 1.51.0 availableParallelism=12 cpus().length=12
node:22-bookworm-slim  --cpus=2           libuv 1.51.0 availableParallelism=2 cpus().length=12
node:22-bookworm-slim  --cpus=0.5         libuv 1.51.0 availableParallelism=12 cpus().length=12
node:22-bookworm-slim  --cpuset-cpus=0,1  libuv 1.51.0 availableParallelism=2 cpus().length=12
node:24-slim           no limit           libuv 1.52.1 availableParallelism=12 cpus().length=12
node:24-slim           --cpus=2           libuv 1.52.1 availableParallelism=2 cpus().length=12
node:24-slim           --cpus=0.5         libuv 1.52.1 availableParallelism=1 cpus().length=12
node:24-slim           --cpuset-cpus=0,1  libuv 1.52.1 availableParallelism=2 cpus().length=12

== E. --read-only root filesystem
read-only:            
[write pid=1] write /app-data.txt: EROFS
[write pid=1] write /tmp/x.txt: EROFS
read-only + tmpfs /tmp:
[write pid=1] write /app-data.txt: EROFS
[write pid=1] write /tmp/x.txt: ok
npm start, read-only (exit code and stderr):
    exit=124 [no-handler pid=21] ready
```

Reading the results:

- `constrainedMemoryMiB` 17592186044416 means "no limit" (libuv returns `UINT64_MAX`).
- Stop times under npm varied between runs (1.2–4.0 s in two runs); the exit code and whether the
  handler ran are the stable signal.
- `npm-start-handler` on Debian: npm 11 forwards `SIGTERM` to its child
  (`@npmcli/run-script/lib/signal-manager.js`), but that child is `sh -c` (dash), which neither
  execs node nor forwards the signal; dash dies, npm exits 1, and the kernel SIGKILLs node when
  PID 1 exits. On Alpine, busybox `sh -c` execs node, so the signal arrives.
- `exit=124` in E is `timeout 3` ending the run; the app started fine under `--read-only`.
