# Тестування коду з MongoDB

Експерименти для розділу «Тестування коду з MongoDB» у `Практики MongoDB.md` і для
«Фільтр орендаря в одній точці» у `Мультитенантність у MongoDB.md`
(`Obsidian Vault/Engineering/General/Mongo/`).

Версії зафіксовано точно в `package.json`: `mongodb` 7.7.0, `mongoose` 9.11.4,
`mongodb-memory-server-core` 11.3.0, `@testcontainers/mongodb` і `testcontainers` 12.2.1.
Сервер MongoDB 9.0.4 в обох бекендах. Тести на вбудованому `node:test` (Node 24.14.1).

2026-10-31 у `package.json` додано `overrides` для транзитивних залежностей
`testcontainers@12.2.1` (остання версія) → `archiver@7.0.1`: `glob` 10.5.0 → 14.0.3 (через
`archiver-utils`), `readdir-glob` 1.1.3 → 3.0.0, `minimatch` 9.0.9/5.1.9 → 11.0.3. Advisory:
GHSA-g3hv-75wg-m249 (`minimatch` < 11.0.1, DoS) і GHSA-3g3m-2fjr-6pw4 (`glob` 9–14.0.1).
`archiver@8` з виправленими залежностями не підходить: він лише ESM і без фабрики
`archiver('tar')`, яку викликає `testcontainers`. `npm audit`: 0. Перевірено після
оновлення: `npm test` 14/14 pass (16,6 с); Testcontainers-бекенд 14/14 pass (51,8 с), але на
локальному образі `mongo:8` (`MONGO_IMAGE=mongo:8`), бо `mongo:9` на машині вже не було;
шлях `archiver` (tar з `append`, `directory`, `glob`, яким `@testcontainers/mongodb` копіює
keyfile) окремо прогнано скриптом поза репозиторієм, `tar -t` читає архів. Числа нижче з
прогону 2026-10-30 і не перераховувались.

| Файл                          | Що перевіряє                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/servers.js`              | три способи підняти `mongod`: Testcontainers (replica set), MMS replica set, MMS standalone       |
| `lib/app.js`                  | код «застосунку»: check-then-insert реєстрація, спільні визначення індексів, запит замовлень     |
| `lib/tenant.js`               | scoped-репозиторій і guard над колекцією драйвера, що вимагає рівність `tenantId`               |
| `test/unique-race.test.js`    | (a) гонка унікальності; мутація `SKIP_INDEXES=1`                                               |
| `test/transactions.test.js`   | (b) транзакція й change stream на replica set і на standalone                                   |
| `test/tenant.test.js`         | (c) guard, scoped-репозиторій, `$jsonSchema` з `required: ["tenantId"]`, що обходить плагін Mongoose |
| `test/isolation.test.js`      | `deleteMany` проти `dropDatabase`, ціна скидання, Mongoose `unique` без `init()`                 |
| `test/explain.test.js`        | закріпити індекс через `explain`; мутація `SKIP_INDEXES=1`                                      |
| `bench/startup.js`            | (d) час старту бекендів                                                                         |
| `bench/tc-direct-connection.js` | рядок підключення Testcontainers з `directConnection=true` і без нього                       |

## Запуск

```bash
cd examples/mongo/testing
npm ci                      # лише в цьому каталозі
npm test                    # 14 тестів, бекенд mongodb-memory-server (replica set)
BACKEND=testcontainers RS_BACKEND=testcontainers npm test   # те саме на Testcontainers (потрібен Docker і образ mongo:9)
SKIP_INDEXES=1 node --test --test-reporter=tap test/unique-race.test.js test/explain.test.js   # мутація: має бути червоним
RUNS=5 node bench/startup.js mms-standalone,mms-replset,testcontainers,testcontainers-fast-hc
node bench/tc-direct-connection.js
```

Бінарник `mongod` 9.0.4 (архів ~145 МБ, на диску 293 МБ) MMS завантажує при першому старті в `.mongodb-binaries/`
(задано в `package.json` → `config.mongodbMemoryServer`; каталог у `.gitignore`).
Testcontainers запускається з `TESTCONTAINERS_RYUK_DISABLED=true`, щоб не тягнути образ
`testcontainers/ryuk`; контейнери мають ім'я `kb-mongo-testing-*`, мітку
`kb.example=mongo-testing` і випадковий порт, `stop()` їх видаляє. Перевірка, що нічого не
лишилось: `docker ps -a --filter label=kb.example=mongo-testing`.

## Результати прогону 2026-10-30

Одна машина, бінарник і образ уже в кеші, якщо не сказано інше.

### Набір тестів

```
npm test                                         # 14 / 14 pass, 12,1 с
BACKEND=testcontainers RS_BACKEND=testcontainers # 14 / 14 pass, 40,6 с
```

### (a) Гонка унікальності

```
з createIndexes у setup:
ok 1 - sequential duplicate is rejected
# created=1 ok=1/20
ok 2 - concurrent duplicates: exactly one user is created

