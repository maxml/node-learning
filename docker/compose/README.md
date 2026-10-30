# Compose for local development

Backs the vault note «Docker Compose для розробки».

`compose.yaml` is a small dev stack: `mongo:9`, `redis:8.10.3` and a Node app (`app/`) that
probes both once at start-up **without retries** (`app/src/index.js`), plus a `seed` one-off job
behind the `tools` profile. `run.sh` measures:

1. `depends_on: condition: service_healthy` vs `service_started` (the start-up race), with the
   real images and with a Redis that needs 4 s to become ready;
2. service-name DNS on the project network vs the default bridge;
3. the `node_modules` trap of a bind mount over `/app`, and the anonymous-volume fix;
4. profiles;
5. `compose watch` (`sync`): a host edit appears in the running container without a rebuild;
6. `.env` (interpolation only) vs `env_file` (container environment).

## Run

```sh
bash run.sh
```

The script copies this folder to a temp dir (the repo is never modified), copies
`dotenv.example` to `.env` there (the repo's `.gitignore` excludes `.env`), runs project
`kbdock-compose`, and on exit runs `docker compose down -v --rmi local`: containers, network,
the `mongo-data` volume and the built app image are removed. `mongo:9` and `redis:8.10.3` are
pulled if missing and left in place.

Dependency pinned: `ms@2.1.3` (`app/package-lock.json`).

## Output of the run on 2026-10-30

Docker Engine 29.7.2, Docker Compose v5.5.1, `mongo:9` (9.0.4), `redis:8.10.3`,
app on `node:24-slim` (Node v24.22.2).

```
docker 29.7.2, Docker Compose version v5.5.1

== 1. startup order
 Image kbdock-compose-app Building 
 Image kbdock-compose-app Built 
service_healthy: up --wait took 5s
app Up 1 second
mongo Up 4 seconds (healthy)
redis Up 4 seconds (healthy)
   app log: deps ok: redis=+PONG mongo=connected (uptime 242ms)
service_healthy, redis needs 4 s: up --wait took 6s; app log: deps ok: redis=+PONG mongo=connected (uptime 251ms)
service_started, redis needs 4 s: app state=exited exit=1; app log: deps FAILED at start: ECONNREFUSED

== 2. service discovery
on project network: mongo -> 172.18.0.2
network: kbdock-compose_default
on default bridge:  mongo -> not resolvable

== 3. bind mount over /app (node_modules live only in the image)
bind mount only:            Cannot find package 'ms'
bind mount + anon volume:   deps ok: redis=+PONG mongo=connected (uptime 245ms)

== 4. profiles
services without --profile: app mongo redis 
services with --profile tools: app mongo redis seed 
seed run: true

== 5. compose watch
edit visible inside running container: yes
image rebuilt: 0 rebuild lines; watch log: Syncing service "app" after 1 changes were detected

== 6. .env vs env_file
compose.yaml says GREETING: ${GREETING:-hello}; .env sets GREETING=hello-from-dotenv
inside the container: GREETING=hello-from-dotenv, FROM_ENV_FILE=yes, APP_PORT=<unset>
published port from .env APP_PORT: 127.0.0.1:3100
```

Notes on the evidence:

- With the real `mongo:9` and Redis images both accept connections about a second after start on
  this host, so the race did not show with them; the "redis needs 4 s" override
  (`sh -c "sleep 4 && exec redis-server"`, written by `run.sh` into the temp dir) makes it
  deterministic.
- An earlier version of `compose.yaml` had `start_interval` without `start_period` on Redis;
  Compose refused it: `healthcheck.start_interval requires healthcheck.start_period to be set`.
- `sync` only copies the file. The running `node` process does not reload it; use `node --watch`
  in the dev command or the `sync+restart` action.
