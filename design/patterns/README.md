# Патерни, чистий код, Twelve-Factor: експерименти

Код, на який спираються позначки «перевірено» в нотатках
`Obsidian Vault/Engineering/General/Дизайн коду/`: «Патерни проєктування», «Чистий код»,
«Twelve-Factor App». Усі прогони 2026-10-30.

Оточення: Node v24.14.1, npm 11.12.1 (хост); Docker 29.7.2, образ `node:24`
(усередині Node v24.22.2, npm 11.19.1).

| Пакет | Версія | Для чого |
| --- | --- | --- |
| `@typescript/native` → `npm:typescript@7.0.2` | 7.0.2 | `tsc`: декоратори й `typecheck` |
| `@types/node` | 24.19.2 | типи Node для `typecheck` |
| `typescript` → `npm:@typescript/typescript6@6.0.2` | 6.0.x | compiler API, потрібний `eslint-plugin-sonarjs` (з TS 7 він падає: `ts-api-utils` не знаходить `TypeFlags`) |
| `eslint` | 10.14.0 | правило `complexity` |
| `eslint-plugin-sonarjs` | 4.2.2 | правило `cognitive-complexity` |
| `pino` | 10.4.0 | JSON-логи в stdout |
| `dotenv` | 18.0.9 | порівняння з `--env-file` |
| `minimatch` (транзитивна, через `overrides`) | 11.0.3 | див. нижче |

`overrides.minimatch = 11.0.3` (2026-10-31): `eslint` 10.14.0 і `eslint-plugin-sonarjs` 4.2.2
тягнуть `minimatch@^10`, а advisory GHSA-g3hv-75wg-m249 (DoS через globparts) виправлено
лише в 11.0.1; виправлених релізів цих пакетів ще немає. Після override `npm audit` = 0,
вивід `npm run complexity` не змінився, `typecheck`/`gof`/`singleton`/`decorators` виходять
з кодом 0. Прибрати override, коли ESLint і sonarjs перейдуть на `minimatch@11`.

```bash
npm ci
npm run gof            # creational / structural / behavioral
npm run typecheck      # tsc 7.0.2 --strict над gof/*.ts і twelve-factor/config.ts: 0 помилок
npm run singleton      # кеш модулів як «синглтон»
npm run decorators     # GoF Decorator проти декораторів TS
npm run complexity     # цикломатична проти когнітивної складності
bash twelve-factor/shutdown/run.sh   # SIGTERM і PID 1 у Docker (з теки shutdown/ чи будь-якої)
```

Файли `gof/*.ts` запускаються прямо Node через type stripping, тому в них лише стирані
конструкції TS (без `enum`, параметрів-властивостей і декораторів).

## 1. `gof/`: патерни в ідіомах Node/TS

`node gof/creational.ts`:

```
factory: FakeS3Store pdf-bytes
builder: {
  text: 'SELECT * FROM users WHERE tenant_id = $1 AND active = $2 LIMIT 10',
  values: [ 7, true ]
}
builder invariant: from() is required
options object: { baseUrl: 'https://api.example', timeoutMs: 5000, retries: 2 }
prototype: template.tags = [ 'a', 'b' ] deep.tags = [ 'a' ]
```

Spread копіює поверхово: `push` у копію змінив масив шаблону; `structuredClone` ні.

`node gof/structural.ts`:

```
adapter: { id: 'm-a@x.io' }
decorator: { id: 'ok-b@x.io' } log lines: 1
facade: 1
  gof proxy: access to balance()
gof proxy: 100
  proxy: access to balance()
js proxy: TypeError - Cannot read private member #balance from an object whose class did not declare it
composite: [ 'min 12', 'digit' ] []
```

Ключовий рядок: вбудований `Proxy` над класом з `#private` ламає методи, бо `this` у
методі стає проксі, а приватне поле живе лише на справжньому об'єкті. Явна обгортка
(GoF-проксі) працює.

`node gof/behavioral.ts`:

```
strategy: 0 7
observer order: before emit -> prepended -> first -> second -> after emit
observer throw: listener a failed | ran: [ 'a' ]
observer 'error' w/o listener: boom
observer async: emit() returned true | captured as 'error': async listener failed
observer defaultMaxListeners: 10
command: v2 -> undo -> v1
command (snapshot at creation, bug): v2 -> undo -> Draft
template method: [ 'A', 'B' ] | function: [ 'A', 'B' ]
chain anon: 401 timing> auth stops <timing
chain authed: 200 timing> handler <timing
chain forgot await: status right after app() = undefined | trace: log> <log
iterator: [
  { offset: 0, limit: 10 },
  { offset: 10, limit: 10 },
  { offset: 20, limit: 5 }
]
iterator lazy (helpers): [ 0, 20, 40 ]
iterator helpers available: true
```

