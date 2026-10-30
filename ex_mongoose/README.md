# ex_mongoose

Лекція 19 «Сокети. gRPC. NoSQL» (MongoDB через Mongoose). Три незалежні приклади.

| Файл | Що показує |
| --- | --- |
| `db/index.js` | підключення як сінглтон-модуль (`module.exports = new Database()`) |
| `db/models/email.js` | схема з `required`, `unique`, `lowercase` і валідатором `validator.isEmail` |
| `db/models/user.js` | віртуальне поле `fullName` (get/set), метод екземпляра, статичний метод |
| `index.js` | CRUD над `Email`: `save`, `find`, `findOneAndUpdate` з `runValidators`, `findOneAndRemove` |
| `sample.js` | моделі `Author`/`Book` з `ref`, кастомні валідатори URL, пошук регекспом, `sort`/`limit` |
| `mlab/` | REST API продуктів на Express: маршрути, контролер, модель (окремий `package.json`) |

## Запуск

```bash
cd ex_mongoose
npm ci                                   # для mlab/: окремо cd mlab && npm ci
docker run -d --rm -p 27017:27017 mongo:8
node sample.js
```

## Стан на Node 24.14.1

- `index.js`: код виходу 0, нічого не робить (жодна функція не викликається, підключення
  `db/index.js` не імпортовано). Друкує попередження Node «Accessing non-existent property
  … inside circular dependency» з надр Mongoose 5.
- `sample.js`: падає одразу, `TypeError: Author.defindByIdAndUpdate is not a function`.
- Окремо перевірено: Mongoose 5.9 з цього `package-lock.json` на Node 24 підключається до
  MongoDB 8, модель `Email` зберігає документ (email приведено до нижнього регістру) і
  знаходить його.

## Відомі проблеми

- `sample.js:191`: одруківка `defindByIdAndUpdate`; виклик на `:201` валить скрипт.
  `:182`, `:191`: захардкоджений `_id` з чужої бази.
- `mlab/index.js:9`: рядок підключення з логіном і паролем у коді; сервіс mLab закрито в
  2020, хост недоступний.
- `mlab/controllers/product.controller.js:24`, `:33`, `:40`: обробники без параметра
  `next`, але викликають `next(err)`; на помилці БД буде `ReferenceError`.
- `mlab/controllers/product.controller.js:34`: `{ $set: req.body }` записує будь-які поля
  з запиту (mass assignment).
- `db/models/user.js:39`, `:49`, `:60`: `UserModel` не оголошено; функції перевірки впадуть.
- `db/index.js:17-19`: помилка підключення ковтається, лишається лише текст у консолі.
- `index.js:53`, `mlab/…controller.js:41`: `findOneAndRemove`/`findByIdAndRemove` прибрано
  в Mongoose 8 (є `findOneAndDelete`); колбеки (`sample.js`, контролер) Mongoose 7+ не
  приймає.

## Теорія

- «Документна модель»
- «Моделювання даних у MongoDB»
- «Запити та агрегація MongoDB»
- «Індекси MongoDB» (`unique` це індекс, а не валідатор)
- «Практики MongoDB»
- «Робота з БД у Node.js»

Сучасні перевірені приклади з драйвером і Mongoose 9: `../mongo/`, `../typescript/mongo-types.ts`.
