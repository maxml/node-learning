# Приклади TypeScript

Код експериментів, на які спираються нотатки
`Obsidian Vault/Engineering/General/TypeScript/` (позначки «перевірено»).

Версії (прогін 2026-10-30, Node v24.14.1, npm 11.12.1):

| Пакет | Версія | Роль |
| --- | --- | --- |
| `@typescript/native` → `npm:typescript@7.0.2` | 7.0.2 | `tsc`, нативний компілятор (Go) |
| `typescript` → `npm:@typescript/typescript6@6.0.2` | шим 6.0.2, всередині `typescript@6.0.3` | `tsc6` і compiler API 6.0 для інструментів |
| `typescript-eslint` | 8.72.1 | type-aware lint (peer `typescript >=4.8.4 <6.1.0`) |
| `eslint` | 10.13.0 | |
| `zod` / `valibot` / `@standard-schema/spec` | 4.6.7 / 1.5.0 / 1.1.0 | валідація на межі |
| `openapi-typescript` (через `npx`, не в `package.json`) | 7.13.0 | OpenAPI → типи |
| `mongodb` / `mongoose` | 7.7.0 / 9.11.4 | типи драйвера й ODM (§9, без сервера) |
| `@types/aws-lambda` / `@aws-sdk/client-sqs` | 8.10.164 / 3.1160.0 | типи Lambda і SDK v3 (§9, без AWS) |
| `express` / `@types/express` / `fastify` | 5.3.0 / 5.0.6 / 5.12.7 | module augmentation `Request` (§9) |

Схема з двома аліасами це рекомендований спосіб із
[анонсу TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/):
`npx tsc` запускає 7.0, а все, що робить `import "typescript"` (typescript-eslint), отримує 6.0.
Шим `@typescript/typescript6@6.0.2` лише реекспортує залежність `typescript@^6`, тож
фактична версія компілятора 6.x визначається lock-файлом (тут 6.0.3).

```bash
npm ci
npm run flags      # кожен прапорець ловить свій баг (tsc 7 і tsc6)
npm run check      # tsc -p і tsc6 -p: soundness-holes, boundary, type-level, lint-demo = 0 помилок
npm run holes      # ті самі «чисті» файли падають у рантаймі
npm run boundary   # межа зі схемою: Zod, Zod strict, Valibot через Standard Schema
npm run erasable   # що робить type stripping Node з не-стираним синтаксисом
npm run lint       # strictTypeChecked знаходить те, що strict пропускає
npm run openapi    # OpenAPI 3.1 → openapi.d.ts
npm run backend    # §9: MongoDB, AWS, augmentation, using, instanceof, ESM ↔ CJS
```

## 1. `run-flags.mjs`: прапорець проти свого класу багів

Кожен `flags/<прапорець>.ts` компілюється двічі з `--ignoreConfig --strict false`:
з прапорцем `false` і `true`. Успіх = 0 помилок без прапорця, ≥ 1 з ним, і перша помилка
не з групи `TS5xxx` (помилки конфігурації). Для `exactOptionalPropertyTypes`,
`strictPropertyInitialization`, `noUncheckedIndexedAccess`, `strictBuiltinIteratorReturn`
базою є `strictNullChecks: true`: без нього перші два дають лише `TS5052`, а другі два
нічого не бачать. Перший прогін без цього правила показав два хибно-успішні випадки
(`TS5052` замість бага) і два провали; звідси перевірка на `TS5xxx`.

Результат (однаковий для `tsc` 7.0.2 і `tsc6` 6.0.3):

```
erasableSyntaxOnly                 off=0 on=2  TS1294 This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
exactOptionalPropertyTypes         off=0 on=1  TS2375 Type '{ name: undefined; }' is not assignable to type 'Patch' with 'exactOptionalPropertyTypes: true'.
noFallthroughCasesInSwitch         off=0 on=1  TS7029 Fallthrough case in switch.
noImplicitAny                      off=0 on=3  TS7006 Parameter 'items' implicitly has an 'any' type.
noImplicitOverride                 off=0 on=1  TS4114 This member must have an 'override' modifier ...
noImplicitReturns                  off=0 on=1  TS7030 Not all code paths return a value.
noImplicitThis                     off=0 on=1  TS2683 'this' implicitly has type 'any' ...
noPropertyAccessFromIndexSignature off=0 on=1  TS4111 Property 'DATABSE_URL' comes from an index signature ...
noUncheckedIndexedAccess           off=0 on=2  TS2532 Object is possibly 'undefined'.
strictBindCallApply                off=0 on=1  TS2345 Argument of type 'string' is not assignable to parameter of type 'number'.
strictBuiltinIteratorReturn        off=0 on=1  TS18048 'r.value' is possibly 'undefined'.
strictFunctionTypes                off=0 on=1  TS2322 Type '(d: Dog) => void' is not assignable to type 'Handler'.
strictNullChecks                   off=0 on=1  TS18048 'user' is possibly 'undefined'.
strictPropertyInitialization       off=0 on=1  TS2564 Property 'conn' has no initializer ...
useUnknownInCatchVariables         off=0 on=1  TS2339 Property 'message' does not exist on type 'unknown'.
verbatimModuleSyntax               off=0 on=1  TS1484 'User' is a type and must be imported using a type-only import ...
all flags catch their bug
```

