# npm: semver, phantom dependencies, lockfile, peers, exports, install scripts

Experiments behind the knowledge-base note «Пакети та npm» (General/Node).
Each folder is self-contained. The shell demos build everything in a `mktemp -d`
directory and delete it on exit, use a private npm cache inside that directory,
and never publish anything.

Packages fetched from the public registry, all pinned and all without install
scripts: `semver@7.8.5` (also `7.7.0`, `7.6.3`, `6.3.1` as resolution targets),
`debug@4.4.3` with its dependency `ms@2.1.3`, and the tools `pnpm@12.16.1`,
`npm@12.2.1` via `npx -y`. The only package with lifecycle scripts is a LOCAL
tarball built by `install-scripts/run.sh` itself.

## Environment of the recorded run (2026-10-30)

Docker image `node:24`: Node v24.22.2, bundled npm 11.19.1. Same results on the
host (Node v24.14.1, npm 11.12.1), except that npm 11.12.1 prints no
`allowScripts` warning (the warning arrived in npm 11.16.0) and npm 12.2.1 warns
that it does not support Node 24.14.1 (it requires `^22.22.2 || ^24.15.0 || >=26.0.0`).

```bash
# from this folder
docker run --rm -v "$PWD":/demo:ro node:24 bash -c 'cp -r /demo/semver /tmp/s && cd /tmp/s && npm install --ignore-scripts && node ranges.mjs'
docker run --rm -v "$PWD":/demo:ro node:24 bash /demo/phantom/run.sh
docker run --rm -v "$PWD":/demo:ro node:24 bash /demo/ci-lockfile/run.sh
docker run --rm -v "$PWD":/demo:ro node:24 bash /demo/peer-deps/run.sh
docker run --rm -v "$PWD":/demo:ro node:24 bash /demo/exports/run.sh
docker run --rm -v "$PWD":/demo:ro -e NPM12=12.2.1 node:24 bash /demo/install-scripts/run.sh
```

Without Docker: `bash phantom/run.sh` and so on, with Node and npm on PATH.

## semver/ — how ranges resolve

`ranges.mjs` uses node-semver, the library npm itself resolves ranges with.

```
^1.2.3          => >=1.2.3 <2.0.0-0             matches: 1.2.3 1.2.9 1.3.0 1.9.9
~1.2.3          => >=1.2.3 <1.3.0-0             matches: 1.2.3 1.2.9
1.2.x           => >=1.2.0 <1.3.0-0             matches: 1.2.3 1.2.9
*               =>                              matches: 0.0.3 0.0.4 0.2.3 0.2.9 0.3.0 1.2.3 1.2.9 1.3.0 1.9.9 2.0.0
^0.2.3          => >=0.2.3 <0.3.0-0             matches: 0.2.3 0.2.9
~0.2.3          => >=0.2.3 <0.3.0-0             matches: 0.2.3 0.2.9
^0.0.3          => >=0.0.3 <0.0.4-0             matches: 0.0.3
^1.2.3-beta.2   => >=1.2.3-beta.2 <2.0.0-0      matches: 1.2.3 1.2.9 1.3.0 1.9.9 1.2.3-beta.2 1.2.3-beta.4
>=1.2.3-beta.2  => >=1.2.3-beta.2               matches: 1.2.3 1.2.9 1.3.0 1.9.9 2.0.0 1.2.3-beta.2 1.2.3-beta.4

-- what npm would pick (maxSatisfying) from the candidates --
^1.2.3   -> 1.9.9
~1.2.3   -> 1.2.9
^0.2.3   -> 0.2.9
^0.0.3   -> 0.0.3
*        -> 2.0.0

-- prerelease rule: only the same [major,minor,patch] tuple, unless includePrerelease --
satisfies('1.2.4-beta.1', '^1.2.3')                    = false
satisfies('1.2.4-beta.1', '^1.2.3', {includePrerelease}) = true
satisfies('2.0.0-rc.1', '*')                           = false

-- ordering: prerelease < release, build metadata ignored --
compare('1.0.0-rc.1', '1.0.0')        = -1
compare('1.0.0-alpha.10', '1.0.0-alpha.9') = 1
compare('1.0.0+build.1', '1.0.0+build.2')  = 0
valid('v1.2.3') = 1.2.3   valid('1.2') = null
npx semver -r ^0.2.3 0.2.9 0.3.0 -> 0.2.9
```

