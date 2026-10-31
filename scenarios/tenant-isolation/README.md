# Сценарій: витік даних між тенантами в NestJS

Сценарна задача «Multi Tenant State Isolation»: сервіс NestJS тримає `tenantId` у полі,
guard записує його з автентифікованого запиту, репозиторій фільтрує ним запити. Під
конкурентним навантаженням користувачі зрідка отримують дані чужого тенанта.

Тут відтворено сам збій, п'ять виправлень, захист у БД (PostgreSQL RLS) і тест, який
ловить збій. Теорія лежить у нотатці бази знань «Витік даних між тенантами в NestJS».

## Версії (прогін 2026-10-31)

| Що | Версія |
| --- | --- |
| Node.js | 24.14.1 (Linux x64) |
| NestJS (`@nestjs/common`, `core`, `platform-express`) | 12.3.2 |
| nestjs-cls | 7.0.2 |
| pg (node-postgres) | 8.23.1 |
| TypeScript | 7.0.2 (`experimentalDecorators` + `emitDecoratorMetadata`, ESM) |
| autocannon | 8.0.0 |
| PostgreSQL | 18.6 (`postgres:18.6-alpine` у Docker) |

Після прогону (2026-10-31, вдень) у `package.json` додано `overrides.hyperid` = 4.0.0:
`autocannon@8.0.0` (остання версія) просить `hyperid@^3`, а той тягне `uuid@8.3.2`
(GHSA-w5hq-g745-h8pq, виправлено в `uuid` 11.1.1). `hyperid` 4 має той самий API і бере
`crypto.randomUUID` замість пакета `uuid`. `npm audit`: 0. У autocannon `hyperid` лише генерує
id для підстановки `[<id>]`, якої `bench.ts` не використовує, тож результати нижче лишаються
чинними; повний bench не перезапускали. Перевірено коротким прогоном
`DURATION=2 REPEAT=1 node dist/bench.js explicit,als` (memory): обидва варіанти без non-2xx
і помилок.

## Як запустити

```bash
npm ci
npm run db:up          # PostgreSQL 18.6 у Docker на 127.0.0.1:55435
npm run all            # build → setup → race → rls → als → test
npm run bench          # пропускна здатність, DB_MODE=memory (лише Nest і DI)
DB_MODE=pg npm run bench   # те саме з Postgres у циклі, плюс варіант rls
npm run db:down
```

Паролі в `src/config.ts` і `sql/schema.sql` це демо-значення для локального контейнера.

## Варіанти

`node dist/main.js <variant>` піднімає застосунок на випадковому порту.

| Варіант | Файл | Звідки репозиторій бере tenant |
| --- | --- | --- |
| `singleton` | `src/variants/singleton.ts` | поле синглтона `TenantContext.tenantId`, яке пише guard (**збій з умови**) |
| `explicit` | `src/variants/explicit.ts` | аргумент `TenantId` з `@CurrentTenant()`; `TenantScopedOrders` не створюється без нього |
| `request` | `src/variants/request.ts` | `Scope.REQUEST` провайдер з `@Inject(REQUEST)` |
| `als` | `src/variants/als.ts` | голий `AsyncLocalStorage`, `als.run()` у middleware, guard лише пише в store |
| `cls` | `src/variants/cls.ts` | `nestjs-cls`, `ClsMiddleware` (`mount: true`), guard пише `cls.set('tenant')` |
| `durable` | `src/variants/durable.ts` | `durable: true` + `ContextIdStrategy`: одне DI-піддерево на тенанта |
| `rls` | `src/variants/rls.ts` | явний `TenantId` → `set_config('app.tenant_id', $1, true)` у транзакції; SQL **без** `WHERE`, фільтрує RLS |
| `rls-singleton` | `src/variants/rls.ts` | RLS, але tenant для `set_config` береться з того самого поля синглтона |

Не-RLS варіанти ходять у БД суперкористувачем (він обходить RLS, як застосунок без RLS);
`rls*` ходять роллю `app_user` (не власник, `NOBYPASSRLS`). Кожна відповідь проходить
через `TenantResponseAudit`: interceptor порівнює `tenant_id` кожного рядка з тенантом
із `req.user` і рахує тривоги (`GET /stats`).

