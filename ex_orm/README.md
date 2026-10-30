# ex_orm

Лекція 18 «ORM. Sequelize». Sequelize 5: модель, асоціації, міграції через `sequelize-cli`.

| Файл / тека | Що показує |
| --- | --- |
| `simple/index.js` | `exSqlite`: модель через `class User extends Model` + `init`, `sync()`, `create()` у SQLite в пам'яті; `exConfig`: підключення з JSON |
| `simple/connection.json` | параметри підключення до локального PostgreSQL |
| `models/index.js`, `models/user.js`, `models/task.js` | шаблонний завантажувач моделей `sequelize-cli`; `User.hasMany(Task)`, `Task.belongsTo(User)` з `onDelete: CASCADE` |
| `relations/` | застосунок `express-generator` з MySQL: міграції, асоціації 1:N і N:M; свій README |

## Запуск

```bash
cd ex_orm
npm ci            # pg, sequelize@5, sqlite3@4 (нативний)
node -e "eval(require('fs').readFileSync('simple/index.js','utf8') + ';exSqlite()')"
```

У `simple/index.js` функції лише визначені; прямий `node simple/index.js` нічого не робить.

## Стан на Node 24.14.1

- `simple/index.js`: код 0, нічого не виконується.
- `exSqlite()`: `Error: Please install sqlite3 package manually`. `sqlite3@4.1.1` нативний;
  збірка під Node 24 (`npm rebuild sqlite3`) падає на `make`.
- `exConfig()`: `Error: Dialect needs to be explicitly supplied as of v4.0.0`.
- `models/index.js`: `Cannot find module './config.js'`.

## Відомі проблеми

- `models/index.js:8`: файлу `config.js` немає (його мав створити `sequelize init`).
- `simple/index.js:27` + `simple/connection.json`: у JSON немає `dialect`, а ключ `user`
  замість `username`, який очікує Sequelize; підключення не створюється.
- `simple/connection.json`: пароль БД закомічено.
- `models/index.js:24`: `sequelize['import']` прибрано в Sequelize 6; `package.json`
  фіксує `sequelize@5`, яку npm позначає як deprecated.

## Теорія

- «Реалізації ORM»
- «Міграції схеми в ORM»
- «Патерни доступу до даних» (Active Record у Sequelize)
- «Проблема N+1» (`include` проти лінивих запитів)
- «ORM проти чистого SQL»
- «TypeORM» (лекція 24.1, окремої теки з прикладами немає)
