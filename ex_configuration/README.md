# ex_configuration

Лекція 6 «V8. Node.js. npm. Конфігурація. Локалізація. Логування». Три способи читати
конфігурацію: свій JSON за `NODE_ENV`, пакет `config`, пакет `dotenv`.

| Файл | Що показує |
| --- | --- |
| `index.js` + `config.json` | вибір секції JSON за змінними `NODE_ENV`, `NODE_ENV2`, `NODE_ENV3` |
| `exConfig.js` + `conf/development.json` | `config.get()` з каталогу, заданого `NODE_CONFIG_DIR` |
| `exDotenv.js` | завантаження `.env` через `dotenv` у `process.env` |

## Запуск

```bash
cd ex_configuration
npm ci
npm start                        # index.js з NODE_ENV=development NODE_ENV2=production NODE_ENV3=staging
node exConfig.js
node exDotenv.js
```

## Стан на Node 24.14.1

- `index.js`: працює.
- `exConfig.js`: падає, `TypeError: Utils.isRegExp is not a function` у
  `node_modules/config/lib/config.js:946`. Закріплений `config@3.2.5` викликає
  `util.isRegExp`, якого в Node 24 вже немає.
- `exDotenv.js`: виконується, але друкує `undefined`.

## Відомі проблеми

- `exDotenv.js:2`: файлу `conf/.env` у репозиторії немає, а шлях відносний до поточного
  каталогу, не до файлу; тому `DB_PASS` завжди `undefined`.
- `exConfig.js:5`: присвоєння властивості об'єкту `config` до першого `get()`; після
  першого `get()` пакет робить конфіг незмінним, тож такий прийом крихкий.
- `index.js:8`: `defaultConfig` це той самий об'єкт, що й `config`, а не окрема копія
  значень за замовчуванням; закоментоване `_.merge(defaultConfig, …)` (`:13`) змінило б
  його на місці.
- `conf/development.json:8`: у конфігу лежить пароль (демонстраційний); справжні
  секрети в репозиторій не кладуть.

## Теорія

- «Twelve-Factor App» (фактор III, конфігурація в середовищі)
- «Керування секретами»
