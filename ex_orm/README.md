# ex_orm

Лекція 18 «ORM. Sequelize». Модель, асоціації, міграції через `sequelize-cli`. Код писали
під Sequelize 5; з 2026-10-31 він працює на Sequelize 6.

| Файл / тека | Що показує |
| --- | --- |
| `simple/index.js` | `exSqlite`: модель через `class User extends Model` + `init`, `sync()`, `create()` у SQLite в пам'яті; `exConfig`: підключення з JSON |
| `simple/connection.json` | параметри підключення до локального PostgreSQL (без пароля: його бере `exConfig` з `PGPASSWORD`) |
| `models/index.js`, `models/user.js`, `models/task.js` | шаблонний завантажувач моделей `sequelize-cli`; `User.hasMany(Task)`, `Task.belongsTo(User)` з `onDelete: CASCADE` |
| `config/config.js` | конфіг для `models/index.js`: `development` = SQLite в пам'яті, `production` = `DATABASE_URL` |
| `relations/` | застосунок `express-generator` з MySQL: міграції, асоціації 1:N і N:M; свій README |

Залежності (точні версії): `sequelize` 6.37.8, `pg` 8.23.1, `sqlite3` 5.1.7.

`overrides` у `package.json`, бо в прямих залежностей немає виправленого релізу:

- `uuid` 11.1.1: `sequelize` 6.37.8 (остання 6.x) тягне `uuid@^8.3.2`, advisory
  GHSA-w5hq-g745-h8pq виправлено в 11.1.1. Sequelize викликає лише `v1()`/`v4()`, їхній API
  в 11 той самий (перевірено `UUIDV1`/`UUIDV4` за замовчуванням).
- `tar` 7.5.22 і `node-gyp` 12.4.0: `sqlite3` 5.1.7 оголошує `tar@^6` і `node-gyp@8.x`
  (через них ще `minimatch@3`, `@tootallnate/once@1`), усі з advisories. Під час
  встановлення `sqlite3` бере готовий бінарник через `prebuild-install`; `tar` і `node-gyp`
  потрібні лише як запасна збірка з сирців, у рантаймі `sqlite3` їх не імпортує.

Чому не `sqlite3` 6.0.1 (без цих advisories): його готовий бінарник потребує glibc ≥ 2.38,
на Ubuntu 22.04 (glibc 2.35) `require` падає з ``GLIBC_2.38' not found``. На новішому
дистрибутиві можна перейти на 6.0.1 і прибрати `overrides` `tar`/`node-gyp`.

`npm audit`: до оновлення 24 вразливі пакети (7 critical, 12 high, 4 moderate, 1 low),
після 0.

## Запуск

```bash
cd ex_orm
npm ci
node -e "eval(require('fs').readFileSync('simple/index.js','utf8') + ';exSqlite()')"
node -e "const db = require('./models'); db.sequelize.sync().then(() => db.User.create({ username: 'ann' })).then(u => console.log(u.toJSON()))"
```

У `simple/index.js` функції лише визначені; прямий `node simple/index.js` нічого не робить.
`exConfig()` потребує PostgreSQL на `localhost:5432` і пароль у `PGPASSWORD`; `require`
у ній відносний, тож `eval` треба запускати з теки `simple/`.

## Стан на Node 24.14.1

До оновлення `npm ci` падав на збірці `sqlite3@4.1.1` (`node-pre-gyp`), тож не працювало
нічого. Після:

- `exSqlite()`: код 0, створює таблицю `users` і друкує `janedoe`. Node друкує
  `DEP0170` про URL `sqlite::memory:` (рядок розбирає Sequelize, працює).
- `exConfig()`: проти `postgres:17` у Docker `authenticate()` і `select version()`
  успішні.
- `models/index.js`: на SQLite `User.create` + `Task.create` + `findOne({ include: Task })`
  працюють; з `NODE_ENV=production DATABASE_URL=postgres://…` на PostgreSQL 17
  `destroy()` користувача каскадно видаляє його задачі (1 → 0).

Що змінено в коді:

- `models/index.js`: `sequelize['import']` (прибрано в Sequelize 6) → `require(file)(sequelize,
  DataTypes)`; конфіг з `../config/config.js` (розкладка `sequelize init`), бо
  `config.js` у `models/` цикл завантаження прийняв би за модель;
- `config/config.js`: новий файл, без секретів;
- `simple/connection.json`: додано `dialect`, `user` → `username`, пароль прибрано;
  `simple/index.js`: `exConfig` бере пароль з `PGPASSWORD` і повертає екземпляр.

## Відомі проблеми

- Пароль `admin`, колись закомічений у `simple/connection.json`, лишається в історії git.

## Теорія

- «Реалізації ORM»
- «Міграції схеми в ORM»
- «Патерни доступу до даних» (Active Record у Sequelize)
- «Проблема N+1» (`include` проти лінивих запитів)
- «ORM проти чистого SQL»
- «TypeORM» (лекція 24.1, окремої теки з прикладами немає)
