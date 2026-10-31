# ex_eslint

Лекція 20 «Чистий код, ESLint. Сервери». Навмисно «поганий» файл, на якому видно, що ловить
ESLint з конфігом `standard`.

| Файл | Що показує |
| --- | --- |
| `index.js` | збірка порушень правил: присвоєння в умові, дублікати ключів і `case`, `debugger`, `eval`, неявні глобальні, `this` перед `super()`, `==` з `NaN`, недосяжний код тощо (по одному на правило) |
| `eslint.config.js` | flat config: `neostandard` з `semi: true`, середовище `browser`, глобальні `log`/`ERR`/`AppError`/`projectDir`, `camelcase: error` |
| `package.json` | скрипти `lint` і `lint:fix` |

Як проєкт створювали в 2020 (зі старого файлу `README` поруч; тоді це був ESLint 6 і
`.eslintrc.json`):

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

## Залежності

`eslint` 10.14.0, `neostandard` 0.14.1 (точні версії) і `overrides` `minimatch` 11.0.3.
Оновлено 2026-10-31. До того стояли `eslint@6.8.0`, `eslint-config-standard@14`,
`eslint-plugin-import`, `eslint-plugin-node`, `eslint-plugin-promise@4`,
`eslint-plugin-standard`: 21 вразливість у залежностях (`minimist`, `ajv`, `lodash`,
`js-yaml`, `cross-spawn`, `minimatch`/`brace-expansion`, `tmp`/`inquirer` тощо). Гілка
ESLint 6 не підтримується, а `eslint-config-standard` не працює з flat config, тому:

- конфіг перенесено з `.eslintrc.json` у `eslint.config.js` (ESLint 9+ читає лише його);
  `eslint-config-standard` замінено на `neostandard`, його наступника для flat config;
- з `lint`/`lint:fix` прибрано `--ext .js` (у flat config цього прапорця немає);
- `overrides.minimatch`: `eslint@10.14.0`, `@eslint/config-array` і `typescript-eslint`
  просять `minimatch@^10.2`, а GHSA-g3hv-75wg-m249 (DoS через розростання globparts)
  виправлено лише в 11.0.1. API `minimatch` 11 для них той самий; лінт з override
  працює, `node_modules` так само ігнорується.

`npm audit`: 0.

## Стан на Node 24.14.1

`npm run lint` дає 511 проблем: 415 помилок і 96 попереджень (228 помилок і 89 попереджень
виправні через `--fix`), код виходу 1. Це очікуваний результат прикладу.

Порівняно з ESLint 6 + `standard` 14 (411 помилок, 230 виправних):

- ті самі порушення в `index.js` ловляться, але правила стилю тепер звуться `@stylistic/…`
  (`@stylistic/indent`, `@stylistic/quotes`, `@stylistic/semi`…), а Node-правила `n/…`
  (`n/handle-callback-err`, `n/no-new-require`); `no-new-object` став `no-object-constructor`,
  `no-negated-in-lhs` прибрано з ESLint, той рядок ловить `no-unsafe-negation`;
- нові: 95 попереджень `no-var`, `no-empty` (6), `prefer-regex-literals` (2),
  `no-unreachable-loop`, `@stylistic/no-extra-semi`;
- більше не ловляться (у `neostandard` їх немає): `dot-notation` (2 місця),
  `no-inner-declarations`, `no-path-concat` (прибрано з `eslint-plugin-n`), `comma-dangle`,
  `comma-spacing`.

## Відомі проблеми

- `eslint.config.js`: `env: ['browser']` для коду, який імпортує `fs` і `process`
  (`index.js:262`, `:378`); для Node мало б бути `env: ['node']`. Перенесено зі старого
  `.eslintrc.json` як було.
- `npm run lint:fix` переписує сам приклад; запускати на копії.

## Теорія

- «Чистий код»
- «Практики JavaScript»
- «Впровадження strict у TypeScript» (лінтер як запобіжник у CI)

Ще один flat config з закріпленими версіями: `../js/modules-v8/practices/lint/`.
