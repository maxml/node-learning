# ex_typescript

Лекція 22 «ООА та ООD. TypeScript»; `middle/` також ілюструє окрему лекцію «GraphQL».
Дві незалежні частини зі своїми `package.json`.

| Тека | Що показує |
| --- | --- |
| `start/` | мова TypeScript по темах: типи, інтерфейси, класи, функції, generics, декоратори, модулі й простори імен, ambient-декларації; закомічений `build/` (target ES5). Деталі: `start/README.md` |
| `middle/` | GraphQL-сервер на `graphql-yoga` + `@graphql-tools/schema`: схема `Query.sayHello`, резолвер з декоратором `@Authenticated([Role.USER])`, JWT у заголовку `Authorization: Bearer …`, контекст безпеки; окремо `src/express.ts`, «hello world» на Express з TypeScript |

## Запуск

```bash
cd ex_typescript/start && npm ci && npm start          # tsc && node build/oop.js
cd ex_typescript/middle && npm ci && npm run build && node dist/index.js   # build = tsc + eslint
curl -s localhost:8000/graphql -H 'content-type: application/json' \
  -d '{"query":"{ sayHello(name:\"x\") }"}'           # без токена: "Not authorized!"
# GraphiQL: http://localhost:8000/graphql у браузері
cd ex_typescript/middle && npm start                   # dist/express.js на :3000
```

## `middle/`: перенесено на сучасний стек (2026-10-31)

Старий стек не мав виправлених версій: `graphql-yoga@1` (Express 4 + Apollo Server 1 +
`subscriptions-transport-ws`), `graphql-tools@3`, `jsonwebtoken@8`, `typescript@2.9`, `tslint`;
`npm audit` давав 81 вразливий пакет (7 critical, 47 high, 21 moderate, 6 low).

| Було | Стало |
| --- | --- |
| `graphql-yoga` 1 `GraphQLServer` + `server.start()` | `graphql-yoga` 6.0.1 `createYoga()` + `node:http` `createServer()`; `graphql` 17.0.2 |
| `graphql-tools` 3 `makeExecutableSchema` | `@graphql-tools/schema` 11.0.7, та сама функція |
| контекст з Express `req.request.headers.authorization` | `YogaInitialContext.request` (Fetch API), `headers.get("authorization")` |
| `throw new Error(...)` у декораторі | `throw new GraphQLError(...)`: Yoga маскує звичайні `Error` як `Unexpected error.` |
| `/playground` | GraphiQL на самому `/graphql`; підписки через SSE замість WebSocket |
| `express` транзитивно, `app.get('*')` | `express` 5.3.0 оголошено; `app.get('/{*path}')` (path-to-regexp 8) |
| `jsonwebtoken` 8 | 9.0.3 |
| `typescript` 2.9, `tsconfig` з `types: ["react","jest"]`, `paths` | `typescript` 5.9.3, `module`/`moduleResolution: nodenext`, `types: ["node"]` |
| `tslint` + `tslint.json` | `eslint` 10.14.0 + `typescript-eslint` 8.72.1 (`eslint.config.mjs`); `no-any` → `no-explicit-any` |

Прибрано невикористані залежності (жоден файл `src/` їх не імпортує): `async`,
`bcrypt-nodejs`, `lodash`, `mongoose`, `node-fetch`, `nodemon`, `prettier`, `eslint@7` з
плагінами `@typescript-eslint@3`, `tslint-config-prettier`, `concurrently`, `json-server`,
`ts-node`, `@types/{async,bcrypt-nodejs,jest,lodash,mocha,mongoose,node-fetch,react,shelljs,ws}`;
разом з ними скрипти `watch*`, `debug`, `test` (jest не встановлювався, тестів немає),
`backend:mock` (`mock/db.json` немає), `format`, `version`.

`overrides.minimatch = 11.0.3`: `eslint` 10 тягне `minimatch@10` (GHSA-g3hv-75wg-m249,
виправлено лише в 11.0.1). Прибрати, коли ESLint оновить залежність.

## Стан на Node 24.14.1

- `start/`: усі 13 файлів `build/` запускаються з кодом 0; `tsc` 3.9 без помилок,
  перезбірка дає той самий `build/`. `npm audit` 0 (див. `start/README.md`).
- `middle/`: `npm audit` 81 → 0. `npm run build` (tsc + eslint) з кодом 0. Сервер на 8000
  відповідає як до перенесення: без токена `Not authorized!` у полі, з адмінським токеном зі
  старту `Hello x`, з токеном ролі `USER` `Hello x`, з роллю `ANONYMOUSE`
  `User has insufficient rights`. GraphiQL на `/graphql` (200). `dist/express.js` на 3000
  відповідає `Hello World!` на будь-який шлях.
- Сучасний TypeScript на конфігах `start/`: `tsc` 6.0.3 відмовляє через deprecated
  `target: ES5` і `downlevelIteration`, `tsc` 7.0.2 через те, що ці опції прибрано.

## Відомі проблеми

- `middle/src/config.ts:9`, `:21`: JWT-секрети для dev і prod захардкоджено в репозиторії.
- `middle/src/index.ts:23` + `src/security/jwt.ts:11`: при старті в консоль друкується
  адмінський токен без `expiresIn`, тобто безстроковий.
- `middle/src/security/decorator.ts:17`: умова `args.length !== 4 && !(args[2] instanceof
  Context)` ніколи не спрацьовує: GraphQL передає 4 аргументи, а контекст це звичайний
  об'єкт, не екземпляр `Context`.
- `middle/src/security/context.ts:15`: невалідний токен кидає з `jwt.verify` (`jwt.ts:15`)
  у фабриці контексту, і весь запит отримує HTTP 500 `Unexpected error.` (перевірено)
  замість помилки авторизації в полі. До перенесення було те саме 500, але з текстом
  помилки (`Invalid options provided to ApolloServer: invalid token`).
- `middle/src/api/model.ts:4`: значення `ANONYMOUSE` (одруківка).
- Проблеми `start/` перелічено в `start/README.md`.

## Теорія

«Система типів TypeScript», «Generics і умовні типи в TypeScript», «Strict mode і tsconfig у
TypeScript», «Компілятор та інструменти TypeScript», «TypeScript у бекенді», «Межа рантайму
в TypeScript», «Принципи ООП», «REST проти GraphQL і gRPC», «Сесії та токени»,
«Авторизація», «Керування секретами».

Перевірені експерименти на TypeScript 7: `../typescript/`, `../design/principles/`.
