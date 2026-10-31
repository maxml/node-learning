# ex_logger

Лекція 6 «V8. Node.js. npm. Конфігурація. Локалізація. Логування». Від саморобної функції з
рівнями до `winston` з ротацією файлів.

| Файл | Що показує |
| --- | --- |
| `index.js` | `log(level, …)` з порогом із `P_LOG_LEVEL`; `debug` з `DEBUG=ex`; приклади API `winston` (об'єкт, `%s`-інтерполяція, `Error` як повідомлення й як мета) |
| `exWinstonLogger.js` | фабрика логера: `label`, `timestamp`, `errors({ stack })`, `splat`, вивід у консоль і `DailyRotateFile` окремо для error, warn, усього; `exceptionHandlers` |
| `util/example-logger.js` | мінімальний `winston` з двома файловими транспортами (quick start) |
| `util/ex_sanya.js` | обгортка: логер з міткою «каталог/файл» модуля-виклику |
| `util/util.js` | `Array.prototype.equals` і `Object.prototype.equals` для порівняння мети |
| `$comment` | закоментовані нотатки про рівні winston (не код) |

## Запуск

```bash
cd ex_logger
npm ci
node index.js                                  # нічого: виклики закоментовані
node -e "require('./exWinstonLogger')('demo').info('hello', { a: 1 })"
```

Файли логів пишуться в `ex_logger/logs/` (у `.gitignore`).

## Залежності

`debug` 4.4.3, `winston` 3.19.0, `winston-daily-rotate-file` 5.0.0 (точні версії, оновлено
2026-10-31). Раніше lockfile v1 мав `debug@4.1.1` (ReDoS), `winston@3.2.1` з `async@2.6.3`
(prototype pollution) і `color-string` < 1.5.5 (ReDoS), `winston-daily-rotate-file@3.10.0`,
що через `file-stream-rotator@0.4` тягнув `moment` < 2.29.4; плюс `lodash@4.17.15` і
`semver` < 6.3.1. `winston-daily-rotate-file` 5.x вимагає лише `winston@^3`, API транспорту
той самий. Код не змінювався. `npm audit`: 0.

Перевірено викликом `exDebug`, `exWinston`, `exSanya` до й після оновлення: вивід у консоль
і файли логів однакові (без часових міток), крім одного: коли `Error` іде метою після
повідомлення з пробілом у кінці (`index.js:96-97`, `'Maybe important error: '`), winston
3.19 вставляє ще один пробіл (`Maybe important error:  Error passed as meta`).

## Стан на Node 24.14.1

`index.js` і `exWinstonLogger.js` завершуються з кодом 0, нічого не друкуючи (усі виклики
закоментовані, другий файл лише експортує фабрику). Через фабрику логер працює.

## Відомі проблеми

- `exWinstonLogger.js:89`: `defaultKeys` будується з тих самих ключів `info`, що й
  `infoKeys`, тому `restFields()` завжди повертає `""` і мета-поля ніколи не друкуються:
  `info('hello', { extra: 1 })` виводить лише `hello`.
- `util/util.js:32`: `Object.prototype.equals` додано без `enumerable: false`; після
  `require('./exWinstonLogger')` у кожному `for…in` по будь-якому об'єкту з'являється ключ
  `equals` (перевірено). `:34`, `:48`: `propName` без оголошення, глобальна змінна.
- `util/ex_sanya.js:13`: `__dirname + '../logs/'` без `/`; логи потрапляють у каталог
  `util..` поруч з `util/`. `:22`: новий логер (і нові файлові дескриптори) на кожен виклик
  `log()`.

## Теорія

- «Twelve-Factor App» (фактор XI, логи як потік подій)
- «Observability у розподіленій системі» (структуровані логи, кореляція)
- «Практики Node.js» (pino, рівні, логування помилок)
- «Об'єкти та прототипи в JavaScript» (чому не розширюють `Object.prototype`)
