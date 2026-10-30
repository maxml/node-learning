# ex_npm

Лекції 6 «V8. Node.js. npm…» (npm, `package.json`) і 20 «Чистий код, ESLint» (git-хуки).
Лише `package.json` з конфігурацією git-хуків для `husky` v4.

| Файл | Що показує |
| --- | --- |
| `package.json` | поле `husky.hooks`: `pre-commit` запускає тести й лінт, `pre-push` піднімає patch-версію |
| `README` (старий) | посилання на github.com/typicode/husky |

## Запуск

Запускати нічого: хуки встановлює install-скрипт пакета `husky` у `.git` репозиторію, у
якому лежить тека (поведінку на цьому репозиторії не перевіряли).

```bash
cd ex_npm
npm ci
```

## Стан на Node 24.14.1

`npm ci` проходить (аудит ставив залежності з `--ignore-scripts`, тож установку хуків не
перевіряли). Файлу `index.js`, на який вказує `main`, немає.

## Відомі проблеми

- `package.json` (`husky.hooks.pre-commit`): `npm test | npm run lint` з'єднано пайпом, а не
  `&&`; код виходу береться від другої команди, тож провал тестів не зупиняє коміт. Скрипта
  `lint` у цьому `package.json` немає, а `test` завжди завершується з кодом 1.
- `package.json` (`husky.hooks.pre-push`): `npm version patch` створює новий коміт і тег уже
  під час push; вони в цей push не потрапляють.
- `husky` стоїть у `dependencies`, а не в `devDependencies`, тобто приїде й у продакшн-збірку.
- Конфіг у полі `"husky"` працює лише в husky 4; з husky 5+ хуки лежать файлами в `.husky/`.

## Теорія

- «Пакети та npm» (скрипти, lifecycle-хуки, dependencies проти devDependencies)
- «Практики Git» (локальні хуки не замінюють перевірки в CI)

Перевірені експерименти з npm (semver, lockfile, phantom-залежності, install-скрипти): `../js/npm/`.
