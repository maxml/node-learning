# practice

Код, який писали на заняттях: номер файлу дорівнює номеру лекції. Кожен приклад у
функції `ex…()`, більшість викликів закоментовано. Залежності потрібні лише `project/`.

| Файл | Лекція | Що показує |
| --- | --- | --- |
| `practice1.js` | 1 «JS/Node.js. Типи даних. Синтаксис» | `typeof NaN`, `==` між типами, оператор кома, пріоритети, `4 > 3 > 2` |
| `practice2.js` | 2 «Інструкції. Масиви. Функції» | `switch`, методи масивів і їх швидкість, `splice`, сортування, злиття відсортованих масивів, rest/spread, функції |
| `practice3.js` | 3 «Об'єкти. Рядки. Дати. Таймери» | посилання й копії об'єктів, конструктори, `Symbol`, рядки, `var`/`let`/`const`, IIFE, таймери, `this`, дата N робочих днів тому |
| `practice4.js` | 4 «Колбеки. Функції 2. Області видимості» | `bind` і втрата `this`, каррінг `sum(a)(b)`, іменовані функціональні вирази |
| `practice5.js` | 5 «require. lodash. moment» | `process.argv` |
| `practice7.js` | 7 «RegExp. Валідація. Git» | класи символів, квантифікатори, групи, `matchAll`, альтернація, Unicode, `replace` |
| `practice10.js` | 10 «ФП. VS Code» | spread і `Object.assign` (поверхнева копія) |
| `practice11.js` | 11 «Проміси. Файли. Помилки» | проміси, статуси, композиція, скасування, власні помилки, `try/finally`, `JSON.parse` |
| `practice12.js` | 12 «Алгоритми. Таймери» | фази event loop: `setTimeout` проти `setImmediate`, `nextTick`, мікрозадачі |
| `practice13.js` | 13 «Прототипи. FS 2. Git 2» | ланцюжок прототипів, `this` у методах прототипу, перебір власних і успадкованих полів |
| `practice14.js` | 14 «SQL. ECMAScript» | гетери, класи, `static`, typed arrays, ітератори, генератори, `async/await`, `Reflect`, `Proxy`, async-ітератори |
| `practice20.js` | 20 «Чистий код, ESLint» | правила чистого коду «погано / добре»: імена, параметри, умови, гетери, приватні поля, помилки, коментарі |
| `project/` | 5–7 | мінімальний npm-проєкт (`moment`, `@hapi/joi`) |
| `libraries.txt` | | перелік бібліотек і тем курсу |

## Запуск

```bash
cd practice
node practice12.js           # будь-який файл; для project/: cd project && npm ci && node index.js
```

## Стан на Node 24.14.1

Усі файли завершуються з кодом 0, крім `practice11.js`: останній рядок `process.abort()`
(`:274`, схоже, навмисно) дає код 134 і native stack trace.

## Відомі проблеми

Фрагменти `practice1–4` перевірено в `../js/types/06-old-examples-check.js`.

- `practice2.js:34-40`: `switch` за рядком `"BOYS"`, а `case` це об'єкти з `Ranges`;
  `switch` порівнює через `===`, тож завжди спрацьовує `default`. `:36`
  `new String(Ranges.CHILD).toLowerCase()` дає `[object object]`.
- `practice2.js:333`: `arr1 + arr2` склеює масиви в рядок `"6,12,164,7,18,19"`.
- `practice2.js:229-233`: `delete` під час обходу перерахованих заново `Object.keys`
  пропускає ключі: `{a:0, b:0, c:1}` перетворюється на `{b:0, c:1}`.
- `practice4.js:80`: `function f(state, b)` чекає два аргументи, а викликається з одним;
  `sum(1)(2).toString()` дає `NaN` замість 3 (коментар `:92`).
- `practice11.js:261`: `reject` не оголошено у виконавці `new Promise((resolve) => …)`;
  `ReferenceError` вилітає з таймера як неперехоплений виняток, а не як відхилення промісу.
- `practice14.js:413-419`: пастка `set` у `Proxy` не повертає `true`; файл не в strict-режимі,
  тож запис мовчки вдається, але в strict-коді (модулі, класи) кожен запис кинув би
  `TypeError` (перевірено в `../js/objects-functions/03-proxy-symbols.js`).
- `project/index.js:8-9`: неявні глобальні змінні в конструкторі; `:23` `console.clear()`
  стирає весь щойно надрукований вивід; `@hapi/joi` встановлено, але не використано
  (пакет deprecated, тепер `joi`).

## Теорія

«Типи даних у JavaScript», «Перетворення типів у JavaScript», «Масиви та колекції в
JavaScript», «Функції та замикання в JavaScript», «Об'єкти та прототипи в JavaScript»,
«Числа, рядки й дати в JavaScript», «Регулярні вирази в JavaScript», «Асинхронність у
JavaScript», «Event loop у Node.js», «Чистий код».
