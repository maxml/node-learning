# Тестування: експерименти

Код за позначками «перевірено» в нотатках `Obsidian Vault/Engineering/General/Тестування/`:
`Види тестів.md`, `Тест-дублі.md`, `Тестування в Node.js.md`, `Інтеграційні тести.md`,
`Навантажувальне тестування.md`.

Середовище прогону 2026-10-30: Node.js 24.14.1 (локально) і 24.22.2 (образ `node:24`, для
`--test-randomize`, якого в 24.14 ще немає), Linux 6.8, Docker 29, PostgreSQL 18.6
(`postgres:18.6-alpine`), k6 2.3.0 (`grafana/k6:2.3.0`). npm-пакети з точними версіями в
`package.json`: supertest 7.3.1, pg 8.23.1, autocannon 8.0.0, vitest 5.0.5,
@stryker-mutator/core і @stryker-mutator/tap-runner 10.1.1. Залежності ставляться лише в цю теку.

2026-10-31 у `package.json` додано `overrides` для транзитивних залежностей, бо прямі вже на
останніх версіях, а виправлень у їхніх діапазонах немає:

| Пакет | Було → стало | Хто тягне | Advisory |
| --- | --- | --- | --- |
| `minimatch` | 10.2.6 → 11.0.3 | `@stryker-mutator/core` (`~10.2.4`), `glob` | GHSA-g3hv-75wg-m249 (DoS, виправлено в 11.0.1) |
| `glob` | 13.0.6 → 14.0.3 | `@stryker-mutator/tap-runner` (`~13.0.0`) | GHSA-3g3m-2fjr-6pw4 (обхід скасування через AbortSignal, `<=14.0.1`) |
| `qs` | 6.15.1 → 6.17.1 | `typed-rest-client@2.3.1` (точно `6.15.1`) через Stryker | GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g, GHSA-6pq8-jhm2-2vcw (DoS) |
| `hyperid` | 3.3.0 → 4.0.0 | `autocannon@8.0.0` (`^3`) | через `uuid@8.3.2`: GHSA-w5hq-g745-h8pq; `hyperid` 4 бере `crypto.randomUUID` |

`npm audit`: 0. Після оновлення перезапущено `npm test` (24 тести: 23 pass, 1 skip),
`npm run coverage` (100/100), `npm run mutation:weak` (55,56: 5 вбито, 4 вижили, ті самі
чотири мутанти), `npm run mutation:strong` (100,00: 9 вбито), `npm run vitest` (2 pass):
результати збігаються з наведеними нижче. `load/compare.mjs` не перезапускали: `hyperid` в
autocannon лише генерує id для `[<id>]`, якого `load/` не використовує.

Машина спільна з іншими процесами, тож абсолютні мілісекунди шумні; напрям і порядок
величини відтворюються, точні числа ні.

## Запуск

```bash
npm ci
npm test                       # test/*.test.{js,mjs,ts}: 24 тести, 23 pass, 1 skip (module mocks без прапорця)
npm run test:module-mocks      # esm-mocking.test.mjs з --experimental-test-module-mocks
IMPL=b node --test test/doubles.test.js          # рефакторинг: mockist-тест червоний, classicist зелений
npm run coverage               # 100% рядків і гілок на слабкому тесті
npm run mutation:weak          # Stryker на тому самому слабкому тесті
npm run mutation:strong        # Stryker на тесті з точними значеннями й межами
npm run vitest                 # vi.mock і fake timers у Vitest 5
node --test --test-reporter=spec pitfalls/async.test.js              # навмисно хибні async-тести
node --test pitfalls/isolation-*.test.js                             # зелені в окремих процесах
node --test --test-isolation=none pitfalls/isolation-*.test.js       # червоні в одному процесі
docker run --rm -v "$PWD":/w -w /w node:24 node --test --test-random-seed=1 pitfalls/order.test.js

docker run -d --name kb-testing-pg --label kb.example=testing -e POSTGRES_PASSWORD=test \
  -p 127.0.0.1:55444:5432 postgres:18.6-alpine
npm run test:integration       # integration/rollback.test.js
node integration/bench-cleanup.js
docker rm -f kb-testing-pg

node load/compare.mjs          # потребує Docker і образ grafana/k6:2.3.0; ~2 хв
```