Note `^1.2.3-beta.2` admits `1.2.3-beta.4` but not `1.2.4-beta.1`, and `*`
admits no prerelease at all. The last line runs the package's `bin` from
`node_modules/.bin` with `npx --no-install`.

## phantom/ — an undeclared import that works by accident

The app declares only `debug`, but its code does `require('ms')`.

```
== npm 11.19.1: flat (hoisted) node_modules ==
debug
ms
require("ms") OK -> 7200000 ms; resolved from ./node_modules/ms/index.js
phantom-demo@1.0.0 /tmp/tmp.juZBmyHm2u/npm
`-- debug@4.4.3
  `-- ms@2.1.3

== npm --install-strategy=linked: npm's own isolated layout (node_modules/.store) ==
.package-lock.json
.store
debug
require("ms") FAILED -> MODULE_NOT_FOUND

== pnpm 12.16.1: isolated node_modules (symlinks into a content-addressed store) ==
.modules.yaml
.pnpm
.pnpm-workspace-state-v1.json
debug
debug -> .pnpm/debug@4.4.3/node_modules/debug
siblings visible to debug: debug ms
ms -> ../../ms@2.1.3/node_modules/ms
require("ms") FAILED -> MODULE_NOT_FOUND

== pnpm with node-linker=hoisted (npm-compatible layout): the phantom comes back ==
require("ms") OK -> 7200000 ms; resolved from ./node_modules/ms/index.js
```

## ci-lockfile/ — `npm install` vs `npm ci`

```
== 1. npm install semver@7.7.0: what gets saved ==
package.json: "^7.7.0"   lock: 7.7.0   lockfileVersion: 3

== 2. lock satisfies the range: npm ci installs exactly the lock (7.7.0), not the newest ^7 ==
npm ci exit=0  installed: 7.7.0

== 3. npm install with no lock: resolves the range afresh to the newest match ==
package.json: "^7.7.0"   lock now: 7.8.5

== 4. package.json edited by hand to a range the lock does not satisfy ==
package.json: "~7.6.0"   lock: 7.8.5
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
npm error Invalid: lock file's semver@7.8.5 does not satisfy semver@7.6.3
npm ci exit=1   lock changed by npm ci: no

== 5. same state, npm install: no error, silently rewrites the lock ==
npm install exit=0   lock now: 7.6.3

== 6. integrity: tamper with the lock hash, npm ci refuses the tarball ==
npm error code EINTEGRITY
npm error sha512-AQEB…AQ== integrity checksum failed when using sha512: wanted sha512-AQEB…AQ== but got sha512-oVekP1cKtI+CTDvHWYFUcMtsK/00wmAEfyqKfNdARm8u1wNVhSgaX7A8d4UuIlUI5e84iEwOhs7ZPYRmzU9U6A==. (27678 bytes)
npm ci exit=1
```

Step 1 shows the default `save-prefix`: an exact `npm install semver@7.7.0` still
writes `^7.7.0` to package.json (use `--save-exact` / `save-exact=true` to pin).

## peer-deps/ — peers since npm 7

`local-plugin` (a local tarball) declares `peerDependencies: { semver: "^6.0.0" }`.

```
== 1. app depends only on the plugin: npm installs the peer itself ==
exit=0
`-- local-plugin@1.0.0
  `-- semver@6.3.1

lock marks it: peer=true

== 2. app pins the host at a version outside the peer range: ERESOLVE ==
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error Found: semver@7.8.5
npm error Could not resolve dependency:
npm error peer semver@"^6.0.0" from local-plugin@1.0.0
exit=1

== 3. same app with --legacy-peer-deps: installs, contract silently broken ==
exit=0
semver actually installed: 7.8.5 (plugin asked for ^6.0.0)
| `-- semver@7.8.5 deduped invalid: "^6.0.0" from node_modules/local-plugin
`-- semver@7.8.5 invalid: "^6.0.0" from node_modules/local-plugin
npm error invalid: semver@7.8.5 /tmp/tmp.mpku97VpIS/b/node_modules/semver
```

