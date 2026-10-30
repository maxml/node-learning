# ex_eslint

Лекція 20 «Чистий код, ESLint. Сервери». Навмисно «поганий» файл, на якому видно, що ловить
ESLint з конфігом `standard`.

| Файл | Що показує |
| --- | --- |
| `index.js` | збірка порушень правил: присвоєння в умові, дублікати ключів і `case`, `debugger`, `eval`, неявні глобальні, `this` перед `super()`, `==` з `NaN`, недосяжний код тощо (по одному на правило) |
| `.eslintrc.json` | `extends: standard` + `semi: always`, `camelcase: error`, середовище `browser` |
| `package.json` | скрипти `lint` і `lint:fix` |

Як проєкт створювали (зі старого файлу `README` поруч):

```bash
npm i --save-dev eslint eslint-config-standard eslint-plugin-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise
./node_modules/.bin/eslint --init
npm run lint
```

## Запуск

```bash
cd ex_eslint
npm ci
npm run lint        # очікувано завершується з кодом 1
npm run lint:fix    # виправляє те, що можна виправити автоматично (змінює index.js)
```

`index.js` не призначений для запуску через `node`.

## Стан на Node 24.14.1

ESLint 6.8.0 працює: `npm run lint` дає 411 помилок (230 з них виправні через `--fix`) і код
виходу 1. Це очікуваний результат прикладу.

## Відомі проблеми

- `package.json`: `eslint@6.8.0` і формат `.eslintrc.json` застарілі; ESLint 9+ використовує
  flat config (`eslint.config.js`), а `eslint-config-standard` 14 з ним не сумісний.
- `.eslintrc.json`: `env.browser: true` для коду, який імпортує `fs` і `process`
  (`index.js:262`, `:378`); для Node мало б бути `env.node`.
- `npm run lint:fix` переписує сам приклад; запускати на копії.

## Теорія

- «Чистий код»
- «Практики JavaScript»
- «Впровадження strict у TypeScript» (лінтер як запобіжник у CI)

Сучасний конфіг ESLint з закріпленими версіями: `../js/modules-v8/practices/lint/`.