## Файли

| Файл | Що показує |
| --- | --- |
| `src/order-service.js`, `test/doubles.test.js` | п'ять дублів Месароша на одному сервісі; classicist проти mockist; `IMPL=b` це рефакторинг без зміни поведінки |
| `src/retry.js`, `test/timers.test.js` | `mock.timers` для `setTimeout` і `Date`; чому один `tick(сума)` не проганяє ланцюжок async-затримок; посилання, взяте до `enable()`, лишається справжнім таймером |
| `src/esm/*`, `test/esm-mocking.test.mjs` | namespace ESM-модуля не патчиться; `mock.module` лише з прапорцем і лише для модулів, злінкованих після мока |
| `src/cjs/*`, `test/cjs-mocking.test.js` | `mock.method` на `module.exports` не діє на того, хто деструктурував функцію при `require` |
| `src/app.js`, `test/http.test.js` | supertest проти `http.Server` і те саме через `fetch` + `listen(0)` |
| `test/snapshot.test.js` (+ `.snapshot`) | snapshot у `node:test`; файл згенеровано `--test-update-snapshots` |
| `test/typed.test.ts`, `pitfalls/enum.test.ts` | type stripping: типи стираються без перевірки; `enum` не стирається |
| `src/discount.js`, `test/discount*.test.js`, `stryker.*.config.json` | 100% покриття проти mutation score |
| `pitfalls/async.test.js` | забутий `await`, асерт у колбеку після завершення тесту, «вільний» відхилений проміс |
| `pitfalls/order.test.js`, `pitfalls/isolation-*.test.js`, `src/registry.js` | залежність від порядку й від спільного процесу |
| `integration/*` | PostgreSQL: rollback на тест і його три брехні; вартість ROLLBACK / TRUNCATE / DELETE; test data builder |
| `load/*` | один затик сервера на 1 с, виміряний закритою й відкритою моделлю навантаження |
| `vitest/greeting.test.mjs` | `vi.mock` під статичним імпортом працює, бо Vitest переписує файл |

## Результати 2026-10-30

### Дублі: classicist проти mockist (`test/doubles.test.js`)

```
IMPL=a: tests 3, pass 3
IMPL=b (orders.insertMany([order]) замість orders.save(order), поведінка та сама):
  ✔ classicist: order is stored and one mail is sent
  ✖ mockist: service calls nextId, save and send with exact arguments
      + 'insertMany',  - 'save'
```

### Fake timers (`test/timers.test.js`)

```
✔ retry: 3 attempts with 1 s + 2 s backoff finish without real waiting
ℹ real elapsed ms: 24.9 (fake elapsed: 5000)
ℹ fired after fake tick: {"global":true,"moduleProperty":true}      ← capturedAtLoad не спрацював
```

Після `tick(3000)` (сума затримок) друга спроба відбулась, а третя ні: другий `setTimeout`
створюється лише після продовження промісу, тобто на фейковому часі 3000, і спрацьовує на 5000.
Файл іде ~1,5 с замість ~0,3 с: справжній 1-секундний таймер `sleepCaptured` тримає процес.

### ESM і CJS (`test/esm-mocking.test.mjs`, `test/cjs-mocking.test.js`)

```
без прапорця:
ℹ namespace 'hour' descriptor: writable=true configurable=false; frozen-like: isExtensible=false
ℹ mock.method on namespace: TypeError: Cannot redefine property: hour
ℹ flag=false typeof t.mock.module=undefined
з --experimental-test-module-mocks:
ExperimentalWarning: Module mocking is an experimental feature and might change at any time
ℹ static import: "Good afternoon, Ann" | cached dynamic: "Good afternoon, Ann" | fresh: "Good morning, Ann"
CJS:
✔ mock.method on module.exports reaches mailer.send(...) callers
✔ ...but not callers that destructured send at require time
```