- `EventEmitter` викликає слухачів синхронно, у порядку реєстрації, всередині `emit()`;
  слухач, що кинув виняток, зупиняє решту, і виняток летить у того, хто викликав `emit()`.
- Відхилений проміс async-слухача `emit()` не бачить; з `captureRejections: true` він
  стає подією `'error'`.
- Команда, що знімає стан для `undo` при створенні, а не при виконанні, відкочує не туди.
- Middleware без `await next()` завершується раніше за внутрішню ланку: статус ще не
  встановлено, коли зовнішній код уже вважає запит обробленим.

## 2. `singleton/`: кеш модулів

`node singleton/run.mjs`:

```
1. require twice, same path:      same object = true | ids 9f5z56 9f5z56
2. import of CJS vs require:      same object = true
3. state leaks to the next 'test': b.inc() = 3 (expected 1 in a fresh process)
4. same code, another path:       same object = false | ids 9f5z56 ds2ulw
5. after delete require.cache:    same object = false | fresh.inc() = 1
6. ESM import twice:              same instance = true
7. ESM import with ?query:        same instance = false
```

Кеш ключується розв'язаним шляхом файлу (для ESM URL зі query), а не «класом». Дві копії
пакета в різних `node_modules` дають два «синглтони» (рядок 4).

## 3. `decorators/`: GoF Decorator проти декораторів мови

`node decorators/run.mjs` (шляхи скорочено):

```
tsc standard.ts (no flag) -> node: exit=0
    [standard] call greet(Ann)
    standard: hi Ann
tsc legacy.ts WITHOUT experimentalDecorators: exit=1
    decorators/legacy.ts(13,3): error TS1241: Unable to resolve signature of method decorator when called as an expression.
      The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
    decorators/legacy.ts(13,4): error TS1270: Decorator function return type 'PropertyDescriptor' is not assignable to type 'void | ((name: string) => string)'.
tsc legacy.ts --experimentalDecorators -> node: exit=0
    [legacy] call greet(Bob)
    legacy: hi Bob
node v24.14.1 native.mjs (plain JS @decorator): exit=1
    file:///…/decorators/native.mjs:4
      @logged
      ^
    SyntaxError: Invalid or unexpected token
node v24.14.1 standard.ts (type stripping): exit=1
    file:///…/decorators/standard.ts:14
      @logged
      ^
    SyntaxError: Invalid or unexpected token
```

Два несумісні API декораторів у TS (стандартний `(value, context)` і legacy
`(target, key, descriptor)`), а сам V8 у Node 24 синтаксис `@` не розбирає.

## 4. `complexity/`: цикломатична проти когнітивної

`npm run complexity`:

```
complexity/samples.js
   5:8   warning  Function 'statusText' has a complexity of 6. Maximum allowed is 1                   complexity
   5:17  warning  Refactor this function to reduce its Cognitive Complexity from 1 to the 0 allowed   sonarjs/cognitive-complexity
  17:8   warning  Function 'shippingFee' has a complexity of 7. Maximum allowed is 1                  complexity
  17:17  warning  Refactor this function to reduce its Cognitive Complexity from 15 to the 0 allowed  sonarjs/cognitive-complexity
  38:8   warning  Function 'shippingFeeFlat' has a complexity of 6. Maximum allowed is 1              complexity
  38:17  warning  Refactor this function to reduce its Cognitive Complexity from 6 to the 0 allowed   sonarjs/cognitive-complexity

✖ 6 problems (0 errors, 6 warnings)
```

Плаский `switch` і вкладені `if` мають майже однакову
цикломатичну складність (6 і 7), а когнітивна різниться в 15 разів (1 і 15). Плоска версія з
guard clauses поводиться так само, як вкладена: 48 комбінацій входу, 0 розбіжностей
(команда нижче).

```bash
node -e 'import("./complexity/samples.js").then(({shippingFee:a, shippingFeeFlat:b})=>{let n=0,bad=0;
for (const len of [0,1,2]) for (const c of ["UA","PL"]) for (const t of [50,150]) for (const ex of [true,false]) for (const hz of [true,false]) {
 const o={items:Array.from({length:len},(_, i)=>({hazardous: hz && i===len-1})),country:c,total:t,express:ex}; n++; if(a(o)!==b(o)) bad++;}
console.log("cases",n,"mismatches",bad)})'
# cases 48 mismatches 0
```

## 5. `twelve-factor/`

### Конфіг: перевірка при старті й `--env-file`