## Результати прогону 2026-10-31

### `npm run race`: 20 хвиль × 60 одночасних `GET /orders`, тенанти 1..3

```
{"variant":"singleton","requests":1200,"leakedResponses":790,"foreignRows":3950,"wrongRowCount":0,"errors":0,"serverAlarms":790,"constructed":{"TenantContext":1,"OrdersService":1,"OrdersController":1}}
{"variant":"explicit","requests":1200,"leakedResponses":0,"foreignRows":0,"wrongRowCount":0,"errors":0,"serverAlarms":0,"constructed":{"OrdersService":1,"OrdersController":1}}
{"variant":"request","requests":1200,"leakedResponses":0,"foreignRows":0,"wrongRowCount":0,"errors":0,"serverAlarms":0,"constructed":{"TenantContext":1200,"OrdersRepository":1200,"OrdersService":1200,"OrdersController":1200}}
{"variant":"als","requests":1200,"leakedResponses":0,"foreignRows":0,"wrongRowCount":0,"errors":0,"serverAlarms":0,"constructed":{"OrdersRepository":1,"OrdersService":1,"OrdersController":1}}
{"variant":"cls","requests":1200,"leakedResponses":0,"foreignRows":0,"wrongRowCount":0,"errors":0,"serverAlarms":0,"constructed":{"OrdersRepository":1,"OrdersService":1,"OrdersController":1}}
{"variant":"durable","requests":1200,"leakedResponses":0,"foreignRows":0,"wrongRowCount":0,"errors":0,"serverAlarms":0,"constructed":{"TenantContext":3,"OrdersRepository":3,"OrdersService":3,"OrdersController":3}}
{"variant":"rls","requests":1200,"leakedResponses":0,"foreignRows":0,"wrongRowCount":0,"errors":0,"serverAlarms":0,"constructed":{"OrdersService":1}}
{"variant":"rls-singleton","requests":1200,"leakedResponses":798,"foreignRows":3990,"wrongRowCount":0,"errors":0,"serverAlarms":798,"constructed":{"TenantContext":1}}
```

Інші навантаження на `singleton`:

| Навантаження | Витекло відповідей |
| --- | --- |
| 300 запитів по одному (`CONCURRENCY=1`) | 0 з 300 |
| 300 пар одночасних запитів (`CONCURRENCY=2`) | 300 з 600 (рівно половина) |
| те саме без штучної затримки (`SLOW_MS=0`, лише реальний обмін з БД) | 298 з 600 |
| 20 × 60, `SLOW_MS=0` | 817 з 1200 |

Interceptor-аудит побачив кожен витік (`serverAlarms` = `leakedResponses`).

### `npm run rls`

```
1. app_user, tenant never set: visible rows                          0
2. plain SET by request A, then request B forgets to set: B sees rows 5
3a. inside tx with SET LOCAL tenant 1: visible rows                  5
3b. next request on the same connection: visible rows                0
3c. ... and current_setting('app.tenant_id', true) is now            ""
4. SET LOCAL outside a transaction: notices                          ["WARNING: SET LOCAL can only be used in transaction blocks"]
   visible rows afterwards                                           0
5a. naive policy, fresh session, setting never touched: rows         0
5b. naive policy, pooled session after DISCARD ALL                   "22P02 invalid input syntax for type integer: \"\""
5c. naive policy, after one SET LOCAL transaction ended              "22P02 invalid input syntax for type integer: \"\""
6. tenant 1 inserts a row with tenant_id = 2                         "42501 new row violates row-level security policy for table \"orders\""
   tenant 1 can see id 6?                                            0
7. tenant 1 inserts id = 6 (row of tenant 2, invisible to tenant 1)  "23505 duplicate key value violates unique constraint \"orders_pkey\""
8a. superuser (postgres), no tenant set: visible rows                15
8b. non-superuser table owner, RLS enabled, no FORCE                 15
8c. same owner after FORCE ROW LEVEL SECURITY: rows                  0
```

### `npm run als`: де `AsyncLocalStorage` губить або підміняє контекст

