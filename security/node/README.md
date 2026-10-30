# Node.js security experiments

Code behind the «перевірено» claims in the Vault note `Engineering/General/Node/Безпека Node.js.md`.
All runs: 2026-10-29, Docker images `node:24` (v24.22.2, npm 11.19.1) and `node:22` (v22.23.4,
npm 10.9.9), pnpm 12.16.1 via `npx pnpm@latest`, npm 12.2.1 via `npm i -g npm@12.2.1`.
Containers run with `--rm`; nothing is left behind. The directory is mounted read-only
(`/ex`); scripts that install packages copy what they need into `/w` inside the container.

| File | What it checks |
| --- | --- |
| `proto-pollution.mjs` | `JSON.parse` own `__proto__` key vs literal/assignment; naive deep merge via `__proto__` and `constructor.prototype`; `Object.create(null)` (top level only), `Map`; an `isAdmin` auth gadget |
| `gadget-child-process.mjs` | whether polluted `Object.prototype.shell` / `.env` reach `execFileSync` / `spawnSync` |
| `freeze-proto.mjs` | `Object.freeze(Object.prototype)`: blocks additions, causes the "override mistake", leaves `Array.prototype` open |
| `lodash-merge.mjs` + `package.json` | `merge`, `defaultsDeep`, `set` in current lodash, lodash 4.17.4 and the standalone `lodash.merge` |
| `vm-escape.mjs` | `node:vm` escape to the host `process` |
| `permission.mjs`, `permission-symlink.sh` | `--permission`: fs, child_process, worker, network, existing fd, symlink out of the grant |
| `supply-chain.sh` | does a dependency's `postinstall` run: npm, `--ignore-scripts`, `npm ci`, pnpm |
| `buffer-unsafe.mjs` | `Buffer.allocUnsafe` returns stale memory |
| `shell-vs-argv.mjs` | `exec` string vs `execFile` argv |
| `server-defaults.mjs` | HTTP server timeout and header limits |

## Run

```sh
cd examples/security/node
for v in 24 22; do
  docker run --rm -v "$PWD":/ex:ro -w /ex node:$v sh -c '
    for f in proto-pollution gadget-child-process freeze-proto vm-escape shell-vs-argv server-defaults buffer-unsafe; do
      echo "--- $f"; node $f.mjs; done
    node --disable-proto=throw  proto-pollution.mjs
    node --disable-proto=delete proto-pollution.mjs
    node --permission --allow-fs-read=/ex permission.mjs
    sh /ex/permission-symlink.sh'
done
# lodash (needs network)
docker run --rm -v "$PWD":/src:ro node:24 sh -c 'mkdir /w && cp /src/package.json /src/lodash-merge.mjs /w && cd /w && npm i --no-audit --no-fund && node lodash-merge.mjs && npm audit; npm audit signatures'
# lifecycle scripts (needs network for pnpm)
docker run --rm -v "$PWD":/ex:ro node:24 sh /ex/supply-chain.sh
```

npm 12 comparison: after `supply-chain.sh`, inside the same container
`npm i -g npm@12.2.1`, then `npm install` in `/w/app` again.

## Results (2026-10-29)

Identical on v24.22.2 and v22.23.4 unless stated.

### Prototype pollution

| Case | Result |
| --- | --- |
| `JSON.parse('{"__proto__":{"isAdmin":true}}')` | own key `__proto__` (`Object.hasOwn` → true); prototype untouched |
| literal `{ __proto__: {...} }` | sets the prototype (`.isAdmin` → true) |
| `a['__proto__'] = {...}` | goes through the accessor, no own key |
| naive merge, `__proto__` path | `({}).isAdmin === true` |
| naive merge, `constructor.prototype` path | `({}).isAdmin === true` |
| `--disable-proto=throw` | `__proto__` path throws `ERR_PROTO_ACCESS`; **`constructor.prototype` path still pollutes** |
| `--disable-proto=delete` | `__proto__` path becomes a harmless own key; **`constructor.prototype` still pollutes** |
| `Object.create(null)` target | top level safe; nested `{"a":{"__proto__":…}}` **still pollutes** (merge creates ordinary `{}` inside) |
| `Map` | safe, `m.get('__proto__')` is just data |
| gadget `u.isAdmin === true` for a user without the field | false → **true** after pollution; `Object.hasOwn(u,'isAdmin') && …` stays false |
| polluted `Object.prototype.shell = true` / `.env` → `execFileSync`, `spawnSync` | **ignored**: output `"$HOME"`, `INJECTED=` empty (Node copies options as `{ __proto__: null, ...options }`, lib/child_process.js in v24.22.2) |
| `Object.freeze(Object.prototype)` | adding `isAdmin` → `TypeError: Cannot add property isAdmin, object is not extensible`; `p.toString = …` on an ordinary object → `TypeError: Cannot assign to read only property 'toString'` (override mistake); `defineProperty` works; `Array.prototype` still writable |

