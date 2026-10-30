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

## Стан на Node 24.14.1

`npm start` завершується одразу з кодом 0, сервер не слухає порт (див. нижче). Міграції й
запити не перевірялись: потрібен MySQL.

## Відомі проблеми

- `relationship-app-demo/bin/www:28`: `server.listen(port)` закоментовано.
- `relationship-app-demo/app.js:39-139`: усі виклики прикладів закоментовані й спираються на
  конкретні id (`7`, `13`-`15`) з чужої бази.
- `relationship-app-demo/config/config.json:4`: пароль користувача `root` для
  `development` закомічено.
- `relationship-app-demo/models/company.js`: `hasMany(User, { as: 'employes' })` без
  `foreignKey`, тоді як `user.js` задає `foreignKey: 'companyId'`; ключі варто вказувати
  однаково з обох боків (поведінку на MySQL не перевіряли).

## Теорія

«Реалізації ORM», «Міграції схеми в ORM», «Проблема N+1», «Реляційна модель», «Нормалізація».
