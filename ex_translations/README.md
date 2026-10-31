# ex_translations

Лекція 6 «V8. Node.js. npm. Конфігурація. Локалізація. Логування» (і практика лекції 8,
«i18n bug»). Локалізація пакетом `i18n` з JSON-каталогами.

| Файл | Що показує |
| --- | --- |
| `index.js` | `configure` (локалі `en`, `de`, каталог `locales/`), `__()` і `setLocale` |
| `app.js` | інший модуль, що через `require('i18n')` отримує той самий налаштований екземпляр (кеш модулів) і друкує переклад з підстановкою `%s` |
| `locales/en.json`, `locales/de.json` | ключі `Hello`, `Hello World`, `test` (`"test %s"`), `greetings_v2` |

## Запуск

```bash
cd ex_translations
npm ci
node index.js
```

## Залежності

`i18n` 0.15.4 (точна версія, оновлено 2026-10-31). Раніше стояв `i18n@0.8.3`, який тягнув
`messageformat` < 2.3.0 (prototype pollution), `minimatch`/`brace-expansion` з ReDoS,
`minimist` < 1.2.6 (prototype pollution), `semver` < 5.7.2 і `debug` < 4.3.1. У 0.15
`require('i18n')` так само повертає спільний екземпляр з `configure`, `__` і `setLocale`,
тож код не змінювався; вивід нижче той самий до і після оновлення. `npm audit`: 0.

## Стан на Node 24.14.1

Працює, код виходу 0:

```
greetings_v2
greetings_v2
Hello
test success
Hallo
test success
```

## Відомі проблеми

- `index.js:1`: `'use strict;'` з крапкою з комою всередині рядка не є директивою, файл
  виконується в sloppy-режимі.
- `locales/de.json`: `greetings_v2` не перекладено, тож німецькою друкується сам ключ.
- `index.js:3`: одруківка в імені змінної `transalations`.
- `i18n` за замовчуванням має `updateFiles: true`: невідомий ключ, викликаний у коді,
  дописується в `locales/*.json` під час роботи (у 0.15.4 так само, перевірено на копії
  каталогу). У продакшні це вимикають.
- `node app.js` окремо нічого не друкує: модуль лише експортує функцію.
- Глобальний `setLocale` (`:12`, `:15`, `:17`) на сервері змішує мови
  між одночасними запитами, там локаль беруть з запиту (`req.setLocale`, middleware).

## Теорія

- «Модулі в JavaScript» (один екземпляр модуля через кеш `require`)
- «Twelve-Factor App» (локаль і конфігурація з оточення)

Окремої нотатки про i18n у сховищі немає.