```
1. callback queue                                                  [{"request":1,"sawTenant":1},{"request":2,"sawTenant":1}]
1. callback queue + AsyncResource.bind                             [{"request":1,"sawTenant":1},{"request":2,"sawTenant":2}]
2. EventEmitter listener                                           [{"registeredBy":1,"sawTenant":2}]
2. EventEmitter listener + AsyncResource.bind                      [{"registeredBy":1,"sawTenant":1}]
3a. pg Pool promise API, queued checkout                           [{"request":1,"afterConnect":1},{"request":2,"afterConnect":2},{"request":3,"afterConnect":3}]
3b. pg Pool callback API, queued query                             [{"request":1,"inCallback":1,"err":false},{"request":2,"inCallback":1,"err":false},{"request":3,"inCallback":1,"err":false}]
4a. enterWith in handler, Node default (AsyncContextFrame)         {"requestA_sawBefore":null,"requestB_sawBefore":null}
4b. same with --no-async-context-frame (pre-24 behaviour)          {"requestA_sawBefore":null,"requestB_sawBefore":"A"}
```

Контекст не губиться, а **підміняється** на контекст іншого запиту: колбек з черги
виконується в контексті того, хто звільнив ресурс (випадок 1 і 3b, pg 8.23.1 з `max: 1`).

### `npm test` (12 тестів, усі зелені)

```
✔ TenantId only from a verified user with a positive integer tenant
✔ TenantScopedOrders rejects anything that is not a TenantId
✔ TenantId is immutable
✔ explicit: 0 cross-tenant responses under concurrency
✔ request: 0 cross-tenant responses under concurrency
✔ als: 0 cross-tenant responses under concurrency
✔ cls: 0 cross-tenant responses under concurrency
✔ durable: 0 cross-tenant responses under concurrency
✔ rls: 0 cross-tenant responses under concurrency
✔ singleton tenantId field: the concurrent test detects the leak
✔ RLS does not fix a wrong tenant source
✔ singleton tenantId field: sequential requests never show the bug
```

Мутації, перевірені вручну (гард прибрано, тест став червоним, гард повернуто):

| Мутація | Червоний тест |
| --- | --- |
| M1: прибрати `instanceof TenantId` у конструкторі `TenantScopedOrders` | `TenantScopedOrders rejects anything that is not a TenantId` |
| M2: `als.run(SHARED, next)`, один store-об'єкт на всі запити | `als: 0 cross-tenant responses under concurrency` |

### `npm run bench`: ціна виправлень

autocannon, 50 з'єднань × 10 с, 3 переміжні проходи, медіана. Машина спільна й
навантажена (12 ядер, load average 6–13 під час прогонів), тож точні числа шумні;
стабільним між чотирма прогонами був лише порядок.

`DB_MODE=memory` (хендлер майже порожній, видно лише ціну Nest і DI):

| Варіант | req/s | p99, мс | відносно `explicit` |
| --- | --- | --- | --- |
| explicit | 4640 | 28 | 1.00 |
| als | 5315 | 20 | 1.15 (у межах шуму; в іншому прогоні 0.91) |
| cls | 3109 | 34 | 0.67 |
| durable | 3271 | 30 | 0.70 |
| request | 2922 | 32 | 0.63 |

`DB_MODE=pg` (два запити до Postgres на HTTP-запит, пул 10; `rls` робить п'ять обмінів:
lookup, `BEGIN`, `set_config`, `SELECT`, `COMMIT`):

| Варіант | req/s | p99, мс | відносно `explicit` |
| --- | --- | --- | --- |
| explicit | 1229 | 106 | 1.00 |
| als | 1058 | 86 | 0.86 |
| cls | 979 | 127 | 0.80 |
| durable | 1049 | 97 | 0.85 |
| request | 776 | 137 | 0.63 |
| rls | 492 | 263 | 0.40 |

Діапазон медіан за чотири прогони того дня (три `memory`, з них два попередні, вивід яких
тут не наведено, і один `pg`): `request` 0.57–0.63, `cls` 0.65–0.80, `durable` 0.70–0.85,
`als` 0.86–1.15. Найперший одиночний прохід без повторів (на ранній версії скрипта) у
діапазон не входить: у ньому `request` дав 0.49, `cls` 0.55, `durable` 0.62.