SKIP_INDEXES=1:
ok 1 - sequential duplicate is rejected            ← вакуумний тест: зелений і без індексу
# created=18 ok=18/20
not ok 2 - concurrent duplicates: exactly one user is created
```

### (b) Транзакції потребують replica set

```
ok 1 - replica set: transaction commits
# MongoServerError code=undefined msg="This MongoDB deployment does not support retryable writes. Please add retryWrites=false to your connection string."
# originalError: code=20 codeName=IllegalOperation errmsg="Transaction numbers are only allowed on a replica set member or mongos"
ok 2 - standalone: transaction fails; driver 7.7 hides IllegalOperation (code 20)
# MongoServerError code=40573 msg="The $changeStream stage is only supported on replica sets or mongos"
ok 3 - standalone: change stream fails with code 40573
```

Окремий прогін з `?retryWrites=false` у рядку підключення дав те саме повідомлення про
`retryWrites=false`: порада драйвера хибна, справжня причина у вкладеній помилці.

### (c) Фільтр орендаря

```
ok 1 - guard rejects a query without tenantId
ok 2 - scoped repository cannot express a cross-tenant query
# insert without tenantId: code=121
ok 3 - $jsonSchema rejects a write without tenantId (code 121)
# {"find":"blocked","findOne":"blocked","countDocuments":"blocked","estimatedDocumentCount":"blocked",
#  "distinct":"blocked","updateMany":"blocked","deleteMany (no match)":"blocked","findOneAndUpdate":"blocked",
#  "aggregate":"blocked","query .where().ne()":"blocked","bulkWrite updateMany":"BYPASSED",
#  "Model.collection.find":"BYPASSED","conn.db.collection().find":"BYPASSED"}
ok 4 - Mongoose plugin: which operations it covers and which bypass it
```

Мутація в `lib/tenant.js` (`if ("tenantId" in filter)` замість рівності на рядок, внесено
й відкочено вручну): тести 1 і 4 червоні, `{ tenantId: { $ne: "t1" } }` і
`.where("tenantId").ne("t1")` пройшли.

### Ізоляція (3 прогони, однаковий результат)

```
ok 1 - deleteMany between tests keeps the unique index
ok 2 - dropDatabase between tests silently removes the unique index
# per round: dropDatabase+createIndexes=176.3–177.3 ms, deleteMany=11.3–11.8 ms
# without init(): 2/2 inserts accepted; then init(): init failed: 11000
# after init(): 1/2 inserts accepted
```

### `explain`

```
# plan=LIMIT > FETCH > IXSCAN:tenant_status_createdAt keys=15 docs=15 n=15     ok
SKIP_INDEXES=1:
# plan=SORT > COLLSCAN keys=0 docs=5000 n=15                                    not ok
```

Перша версія seed не давала жодного відкритого замовлення для `t7` (`i % 10` і `i % 50`
несумісні), і тест пройшов як `0 === 0`. Тепер seed використовує `i % 7`, а тест перевіряє
`nReturned > 0`.

### (d) Старт до першого `ping`, 5 прогонів

| Бекенд                                   | ready, мс                       | stop, мс  |
| ---------------------------------------- | ------------------------------- | --------- |
| MMS standalone                           | 389, 271, 302, 288, 294         | 104–127   |
| MMS replica set (1 вузол)                | 666, 647, 1729, 682, 675        | 230–261   |
| Testcontainers (health check модуля, 5 с) | 6568, 6121, 6128, 6029, 6153    | 221–247   |
| Testcontainers, health check 300 мс      | 1638, 1439, 1566, 1591, 1573    | 220–243   |
| MMS standalone, перший старт із завантаженням 9.0.4 | 14 861                | 112       |

### Рядок підключення Testcontainers

```
{"uri":"mongodb://localhost:32770","ok":false,"error":"MongoServerSelectionError: getaddrinfo EAI_AGAIN 3779f7aab1b9"}
{"uri":"mongodb://localhost:32770/?directConnection=true","ok":true,"me":"3779f7aab1b9:27017"}
```
