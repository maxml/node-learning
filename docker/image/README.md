# Image: one Node/TS service, five Dockerfiles

Backs the vault notes «Dockerfile для Node.js», «Образи та контейнери Docker» (cache, context)
and «Практики Docker» (secrets, apt cache, lint, scanning).

`app/` is a tiny HTTP service in TypeScript (`src/server.ts`) with one production dependency
(`ms@2.1.3`) and dev dependencies `typescript@6.0.3`, `@types/node@24.19.2`, `@types/ms@2.1.0`
(all exact, `package-lock.json` committed). Dockerfiles:

| File                    | What it is                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `Dockerfile`            | the recommended one: 3 stages, `node:24-slim` by digest, secret mount, cache mount, `USER node`, HEALTHCHECK, exec-form CMD |
| `Dockerfile.naive`      | the tutorial one: `FROM node:24`, `COPY . .`, `npm install`, root, `CMD ["npm","start"]`       |
| `Dockerfile.alpine`     | same stages on `node:24-alpine` (musl)                                                       |
| `Dockerfile.distroless` | build on `node:24-trixie-slim`, run on `gcr.io/distroless/nodejs24-debian13` as uid 65532     |
| `Dockerfile.chainguard` | `cgr.dev/chainguard/node:latest` (free tier: only `latest`, Node 26 on the run date)          |
| `Dockerfile.argleak`    | the wrong way to pass an npm token (build ARG), for the history check                         |

`run.sh` measures: (1) size per Dockerfile, (2) what is inside (uid, Node, `NODE_ENV`,
`typescript` present, shell present), (3) HEALTHCHECK status, (4) which steps re-run after a
source-only edit, (5) build-context bytes sent with junk `node_modules`/`.git`, (6) ARG vs secret
mount in `docker history` and `docker save`, (7) `NODE_ENV=production` before `npm ci`,
(8) tag vs pinned digest, (9) apt list cleanup in the same vs a later `RUN`, (10) `docker build --check`.

`scan.sh` scans the five images with Trivy 0.76.1 (container pinned by digest).

## Run

```sh
bash run.sh    # ~6 min, mostly `docker save | gzip` for the size column
bash scan.sh   # downloads the Trivy DB into a temp dir
```

Images are tagged `kbdock-img:*` / `kbdock-scan:*`, temp dirs are `kbdock-*`; all removed on
exit. The fake npm token is generated per run and points at `npm.example.invalid`, so it is never
sent anywhere. Base images are pulled if missing and left in place; BuildKit build cache is kept.

## Output of `run.sh` on 2026-10-30

Docker Engine 29.7.2 (classic `overlay2` image store), buildx 0.36.1, Node v24.22.2,
npm 11.19.1. Build times are from a warm cache and mean nothing here.

```
docker 29.7.2, buildx v0.36.1

== 1. image size per Dockerfile (uncompressed = docker image inspect .Size; gz = docker save | gzip)
naive       Dockerfile.naive         1171 MB  gz   413 MB  layers 12  build   0s
slim        Dockerfile                230 MB  gz    79 MB  layers  9  build   1s
alpine      Dockerfile.alpine         172 MB  gz    60 MB  layers  8  build   1s
distroless  Dockerfile.distroless     154 MB  gz    55 MB  layers 26  build   1s
chainguard  Dockerfile.chainguard     177 MB  gz    62 MB  layers 15  build   1s

== 2. what is inside: user, Node, NODE_ENV, typescript in node_modules?
naive       {"node":"v24.22.2","uid":0,"nodeEnv":null,"cpus":12}  typescript=1  shell=yes
slim        {"node":"v24.22.2","uid":1000,"nodeEnv":"production","cpus":12}  typescript=0  shell=yes
alpine      {"node":"v24.22.2","uid":1000,"nodeEnv":"production","cpus":12}  typescript=0  shell=yes
distroless  {"node":"v24.22.2","uid":65532,"nodeEnv":"production","cpus":12}  typescript=0  shell=no
chainguard  {"node":"v26.12.1","uid":65532,"nodeEnv":"production","cpus":12}  typescript=0  shell=yes

== 3. HEALTHCHECK of the slim image
status=healthy  last probe exit=0

== 4. layer cache after a source-only edit (which steps re-ran?)
-- Dockerfile (lockfile copied before source):
CACHED  [build 4/7] RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true     --mount=type=cache,target=/root/.npm     npm ci --ignore-scripts --no-audit --no-fund
CACHED  [deps 4/4] RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true     --mount=type=cache,target=/root/.npm     npm ci --omit=dev --ignore-scripts --no-audit --no-fund
re-ran  [build 7/7] RUN npm run build
-- Dockerfile.naive (COPY . . before npm install):
re-ran  [4/5] RUN npm install
re-ran  [5/5] RUN npm run build

== 5. build context with junk node_modules (120 MB) and .git (30 MB)
Dockerfile with .dockerignore:    sent 160B
Dockerfile without .dockerignore: sent 160B
Dockerfile.naive with .dockerignore:    sent 160B
Dockerfile.naive without .dockerignore: sent 150.04MB

== 6. private-registry token: ARG vs BuildKit secret
ARG:    docker history hits = 2
        NPM_TOKEN=kbdock-fake-token-4140486
secret: docker history hits = 0, hits in docker save = 0

== 7. ENV NODE_ENV=production set before the build stage's npm ci
node_modules: ms 
tsc: NOT found (devDependencies omitted)

== 8. a tag is a pointer, a digest is content
node:24-slim now resolves to sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
Dockerfile pins            sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c

== 9. apt-get install curl on node:24-slim: where the package lists end up
same-run-cleanup                    242 MB  (+12 MB over the base)
no-cleanup                          262 MB  (+31 MB over the base)
cleanup-in-later-run                262 MB  (+31 MB over the base)
with-recommends-and-cleanup         245 MB  (+15 MB over the base)

== 10. docker build --check (Dockerfile linter built into BuildKit)
Dockerfile           Check complete, no warnings found. 
Dockerfile.naive     Check complete, no warnings found. 
Dockerfile.argleak   WARNING: SecretsUsedInArgOrEnv - https://docs.docker.com/go/dockerfile/rule/secrets-used-in-arg-or-env/ 
shell-form CMD       WARNING: JSONArgsRecommended - https://docs.docker.com/go/dockerfile/rule/json-args-recommended/ 
```

Section 5: BuildKit transfers the context incrementally and only the paths `COPY`/`ADD` use, so
the explicit-COPY Dockerfile sends almost nothing even without `.dockerignore`; `COPY . .` sends
everything that is not ignored.

## Output of `scan.sh` on 2026-10-30

```
trivy Version: 0.76.1
image       CRITICAL  HIGH MEDIUM  LOW  UNK  os packages / npm packages with findings
naive             20   465   1995 1854   88  debian 12.15; by class: {'os-pkgs': 4405, 'lang-pkgs': 17}
slim               1    62     97   84    2  debian 12.15; by class: {'os-pkgs': 229, 'lang-pkgs': 17}
alpine             0     6     10    1    0  alpine 3.24.3; by class: {'lang-pkgs': 17}
distroless         0     0     23    8    0  debian 13.7; by class: {'os-pkgs': 31}
chainguard         0     0      0    0    0  wolfi 20230201; by class: {}
```

All 17 `lang-pkgs` findings are in npm's own bundled dependencies
(`/usr/local/lib/node_modules/npm/node_modules/{undici,brace-expansion,ip-address,…}`), not in the
app's `node_modules` (checked by listing `PkgPath` for `node:24-alpine`). Counts change daily with
the vulnerability DB.