«static» і «cached» показують справжню годину (прогін був після полудня), «fresh» показує мок.
Опція `exports` у `mock.module` з'явилась у 24.15.0; на 24.14.1 вона мовчки ігнорується, і мок
не має жодного експорту (`SyntaxError: ... does not provide an export named 'hour'`). Тому
тут `namedExports`; на 24.22.2 той самий файл дає
`DeprecationWarning: mock.module(): options.namedExports is deprecated. Use options.exports instead.`

### Snapshot

```
перший прогін без файлу: Error [ERR_INVALID_STATE]: ... Cannot read snapshot file ... --test-update-snapshots  (exit 1)
--test-update-snapshots: exit 0, створено test/snapshot.test.js.snapshot
наступний прогін: exit 0
```

### TypeScript (`test/typed.test.ts`, `pitfalls/enum.test.ts`)

```
typed.test.ts з import у пакеті "type": "commonjs":
  SyntaxError: Cannot use import statement outside a module   ← .ts підкоряється "type" так само, як .js
typed.test.ts з require(): pass (хибна анотація string для числа не помічена)
enum.test.ts: SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
```

### Покриття проти мутацій

```
npm run coverage  (test/discount.test.js):
ℹ  discount.js | 100.00 | 100.00 | 100.00 |      exit 0
той самий файл лише з першим тестом і порогами 100:
ℹ Error: 85.71% line coverage does not meet threshold of 100%.
ℹ Error: 66.67% branch coverage does not meet threshold of 100%.       exit 1

npm run mutation:weak   (той самий тест, 100% покриття)
[Survived] if (true)                         [Survived] if (isMember && true)
[Survived] if (isMember || total >= 100)     [Survived] if (isMember && total > 100)
Mutation score 55.56: 9 мутантів, 5 вбито, 4 вижили

npm run mutation:strong (5 точних кейсів, межа 99/100, member true/false)
Mutation score 100.00: 9 вбито, 0 вижило
```

### Async-пастки (`pitfalls/async.test.js`, тест 4 пропущено через `--test-skip-pattern`)

```
process isolation (типово):
ok 1 - 1. forgotten await on assert.rejects
ok 2 - 2. assertion inside a callback that runs after the test returned
ok 3 - 3. fire-and-forget rejection inside code under test
# Error: Test "1. ..." generated asynchronous activity after the test ended. This activity created the error
  "AssertionError [ERR_ASSERTION]: Missing expected rejection." and would have caused the test to fail,
  but instead triggered an unhandledRejection event.
# (те саме для 3 з "audit write failed" і для 2 з uncaughtException)
not ok 1 - pitfalls/async.test.js   failureType: 'testCodeFailure'  exitCode: 1
# tests 4  # pass 3  # fail 1          ← «fail» це файл, а не тест

--test-isolation=none:
# tests 3  # pass 3  # fail 0      exit=1   ← звіт зелений, код виходу червоний
```

### Порядок і ізоляція

```
isolation-a + isolation-b, процес на файл (типово):  exit 0
--test-isolation=none:  ✔ a: switches currency to EUR   ✖ b: default currency is UAH   exit 1

order.test.js, порядок оголошення: 3 pass
--test-random-seed=1..8 (Node 24.22.2): seed 1,5,6,8 → pass 2 fail 1; seed 2,3,4,7 → pass 3
```

### PostgreSQL: rollback на тест (`integration/rollback.test.js`)

```
✔ 1. code that takes its own pooled connection cannot see the fixture
ℹ fixture id=1 visible to test connection only; READ COMMITTED hides it from the pool
✔ 2. code that COMMITs itself commits the test transaction: rollback does nothing
ℹ server notices: ["there is already a transaction in progress"]
✔ 2b. ...and the rows of test 2 survived the ROLLBACK
ℹ rows left behind by test 2: 2
✔ 3. a DEFERRED foreign key is never checked, because COMMIT never happens
ℹ insert with a dangling FK accepted inside the test transaction
ℹ on COMMIT: 23503 insert or update on table "transfers" violates foreign key constraint "transfers_to_id_fkey"
```

