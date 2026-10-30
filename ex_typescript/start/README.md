# ex_typescript/start

Лекція 22 «ООА та ООD. TypeScript». Мова TypeScript по темах; кожен приклад це функція
`ex…()`, виклики здебільшого закоментовані.

| Файл | Що показує |
| --- | --- |
| `index.ts` | перший приклад: клас з параметрами-властивостями, структурна сумісність з інтерфейсом |
| `types.ts` | примітиви, `any`/`unknown`, enum, assertions, union, literal, type guards і предикати, `null`, mapped і conditional types, `infer`, утилітні типи |
| `classes.ts` | інтерфейси (optional, readonly, hybrid), `implements`, модифікатори доступу, гетери/сетери, union/intersection |
| `functions.ts` | типи функцій, параметри за замовчуванням і rest, `this`, перевантаження |
| `generics.ts` | узагальнені функції й класи, обмеження `extends`, `keyof` |
| `oop.ts` | абстрактні класи, наслідування, поліморфізм, інкапсуляція, міксини |
| `decorators.ts` | декоратори класу, методу, параметра, аксесора, властивості; мемоізація (`experimentalDecorators`) |
| `inner.ts` | простори імен і злиття класу з простором імен |
| `modules/` | `export`/`import`, `export default`, перейменування, `namespace` у модулі |
| `declarations/` | ambient-декларації `.d.ts` і `/// <reference>` |
| `build/` | закомічений результат `tsc` |
| `out.txt` | вивід `npm run tracing` (`tsc --traceResolution`) |

Встановлення, як у старому файлі `README` поруч:

```bash
npm install typescript @types/node express @types/express
./node_modules/typescript/bin/tsc --init
```

## Запуск

```bash
cd ex_typescript/start
npm ci
npm start              # tsc && node build/oop.js
node build/index.js    # Hello, Jane User
```

## Стан на Node 24.14.1

`tsc` 3.9.2 з `package-lock.json` компілює без помилок; усі файли `build/` запускаються з
кодом 0.

## Відомі проблеми

- `inner.ts:1`, `:17`: `module Foo { … }` для простору імен; TypeScript 6 і 7 дають помилку
  TS1540, потрібне ключове слово `namespace` (перевірено `tsc` 6.0.3 і 7.0.2).
- `tsconfig.json`: `target: es5` і `downlevelIteration` deprecated у TS 6 і прибрані в TS 7;
  `exclude` посилається на `../middle/node_modules` іншого проєкту.
- `decorators.ts`: декоратори старого стандарту (`experimentalDecorators`); стандартні
  декоратори TC39 (TS 5+) мають іншу сигнатуру.
- `out.txt`: містить абсолютні шляхи з машини автора; це артефакт, а не приклад.

## Теорія

«Система типів TypeScript», «Generics і умовні типи в TypeScript», «Strict mode і tsconfig у
TypeScript», «Компілятор та інструменти TypeScript», «Модулі в JavaScript», «Патерни
проєктування» (декоратор), «Принципи ООП».