`alwaysStrict` не перевірявся: у 7.0 його не можна вимкнути.

## 2. `soundness-holes.ts`: компілюється під `strict`, падає в рантаймі

`tsc -p` і `tsc6 -p` дають 0 помилок (`strict: true`), а `node soundness-holes.ts`:

```
arrayCovariance      TypeError: dogs[1].bark is not a function
methodBivariance     TypeError: d.bark is not a function
assertion            TypeError: Cannot read properties of undefined (reading 'toLowerCase')
hiddenAny            TypeError: cfg.retries.toFixed is not a function
indexAccess          TypeError: Cannot read properties of undefined (reading 'email')
narrowingAcrossCall  TypeError: Cannot read properties of null (reading 'length')
nonNull              TypeError: Cannot read properties of undefined (reading 'id')
```

## 3. `boundary.ts`: межа зі схемою

Тип виводиться зі схеми (`z.infer`), одна функція `parseAt` приймає будь-яку Standard
Schema (`schema["~standard"].validate`). Каст `as User` пропускає `age: "30"` як рядок:

```
valid          as-cast typeof age=number   zod: OK | zod strict: OK | valibot: OK
age as string  as-cast typeof age=string   zod: REJECT (age: Invalid input: expected number, received string)
                                           valibot: REJECT (age: Invalid type: Expected number but received "30")
bad uuid       as-cast typeof age=number   zod: REJECT (id: Invalid UUID) | valibot: REJECT (id: Invalid UUID: Received "42")
extra field    as-cast typeof age=number   zod: OK keys=id,email,age (isAdmin вирізано)
                                           zod strict: REJECT ((root): Unrecognized key: "isAdmin")
                                           valibot: OK keys=id,email,age (вирізано)
```

Брендований `UserId`: `loadUser("not-checked")` під `@ts-expect-error`. Мутація (прибрати
директиву) дає `TS2345: Argument of type 'string' is not assignable to parameter of type
'string & $brand<"UserId">'`.

## 4. `type-level.ts`: перевірки на рівні типів

Немає рантайм-виводу: `npm run check` з 0 помилок і є результатом. Хибне
`Expect<Equal<…>>` дає `TS2344`, зайве `@ts-expect-error` дає `TS2578`, тож тест не може
пройти порожньо. Два твердження, записані з пам'яті, впали при першому прогоні й
виправлені за компілятором:

- `satisfies Record<string, \`/${string}\`>` **зберігає** літерал `"/users/:id"` (а не
  розширює до `string`); анотація `: Record<…>` втрачає ключі (`keyof` = `string`).
- `interface P<out T> { set(v: T): void }` **не** дає помилки: методи біваріантні. TS2636
  з'являється лише для властивості-функції `set: (v: T) => void`. Після цього компілятор
  довіряє анотації: `P<"a">` приймається як `P<string>`.

Мутація: прибрати `@ts-expect-error` у `default` гілці `describe()` дає
`TS2345: Argument of type '{ kind: "refund"; of: string; }' is not assignable to parameter of type 'never'`.

## 5. `run-erasable.mjs`: type stripping Node v24.14.1

```
flags/verbatimModuleSyntax.ts  exit=1  SyntaxError: The requested module './types.ts' does not provide an export named 'User'
flags/erasableSyntaxOnly.ts    exit=1  SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
decorators.ts                  exit=1  SyntaxError: Invalid or unexpected token
```

## 6. `lint-demo.ts`: що бачить typescript-eslint і не бачить `strict`

`tsc -p` дає 0 помилок; `eslint` з `strictTypeChecked` (74 правила) і трьома правилами поза
пресетами (`switch-exhaustiveness-check`, `no-unsafe-type-assertion`,
`strict-boolean-expressions`) дає 14 помилок: `no-unsafe-assignment`,
`no-unsafe-member-access`, `no-unsafe-type-assertion`, `no-misused-promises`,
`no-floating-promises`, `no-non-null-assertion`, `no-unnecessary-type-assertion`,
`switch-exhaustiveness-check`, `strict-boolean-expressions`, `restrict-plus-operands`,
`restrict-template-expressions`, `no-explicit-any`.