### Вартість очищення між тестами (`integration/bench-cleanup.js`, 200 раундів, 10 рядків на таблицю)

| стратегія | таблиць | p50, мс | p95, мс | разом на 200 тестів, с |
| --- | ---: | ---: | ---: | ---: |
| ROLLBACK | 2 | 0,74 | 2,51 | 0,19 |
| TRUNCATE … RESTART IDENTITY | 2 | 13,9 | 19,6 | 2,84 |
| DELETE (запит на таблицю) | 2 | 4,23 | 7,09 | 0,91 |
| ROLLBACK | 40 | 0,65 | 1,01 | 0,14 |
| TRUNCATE | 40 | 207 | 281 | 42,4 |
| DELETE | 40 | 79,4 | 127 | 17,3 |

Другий прогін: ROLLBACK 0,62 / 0,67 мс p50 (2 / 40 таблиць), TRUNCATE 17,1 / 235 мс,
DELETE 5,33 / 80,8 мс; разом на 200 тестів 0,14 / 0,17 с, 4,0 / 47,4 с, 1,25 / 16,6 с.
DELETE тут іде окремим запитом на кожну таблицю, тобто 40 мережевих обмінів; ціна TRUNCATE
росте з кількістю таблиць, бо він створює нове сховище для кожної таблиці й індексу:

```
create table tt(id int primary key); insert into tt values (1);   -- окремими транзакціями
pg_relation_filenode('tt'), ('tt_pkey') до TRUNCATE:    101397 | 101401
після TRUNCATE:                                         101403 | 101404
```

### Навантаження: один затик на 1 с (`load/compare.mjs`)

Сервер відповідає за частки мілісекунди; через 5 с після першого запиту він один раз блокує
event loop на 1000 мс. 15 с прогону. Чотири прогони (для відкритої моделі k6 три: перший
був з `preAllocatedVUs: 200`, див. нижче), діапазон по прогонах, латентність у мс:

| інструмент і модель | запитів | семплів у гістограмі | avg | p50 | p90 | p99 | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| autocannon `-c 10` (закрита) | 40 572–67 906 | = запитам | 1,7–3,2 | 1–2 | 3–6 | 9–18 | 1003–1011 |
| autocannon `-c 10 -R 1000` з «корекцією CO» | 14 084–14 204 | 31 978–47 649 (у трьох прогонах, де рахували) | 67–160 | 2–4 | 179–685 | 925–973 | 1002–1010 |
| autocannon `-c 10 -R 1000 -C` (без корекції) | 14 043–14 162 | = запитам | 2,1–5,6 | 1–3 | 3–10 | 8–25 | 1002–1009 |
| k6 `constant-vus` 10 (закрита) | 20 804–52 642 | | 2,7–6,9 | 1,9–5,0 | 4,7–12,7 | 10,3–25,7 | 1004–1014 |
| k6 `constant-arrival-rate` 1000/s (відкрита) | 14 872–15 000 | | 69–451 | 0,7–21 | 283–1112 | 877–7086 | 1000–7124 |

Перший прогін k6 з `preAllocatedVUs: 200` дав `dropped_iterations` 557: VU, що створюються
під час прогону, не встигають за затиком. З `preAllocatedVUs: 1500` у двох прогонах 0, у
третьому 129. Третій прогін k6 (max 7,1 с) аномальний; 7 с = 1 + 2 + 4 с, що схоже на
повтори SYN при переповненій черзі прийому з'єднань, але це не перевірено.

Чому «корекція» autocannon не збігається з відкритою моделлю: у `lib/run.js` 8.0.0
очікуваний інтервал для `recordValueWithExpectedInterval` рахується як `Math.ceil(1 / rate)`,
де `rate` це запитів на секунду на з'єднання, а гістограма в мілісекундах. Для будь-якого
`rate ≥ 1` інтервал виходить 1 мс, тож кожна відповідь на 1000 мс додає ~1000 синтетичних
семплів замість ~10 (при 100 запитах/с на з'єднання). Це висновок з читання коду й
кількості семплів вище, з мейнтейнерами не звірено.