```
$ env -i PATH=$PATH node twelve-factor/config.ts                # exit=1
Invalid configuration:
  - DATABASE_URL is required
$ env -i PATH=$PATH PORT=abc LOG_LEVEL=verbose node twelve-factor/config.ts   # exit=1
Invalid configuration:
  - PORT must be 1..65535, got "abc"
  - DATABASE_URL is required
  - LOG_LEVEL must be one of fatal|error|warn|info|debug|trace
$ env -i PATH=$PATH node --env-file=twelve-factor/app.env twelve-factor/config.ts
{"port":3000,"db":"localhost:5432","logLevel":"debug"}
$ env -i PATH=$PATH LOG_LEVEL=warn node --env-file=twelve-factor/app.env twelve-factor/config.ts
{"port":3000,"db":"localhost:5432","logLevel":"warn"}           # оточення перемагає файл
$ env -i PATH=$PATH node --env-file=missing.env -e 1            # exit=9
node: missing.env: not found
$ env -i PATH=$PATH node --env-file-if-exists=missing.env -p '"ok"'   # exit=0
missing.env not found. Continuing without it.
ok
```

`process.loadEnvFile()` і dotenv 18.0.9 (з `LOG_LEVEL=warn` в оточенні):

```
loadEnvFile: warn 3000                       # не перезаписує наявне
parseEnv: { A: '1', B: 'x y' }
◇ injected env (2) from twelve-factor/app.env   # рядок dotenv, іде в stderr
dotenv: warn 3000                            # не перезаписує наявне
◇ injected env (3) from twelve-factor/app.env
dotenv override: debug                       # override: true перезаписує
```

### Логи: `node twelve-factor/logging.mjs` (pino 10.4.0, `LOG_LEVEL=info`)

```
{"level":30,"time":"2026-10-30T16:21:30.964Z","service":"orders","requestId":"r-42","req":{"method":"POST","url":"/orders","headers":{"authorization":"[Redacted]"}},"msg":"request"}
{"level":50,"time":"2026-10-30T16:21:30.968Z","service":"orders","requestId":"r-42","err":{"type":"Error","message":"payment declined","stack":"Error: payment declined\n    at …"}, …,"msg":"order failed"}
```

`debug` не вийшов на рівні `info`; заголовок `authorization` замасковано; у stderr 0 рядків.

### Локалізація: `node twelve-factor/i18n.mjs`

```
plural en: 1=one 2=other 5=other 21=other
plural uk: 1=one 2=few 5=many 21=one 1.5=other
plural uk categories: one,few,many,other
number: 1 234,50 ₴ | $1,234.50
date: 31 жовтня 2026 р. о 00:30 | October 30, 2026 at 6:30 PM
icu: 78.2 | full data: німецька
global locale: [ 'en request got "Hallo"', 'de request got "Hallo"' ]
per-request locale: [ 'en request got "Hello"', 'de request got "Hallo"' ]
```

Глобальна «поточна мова» (як `i18n.setLocale` у старому прикладі курсу) між двома
конкурентними запитами дала англійському запиту німецький текст; `AsyncLocalStorage`
тримає мову на запит.

### Завершення: `bash twelve-factor/shutdown/run.sh` (Docker 29.7.2, `node:24`)

```
A node as PID 1, no SIGTERM handler          stop= 11.5s exit=137 handler_ran=0  PID1=node server.mjs
B node as PID 1, with handler                stop=  0.8s exit=0   handler_ran=1  PID1=node server.mjs
C --init (tini), no handler                  stop=  0.9s exit=143 handler_ran=0  PID1=/sbin/docker-init -- docker-entrypoint.sh node server.mjs
D npm start as PID 1, handler in node        stop=  1.5s exit=1   handler_ran=0  PID1=npm start
E sh -c 'node ...' (shell form), handler     stop= 11.0s exit=137 handler_ran=0  PID1=sh -c node server.mjs; echo after
```

- A: ядро не застосовує дію за замовчуванням до сигналу для PID 1, тож без обробника
  `SIGTERM` ігнорується, і через 10 с Docker шле `SIGKILL` (137 = 128 + 9).
- C: tini передає `SIGTERM`, Node помирає за дією за замовчуванням (143 = 128 + 15).
- D: дерево процесів `npm start` → `sh -c node server.mjs` → `node`. npm пересилає `SIGTERM`
  шелу, шел помирає, npm виходить з помилкою, і коли PID 1 зникає, ядро вбиває решту
  процесів контейнера. Обробник у Node не встигає: запити в польоті обірвано.
  Лог: `npm error signal SIGTERM`, `npm error command sh -c node server.mjs`.
- E: шел як PID 1 не пересилає сигнал дитині: повні 10 с і `SIGKILL`.