## exports/ — `exports` closes unlisted paths

A hand-made `node_modules/lib` (no npm involved), first with only `main`, then
with `exports`.

```
== lib@1: only "main" ==
  require("lib") -> public entry
  require("lib/internal/helper.js") -> internal helper
== lib@2: "exports": { ".": "./index.js" } ==
  require("lib") -> public entry
  require("lib/internal/helper.js") -> ERR_PACKAGE_PATH_NOT_EXPORTED
```

## install-scripts/ — who runs lifecycle scripts, in what order, with what env

The dependency `local-hooked-dep` (a tarball packed by the script) has
`preinstall`, `install`, `postinstall` and `prepare`; the app has root
`preinstall`, `postinstall`, `prepare` and `pretest`/`test`/`posttest`. Every
script logs its name and whether it could read `SECRET_TOKEN` from the
environment (a fake value exported by the script).

```
== 11.19.1 ==
-- npm install (exit 0)
   dep:preinstall saw SECRET_TOKEN
   dep:install saw SECRET_TOKEN
   dep:postinstall saw SECRET_TOKEN
   root:preinstall saw SECRET_TOKEN
   root:postinstall saw SECRET_TOKEN
   root:prepare saw SECRET_TOKEN
   npm says: npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
-- npm ci (lockfile present) (exit 0)
   (same six lines and the same warning)
-- npm ci --ignore-scripts (exit 0)
   (no scripts ran)
-- npm test (pre/post hooks) (exit 0)
   root:pretest saw SECRET_TOKEN
   root:test saw SECRET_TOKEN
   root:posttest saw SECRET_TOKEN
-- npm test --ignore-scripts (exit 0)
   root:test saw SECRET_TOKEN

== 12.2.1 ==
-- npm install (exit 0)
   root:preinstall saw SECRET_TOKEN
   root:postinstall saw SECRET_TOKEN
   root:prepare saw SECRET_TOKEN
   npm says: npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts:
-- npm ci (lockfile present) (exit 0)
   (same three lines and the same warning)
-- npm ci --ignore-scripts (exit 0)
   (no scripts ran)
-- npm test (pre/post hooks) (exit 0)
   root:pretest / root:test / root:posttest
-- npm test --ignore-scripts (exit 0)
   root:test saw SECRET_TOKEN

== npm@12.2.1: approve the dependency, then rebuild ==
   ls: 1 package has install scripts blocked because they are not covered by allowScripts:
   ls: Run `npm install-scripts approve <pkg>` to allow, or `npm install-scripts deny <pkg>` to deny.
   allowScripts in package.json: {"file:/tmp/tmp.fVrQA21vU8/local-hooked-dep-1.0.0.tgz":true}
-- npm rebuild after approve (exit 0)
   dep:preinstall saw SECRET_TOKEN
   dep:install saw SECRET_TOKEN
   dep:postinstall saw SECRET_TOKEN
-- npm ci after approve (exit 0)
   root:preinstall saw SECRET_TOKEN
   dep:preinstall saw SECRET_TOKEN
   dep:install saw SECRET_TOKEN
   dep:postinstall saw SECRET_TOKEN
   root:postinstall saw SECRET_TOKEN
   root:prepare saw SECRET_TOKEN
```

What it shows:

- npm 11 runs a dependency's install scripts on both `install` and `ci`, with the
  full environment of the shell or CI job. npm 12 skips them and still exits 0:
  the only signal is a warning.
- The dependency's `prepare` never ran for a tarball dependency. Per the npm docs
  a dependency's `prepare` runs when it comes from git or is installed as a
  linked folder (`npm install <folder>`); a tarball is already "prepared".
- Order changed between majors: npm 11 runs the root `preinstall` after the
  dependencies were installed, npm 12 before (a listed breaking change in 12.0.0).
- `--ignore-scripts` skips `pre`/`post` hooks of `npm test` but still runs `test`
  itself.
- For a `file:` dependency, `approve` keyed the entry by the resolved file path
  (here an absolute temp path); for registry packages the docs say it writes a
  pinned `name@version` key.
