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

## Залежності

`config` 3.3.12, `dotenv` 8.2.0, `lodash` 4.18.1 (точні версії, оновлено 2026-10-31).
Раніше стояли `config@3.2.5` (тягнув `json5@1.0.1` з prototype pollution і `minimist`),
`lodash@4.17.15` (prototype pollution, command/code injection у `_.template`, ReDoS).
`config@3.3.x` бере `json5@2.2.3` і більше не викликає `util.isRegExp`, тож заодно ожив
`exConfig.js`. `dotenv` лишено на 8.2.0: вразливостей у нього немає, а новіші мажорні
версії друкують власний рядок у вивід. Код не змінювався. `npm audit`: 0.

## Стан на Node 24.14.1

- `index.js`: працює, вивід той самий, що й до оновлення.
- `exConfig.js`: працює (з 2026-10-31, після переходу на `config@3.3.12`), друкує
  `value` і `s;fngsd;l`. На `config@3.2.5` падав з
  `TypeError: Utils.isRegExp is not a function`: у Node 24 немає `util.isRegExp`.
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