lodash (`npm i`, node v24.22.2):

| Library | `merge` / `defaultsDeep`, both paths | `set('__proto__.x')`, `set('constructor.prototype.x')` |
| --- | --- | --- |
| lodash 4.18.1 (latest) | not polluted | not polluted |
| lodash.merge 4.6.2 (latest) | not polluted | — |
| lodash 4.17.4 | **polluted** | **polluted** |

`npm audit` flags `lodash <=4.17.23` as critical (several prototype-pollution GHSAs, incl. `_.unset`/`_.omit`).
`npm audit signatures`: `3 packages have verified registry signatures`.

### vm

`vm.runInNewContext("this.constructor.constructor('return process')()…", {})` returned the host
`process` (`v24.22.2 pid=33 cwd=/ex`); passing any host function into a null-prototype context leaks
`process.env.HOME` the same way. `timeout` stops only a synchronous loop (`ERR_SCRIPT_EXECUTION_TIMEOUT`).

### Permission model (`--permission --allow-fs-read=/ex`)

| Operation | v24.22.2 and v22.23.4 |
| --- | --- |
| `fs.readFileSync('/etc/passwd')` | `ERR_ACCESS_DENIED` FileSystemRead `/etc/passwd` |
| `fs.writeFileSync('/ex/out.txt')` | `ERR_ACCESS_DENIED` FileSystemWrite |
| `child_process.execSync('id')` | `ERR_ACCESS_DENIED` ChildProcess `/bin/sh` |
| `new Worker` | `ERR_ACCESS_DENIED` WorkerThreads |
| `process.binding('fs')` | `ERR_ACCESS_DENIED` |
| `net` server + connect on 127.0.0.1 | **allowed** (`--allow-net` → `bad option` on both; it exists from v25) |
| `fs.writeSync(1, …)` on an existing fd | **allowed** |
| symlink `/g/link → /etc/passwd`, grant `/g` | **read succeeds**, while `/etc/passwd` directly is denied |
| entry script without any `--allow-fs-read` | runs (the entry point is readable) |

### Lifecycle scripts (dependency packed with `npm pack`, installed as `file:` tarball)

| Command | postinstall |
| --- | --- |
| npm 11.19.1 `npm install` | **ran**, plus `npm warn install-scripts … not yet covered by allowScripts` |
| npm 11.19.1 `npm install --ignore-scripts` | did not run |
| npm 11.19.1 `npm ci` (with lockfile) | **ran** |
| npm 12.2.1 `npm install` | blocked: `install scripts blocked because they are not covered by allowScripts` |
| pnpm 12.16.1 `pnpm install` | did not run; `ERR_PNPM_IGNORED_BUILDS`, exit code 1 |

### Buffer

`Buffer.allocUnsafe(64 KiB)` ×2000 after writing a "secret": v24 found the old secret 27 times
(997 non-zero buffers), v22 212 times (1497 non-zero). `Buffer.alloc` always zero.
`Buffer.poolSize`: 65536 on v24.22.2, 8192 on v22.23.4. Counts vary per run; the point is non-zero.

### child_process

`exec('echo report.txt; echo INJECTED-$(id -u)')` → `"report.txt\nINJECTED-0"`;
`execFile('echo', [same])` → the literal string.

### HTTP server defaults (both versions)

`requestTimeout 300000`, `headersTimeout 60000`, `keepAliveTimeout 5000`, `timeout 0`,
`maxHeadersCount null` (= 2000 in practice per docs), `maxRequestsPerSocket 0`, `http.maxHeaderSize 16384`.
