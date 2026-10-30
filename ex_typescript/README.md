# ex_typescript

Лекція 22 «ООА та ООD. TypeScript»; `middle/` також ілюструє окрему лекцію «GraphQL».
Дві незалежні частини зі своїми `package.json`.

| Тека | Що показує |
| --- | --- |
| `start/` | мова TypeScript по темах: типи, інтерфейси, класи, функції, generics, декоратори, модулі й простори імен, ambient-декларації; закомічений `build/` (target ES5). Деталі: `start/README.md` |
| `middle/` | GraphQL-сервер на `graphql-yoga` + `graphql-tools`: схема `Query.sayHello`, резолвер з декоратором `@Authenticated([Role.USER])`, JWT у заголовку `Authorization: Bearer …`, контекст безпеки; окремо `src/express.ts`, «hello world» на Express з TypeScript |

## Запуск

```bash
cd ex_typescript/start && npm ci && npm start          # tsc && node build/oop.js
cd ex_typescript/middle && npm ci && npx tsc && node dist/index.js
curl -s localhost:8000/graphql -H 'content-type: application/json' \
  -d '{"query":"{ sayHello(name:\"x\") }"}'           # без токена: "Not authorized!"
```

## Стан на Node 24.14.1

- `start/`: усі 13 файлів `build/` запускаються з кодом 0; `tsc` 3.9 без помилок,
  перезбірка дає той самий `build/`.
- `middle/`: `tsc` 2.9.2 (закріплений) друкує одну помилку в типах залежності
  (`node_modules/apollo-utilities/…/mergeDeep.d.ts(2,52): TS2370`), але `dist/` генерує.
  Сервер стартує на 8000: без токена `sayHello` повертає `Not authorized!`, з надрукованим
  при старті адмінським токеном `Hello x`. `dist/express.js` слухає 3000.
- Сучасний TypeScript на цих конфігах: `tsc` 6.0.3 відмовляє через deprecated
  `target: ES5` і `downlevelIteration`, `tsc` 7.0.2 через те, що ці опції прибрано.

## Відомі проблеми

- `middle/src/config.ts:9`, `:21`: JWT-секрети для dev і prod захардкоджено в репозиторії.
- `middle/src/index.ts:19` + `src/security/jwt.ts:11`: при старті в консоль друкується
  адмінський токен без `expiresIn`, тобто безстроковий.
- `middle/src/security/decorator.ts:14`: умова `args.length !== 4 && !(args[2] instanceof
  Context)` ніколи не спрацьовує: GraphQL передає 4 аргументи, а контекст це звичайний
  об'єкт, не екземпляр `Context`.
- `middle/src/security/context.ts:20`: без заголовка функція нічого не повертає; невалідний
  токен кидає з `jwt.verify` (`jwt.ts:15`), і весь запит отримує HTTP 500 з текстом
  `Invalid options provided to ApolloServer: invalid token` (перевірено) замість помилки
  авторизації в полі.
- `middle/src/api/model.ts:4`: значення `ANONYMOUSE` (одруківка).
- `middle/package.json`: `express` не оголошено (приходить транзитивно з `graphql-yoga`);
  `graphql-tools@3`, `graphql-yoga@1`, `bcrypt-nodejs`, `tslint` застарілі.
- Проблеми `start/` перелічено в `start/README.md`.

## Теорія

«Система типів TypeScript», «Generics і умовні типи в TypeScript», «Strict mode і tsconfig у
TypeScript», «Компілятор та інструменти TypeScript», «TypeScript у бекенді», «Межа рантайму
в TypeScript», «Принципи ООП», «REST проти GraphQL і gRPC», «Сесії та токени»,
«Авторизація», «Керування секретами».

Перевірені експерименти на TypeScript 7: `../typescript/`, `../design/principles/`.