Храповик через bulk suppressions ESLint (з v9.24), файл suppressions у тимчасовій теці:

```
eslint lint-demo.ts --suppress-all --suppressions-location $TMP/s.json  → exit 0, 14 записів
eslint lint-demo.ts --suppressions-location $TMP/s.json                 → exit 0
(лічильник no-explicit-any зменшено до 0 = нове порушення понад базу)     → exit 1, 1 error
(лічильник завищено = порушення виправлено, запис застарів)               → exit 2, «There are suppressions left that do not occur anymore…»
```

## 7. `tsc` 7.0.2 проти `tsc6` 6.0.3 на цьому проєкті

`tsc -p tsconfig.json`, 5 прогонів кожен, 12 ядер: `tsc` 332–384 мс, `tsc6` 2037–2767 мс
(≈ 6×). `--extendedDiagnostics` (є і в 7.0): 287 файлів, 139 847 рядків, з них 289 рядків
власного коду; решта це `lib` і `.d.ts` (`@types/node`, zod, valibot). Пам'ять 73 МБ проти
156 МБ. Застереження: проєкт крихітний, час здебільшого йде на розбір `.d.ts` і старт
процесу; на реальній кодовій базі співвідношення інше (Microsoft наводить 8–12× на
повній збірці).

## 8. `openapi.yaml` → `openapi.d.ts`

`npm install openapi-typescript@7.13.0` у цьому проєкті падає з `ERESOLVE`: пакет оголошує
peer `typescript ^5.x`, а тут 6.0. Через `npx --yes` (власне дерево з TS 5) генерація
працює, `openapi.d.ts` проходить `tsc` 7.0.2. `format: uuid` стає `string` з JSDoc-коментарем:
згенерований тип нічого не перевіряє в рантаймі.

## 9. Бекенд: `run-backend.mjs` (прогін 2026-10-30)

Для нотатки `TypeScript у бекенді` і розділу ESM ↔ CJS у `Strict mode і tsconfig`. Залежності
встановлено точними версіями (`npm install --save-exact --save-dev`). Сервер MongoDB і AWS не
потрібні: типи перевіряє `tsc -p tsconfig.backend.json`, рантайм-частина працює на підроблених
подіях і без мережі. Мутанти пишуться в тимчасову `.mutants/` і видаляються.

```bash
npm run backend          # = node run-backend.mjs
node mongo-types.ts      # окремі частини, якщо треба
node aws-events.ts
node augmentation.ts
node using.ts
node errors-dup.ts
node esm-interop/req.cjs
```

| Файл | Що показує |
| --- | --- |
| `mongo-types.ts` | `OptionalUnlessRequiredId` / `WithId`, проєкція й `findOne<T>` без перевірки форми, одруківка й dot notation у `Filter`, `InferSchemaType`, `select().lean()`, JSON round trip `ObjectId` і `Date` |
| `aws-events.ts` | `EventBridgeHandler<_, V2>` на події v1, валідація `detail` версіонованою схемою, `SQSBatchResponse`, `APIGatewayProxyHandlerV2`, типи `SendMessageCommand` |
| `augment-types.ts` + `augmentation.ts` | `declare global { namespace Express }`, `declare module "fastify"`, поле без хука |
| `using.ts` | LIFO, `throw`, `SuppressedError`, `mkdtempDisposable`, `DisposableStack.move()`, забутий `using` |
| `errors-dup.ts` + `dup/v1`, `dup/v2` | дві однакові копії класу помилки, `vm`-realm, `Error.isError`, бренд `Symbol.for`, `.catch(reason)` як `any` |
| `esm-interop/` | імпорт без розширення, default-імпорт CJS з `exports.default`, `require(esm)` |

Результат (`tsc` 7.0.2, `tsc6` 6.0.3, Node v24.14.1):

