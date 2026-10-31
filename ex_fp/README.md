# ex_fp

Лекції 10 «ФП. VS Code» і 16 «БД 2. ФП 2». Функціональний стиль на `lodash/fp` і `ramda`:
каррінг, композиція, часткове застосування, функтор, декларативні конвеєри.

Усе в одному файлі `index.js`, кожен приклад це окрема функція; за замовчуванням
викликається лише `notFunctional()` (`:254`).

| Функція | Що показує |
| --- | --- |
| `lessFunction` | `curry` з `lodash/fp`: частково застосований `split(' ')` |
| `exPartial` | часткове застосування через `bind` (таблиця команд) |
| `exComposition` | `compose` двох функцій |
| `exFunctors` | мінімальний функтор з `map` |
| `exFpLodash` | `cond`, `inRange`, `constant`, `stubTrue` з `lodash/fp` замість `if`-ланцюга |
| `exRearg` | `_.rearg`: перестановка аргументів |
| `exRamda` | `pluck`, `sortBy`, `where`, `propEq`, `reject` тощо з `ramda` |
| `exDifference` | той самий конвеєр «незавершені задачі користувача» на `lodash` і на `ramda` |
| `notFunctional` | імперативний «найшвидший автомобіль» проти point-free версії |

## Запуск

```bash
cd ex_fp
npm ci
node index.js          # друкує "a is the fastest"
```

Щоб побачити інший приклад, розкоментувати його виклик у кінці функції.

## Залежності

`lodash` 4.18.1, `moment` 2.31.0, `ramda` 0.27.2 (точні версії). До 2026-10-31 були
`lodash@4.17.15` і `moment@2.24.0` з відомими вразливостями (prototype pollution і command
injection у lodash, path traversal і ReDoS у moment). `ramda` свідомо лишено на 0.27.x:
з 0.29 змінився порядок аргументів `propEq`, на якому стоїть `exRamda`. Код не змінювався;
виклик усіх прикладів дає той самий вивід, що й до оновлення. `npm audit`: 0.

## Стан на Node 24.14.1

Запускається, код виходу 0.

## Відомі проблеми

- `index.js:224` і `:240`: порядок аргументів `lodash/fp` на звичайному `lodash`:
  `_.map(fn, cars)` і `_.sortBy(prop)` мовчки дають `[]` (перевірено в
  `../js/objects-functions/07-fp.js`). Обидві функції визначені, але не викликаються.
- `index.js:221`: `reduce` і `add` ніде не імпортовані, `average` кидає `ReferenceError`.
- `index.js:65-66`: `inRange` з `lodash/fp` має порядок `(start, end, value)`, тому
  `inRange(value, 0, 5)` перевіряє не те; `getColor(3)` повернув би `'green'`. Правильний
  варіант нижче, `:85-87`.
- `index.js:18-23`: `movePlayer`, `describeLocation`, `showBackpack` не визначені;
  `exPartial()` впаде з `ReferenceError`.
- `index.js:34-41`: присвоєння без `let`/`const` створюють глобальні змінні.

## Теорія

- «Незмінність і функціональний стиль у JavaScript»
- «Функції та замикання в JavaScript»

Перевірені експерименти: `../js/objects-functions/07-fp.js`.
