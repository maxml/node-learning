# ex_mongoose

Лекція 19 «Сокети. gRPC. NoSQL» (MongoDB через Mongoose). Три незалежні приклади.

| Файл | Що показує |
| --- | --- |
| `db/index.js` | підключення як сінглтон-модуль (`module.exports = new Database()`) |
| `db/models/email.js` | схема з `required`, `unique`, `lowercase` і валідатором `validator.isEmail` |
| `db/models/user.js` | віртуальне поле `fullName` (get/set), метод екземпляра, статичний метод |
| `index.js` | CRUD над `Email`: `save`, `find`, `findOneAndUpdate` з `runValidators`, `findOneAndDelete` |
| `sample.js` | моделі `Author`/`Book` з `ref`, кастомні валідатори URL, пошук регекспом, `sort`/`limit`; `main()` проганяє все по черзі |
| `mlab/` | REST API продуктів на Express: маршрути, контролер, модель (окремий `package.json`) |

Залежності (оновлено 2026-10-31, точні версії):

| Тека | Пакети |
| --- | --- |
| `ex_mongoose/` | `mongoose` 9.11.4, `validator` 13.15.35 |
| `mlab/` | `express` 5.3.0, `mongoose` 9.11.4 (`body-parser` прибрано: є `express.json()`) |

Mongoose 5 (було `^5.9`) мав 7 advisories без виправлення в гілці 5.x (prototype pollution,
search injection, `$nor` у `sanitizeFilter`); вразлива вся лінія `<=6.13.9`, тому оновлено
одразу до 9. `npm audit`: `ex_mongoose/` 6 → 0, `mlab/` 13 → 0.

## Запуск

```bash
cd ex_mongoose
npm ci                                   # для mlab/: окремо cd mlab && npm ci
docker run -d --rm --name mongo -p 27017:27017 mongo:8
node sample.js                           # MONGODB_URI перевизначає mongodb://127.0.0.1:27017/test
cd mlab && node index.js                 # MONGODB_URI, PORT (за замовчуванням 3000)
curl -s -XPOST localhost:3000/products/create -H 'content-type: application/json' \
  -d '{"name":"pen","price":3}'
docker rm -fv mongo
```

## Стан на Node 24.14.1 (Mongoose 9.11.4, MongoDB 8)

- `sample.js`: код 0. Створює автора й дві книги, знаходить книги за `/mvc/i` (з
  `sort`/`limit` і без), автора за id, оновлює `linkedin` і друкує всіх авторів.
- `index.js`: код 0, сам нічого не викликає. Функції `createEmail` → `fetch` →
  `updateRecord` → `deleteRecord` разом з `require('./db/index.js')` перевірено: email
  приведено до нижнього регістру, оновлено й видалено.
- `db/models/user.js`: `checkVirtualField` (`Thomas Anderson`), `checkInstanceMethod`
  (`TA`), `checkStaticMethods` (повертає документи) працюють.
- `mlab/`: `GET /products/test`, `create` (JSON і form-urlencoded), `GET /:id`,
  `PUT /:id/update`, `DELETE /:id/delete` працюють як до оновлення. Помилки БД
  (невалідний id, відсутня `price`) тепер дають HTTP 500, і сервер живе далі; до
  оновлення невалідний id валив процес `ReferenceError: next is not defined`.

Що змінено в коді і чому:

- колбеки (`save(cb)`, `find(cb)`, `exec(cb)`, `findById(id, cb)`) → `async`/`await`:
  Mongoose 7+ колбеки не приймає;
- `findOneAndRemove`/`findByIdAndRemove` → `findOneAndDelete`/`findByIdAndDelete`
  (прибрано в Mongoose 8); `new: true` → `returnDocument: 'after'` (deprecated у 9);
- `sample.js`: одруківку `defindByIdAndUpdate` виправлено, захардкоджений `_id` замінено
  на id автора, створеного в тому ж прогоні; прибрано застарілі опції `connect`;
- `db/models/user.js`: оголошено `UserModel`;
- `mlab/index.js`: рядок підключення лише з `MONGODB_URI` (за замовчуванням локальний
  MongoDB), облікових даних mLab у коді більше немає; помилка `listen` (напр.
  `EADDRINUSE`) кидається, а не губиться в колбеку Express 5;
- `mlab/…controller.js`: async-обробники, Express 5 сам передає відхилення в `next(err)`.

## Відомі проблеми

- `mlab/controllers/product.controller.js:28`: `{ $set: req.body }` записує будь-які поля
  з запиту (mass assignment).
- `db/index.js:17-19`: помилка підключення ковтається, лишається лише текст у консолі.
- `mlab/`: `GET` неіснуючого id відповідає 200 з порожнім тілом, а не 404.

## Теорія

- «Документна модель»
- «Моделювання даних у MongoDB»
- «Запити та агрегація MongoDB»
- «Індекси MongoDB» (`unique` це індекс, а не валідатор)
- «Практики MongoDB»
- «Робота з БД у Node.js»

Сучасні перевірені приклади з драйвером і Mongoose 9: `../mongo/`, `../typescript/mongo-types.ts`.
