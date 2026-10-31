# ex_orm/relations

Лекція 18 «ORM. Sequelize». Застосунок, згенерований `express-generator`, з моделями й
міграціями `sequelize-cli` на MySQL: компанія 1:N користувачі, користувачі N:M робочі дні
через таблицю `UsersWorkingDays`.

| Файл | Що показує |
| --- | --- |
| `relationship-app-demo/models/*.js` | `belongsTo` з `as: 'company'`, `hasMany` з `as: 'employes'`, `belongsToMany` з `through` |
| `relationship-app-demo/migrations/*.js` | чотири міграції створення таблиць |
| `relationship-app-demo/app.js` | Express + функції-приклади: `create`, `bulkCreate`, `findOne`/`findByPk` з `include`, `setDays` |
| `relationship-app-demo/config/config.json` | підключення для `development` / `test` / `production` |

## Як проєкт створено (зі старого файлу `README` поруч)

```bash
./node_modules/express-generator/bin/express-cli.js relationship-app-demo --no-view
cd relationship-app-demo/ && npm install
./node_modules/sequelize-cli/lib/sequelize init
./node_modules/sequelize-cli/lib/sequelize model:generate --name Company --attributes name:STRING
./node_modules/sequelize-cli/lib/sequelize model:generate --name User --attributes email:STRING,firstName:STRING,lastName:STRING,companyId:INTEGER
./node_modules/sequelize-cli/lib/sequelize model:generate --name WorkingDay --attributes weekDay:STRING,workingDate:DATE,isWorking:BOOLEAN
./node_modules/sequelize-cli/lib/sequelize model:generate --name UsersWorkingDay --attributes userId:INTEGER,workingDayId:INTEGER
node_modules/.bin/sequelize db:migrate        # відкат: db:migrate:undo
DEBUG=relationship-app-demo:* npm start
```

MySQL для прогону (пароль і база з `config/config.json`):

```bash
docker run -d --rm --name mysql -e MYSQL_ROOT_PASSWORD=admin -e MYSQL_DATABASE=university \
  -p 127.0.0.1:3306:3306 mysql:8.4
cd relationship-app-demo && npm ci && node_modules/.bin/sequelize db:migrate
PORT=3000 DEBUG=relationship-app-demo:* npm start
docker rm -fv mysql
```

## Залежності (оновлено 2026-10-31, точні версії)

| Тека | Пакети | `overrides` |
| --- | --- | --- |
| `relations/` | `express-generator` 4.16.1, `sequelize-cli` 6.6.5 | `ejs` 3.1.10, `minimatch` 11.0.3, `mkdirp` 0.5.6, `glob` 14.0.3 |
| `relationship-app-demo/` | `express` 4.22.3, `cookie-parser` 1.4.7, `debug` 4.4.3, `morgan` 1.12.1, `mysql2` 3.24.6, `sequelize` 6.37.8, `sequelize-cli` 6.6.5 | `glob` 14.0.3, `minimatch` 11.0.3, `uuid` 11.1.1 |

`npm audit`: `relations/` 13 → 0, `relationship-app-demo/` 28 → 0.

Чому `overrides`: виправлених релізів прямих залежностей немає.

- `express-generator` 4.16.1 (останній, не підтримується) жорстко фіксує `ejs@2.6.1`
  (template injection, GHSA-phwq-j96m-2c2q), `minimatch@3.0.4` (ReDoS) і `mkdirp@0.5.1`
  → `minimist@0.0.8` (prototype pollution). Генератор викликає лише `ejs.render` і
  `minimatch.filter`, обидва є в нових версіях; згенерований проєкт `--no-view` побайтово
  такий самий, як до оновлення (відрізняється лише ім'я теки в `package.json`/`bin/www`).
- `sequelize-cli` 6.6.5 → `js-beautify` 1.15.4 тягне `glob@10` (GHSA-3g3m-2fjr-6pw4,
  виправлено в 14.0.2) і `minimatch@9` (GHSA-g3hv-75wg-m249, виправлено в 11.0.1).
- `sequelize` 6.37.8 (остання 6.x) тягне `uuid@8` (GHSA-w5hq-g745-h8pq); Sequelize кличе
  лише `v1()`/`v4()`, їхній API в 11.1.1 той самий.

Прибрати override, коли пакет-власник оновить залежність.

## Стан на Node 24.14.1

До оновлення `npm start` завершувався одразу з кодом 0 (див. `bin/www`), міграції й
запити не перевірялись. Після, проти `mysql:8.4` у Docker:

- `sequelize db:migrate` створює `Companies`, `Users`, `WorkingDays`, `UsersWorkingDays`;
  `db:migrate:undo` відкочує останню міграцію.
- `npm start` слухає `PORT`: `GET /` (статичний `index.html`) і `GET /users` → 200.
- Усі функції з `app.js` (на свіжій базі з id 1 замість `7` і `13`-`15`): `create`,
  `bulkCreate`, `findOne` з `include: 'company'`, `findByPk` з `employes`, `setDays`
  (3 користувачі × 3 дні в `UsersWorkingDays`), N:M в обидва боки.
- `relations/`: `express-cli.js … --no-view` генерує проєкт; `sequelize init` і
  `model:generate` працюють.

Що змінено в коді:

- `relationship-app-demo/models/index.js`: `sequelize['import']` (прибрано в Sequelize 6)
  → `require(file)(sequelize, DataTypes)`;
- `relationship-app-demo/bin/www`: `server.listen(port)` розкоментовано.

## Відомі проблеми

- `relationship-app-demo/app.js:39-139`: усі виклики прикладів закоментовані й спираються на
  конкретні id (`7`, `13`-`15`) з чужої бази.
- `relationship-app-demo/config/config.json:4`: пароль користувача `root` для
  `development` закомічено.
- `relationship-app-demo/models/company.js`: `hasMany(User, { as: 'employes' })` без
  `foreignKey`, тоді як `user.js` задає `foreignKey: 'companyId'`. Sequelize через це додає
  до `User` другий атрибут `CompanyId` і вибирає `User.CompanyId`; на MySQL це працює лише
  тому, що імена колонок там нечутливі до регістру (перевірено), на PostgreSQL запит
  впаде. Ключі варто вказувати однаково з обох боків.

## Теорія

«Реалізації ORM», «Міграції схеми в ORM», «Проблема N+1», «Реляційна модель», «Нормалізація».