```
== type-check tsconfig.backend.json
tsc   exit=0 errors=0
tsc6  exit=0 errors=0

== mutations (tsc 7)
RED  mongoose: nickname без null: TS2344
RED  driver: findOne({ email: 42 }) без expect-error: TS2769
RED  driver: projection дає WithId<User>[] (інший тип): TS2344
RED  augment-types.ts без export {} (moduleDetection legacy): TS2669,TS2339,TS2349,TS7006
OK   augment-types.ts без export {} (nodenext + type: module): 0 errors
RED  sdk: SendMessageCommand без MessageBody, без expect-error: TS2769

== augmentation file not in program (files без augment-types.ts)
exit=1 TS2339  augmentation.ts(9,22): error TS2339: Property 'user' does not exist on type 'Request<…>'.

== `using` without @types/node and without esnext lib
exit=1 TS2318,TS2591,TS2304,TS2550,TS2584

== ESM ↔ CJS: esm-interop/main.ts під nodenext і bundler, потім node на емітованому JS
nodenext tsc exit=2 TS2349,TS2835
         node main.js  exit=1 1 object TypeError: greet is not a function
         node noext.js exit=1  Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'esm-interop/.out/util' …
bundler  tsc exit=0 0 errors
         node main.js  exit=1 1 object TypeError: greet is not a function
         node noext.js exit=1  Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'esm-interop/.out/util' …

== node esm-interop/req.cjs
require(esm) keys: __esModule,default,named | typeof ns: object | typeof ns.default: function
top-level await: ERR_REQUIRE_ASYNC_MODULE
process.features.require_module: true

== node mongo-types.ts
typeof _id       = string false
typeof createdAt = string
createdAt.getTime(): overHttp.createdAt.getTime is not a function
_id.equals: overHttp._id.equals is not a function

== node augmentation.ts
/with-hook     {"tenant":"t1","type":"string"}
/without-hook  {"tenant":"<undefined>","type":"undefined"}

== node aws-events.ts
trusting   v1 (старий продюсер)   THROW Cannot read properties of undefined (reading 'cents')
trusting   v2                     o-2: 990 USD
validating v1                     o-1: 1250 EUR
validating v2                     o-2: 990 USD
validating v2 + couponCode        o-2: 990 USD
validating v3 (невідома)          THROW invalid OrderPaid: Invalid discriminator value. Expected '1' | '2'
strict consumer, v2 + couponCode: REJECT Unrecognized key: "couponCode"
sqs {"batchItemFailures":[{"itemIdentifier":"m2"}]}

== node using.ts
1. acquire account:1 | acquire account:2 | work with account:1, account:2 | release account:2 | release account:1 | caught: insufficient funds | held after: 0
2. SuppressedError | error: release failed: job:7 | suppressed: body failed for job:7
3. inside scope exists: true
3. after scope exists:  false
4. use pool | close conn B | close conn A
5. const instead of using, held: [ 'leak:1' ]

== node errors-dup.ts
1. instanceof NotFoundError (copy v1): false → status 500
   instanceof Error: true | name: NotFoundError | code: E_NOT_FOUND
   branded is(): true → status 404
   cause: 0 rows
2. vm error instanceof Error: false | Error.isError: true
3. thrown plain object: instanceof Error: false | Error.isError: false
4. rejection reason typeof: string (static type: any)
```

Що з цього випливає і що виявилось не так, як очікувалось:

- **Мутації не порожні.** Кожне «0 помилок» у `tsconfig.backend.json` підкріплене мутацією, що
  дає очікуваний код. `@ts-expect-error` спершу були підписані `TS2322` і `TS2345`; фактичний
  код в обох випадках `TS2769` (No overload matches this call): `findOne` і конструктор
  команди перевантажені.
- **`export {}` у файлі розширення.** Очікувалось, що без нього розширення зламається. Під
  `nodenext` у пакеті з `"type": "module"` нічого не зламалось: `moduleDetection: "auto"`
  вважає такий `.ts` модулем. Під `moduleDetection: "legacy"` (так поводиться CJS-проєкт)
  `declare global` дає `TS2669`, а `declare module "fastify"` оголошує новий модуль замість
  справжнього: `Fastify()` стає `TS2349 not callable`.
- **Бренд помилки.** Перша версія `dup/*/errors.ts` мала типізоване поле `readonly [BRAND] = true`
  з `unique symbol`. Тоді `tsc` вважав дві копії класу несумісними (`TS2741`), і демонстрація
  «TypeScript не бачить різниці» була б хибною. Бренд перенесено в
  `Object.defineProperty`, тип класу без нього.
- **`using` і `lib`.** З `"types": ["node"]` `using` компілюється навіть з `target`/`lib`
  `es2024`: `@types/node` 24.19.2 має `/// <reference lib="esnext.disposable" />`. Без
  `@types/node` маємо `TS2318 Cannot find global type 'Disposable'`. `tsc --target es2024`
  емітить хелпер `__addDisposableResource`, `--target esnext` лишає `using` як є.
- **Node 20.10.0 і 18.18.2** (nvm): `typeof Symbol.dispose === "symbol"`, `DisposableStack`
  відсутній. Node 24.14.1 (V8 13.6.233.17): усе нативно.
- **SDK v3.** Обов'язкові поля входу типізовані як `string | undefined`:
  `QueueUrl: process.env.QUEUE_URL` компілюється.
