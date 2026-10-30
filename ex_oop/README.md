# ex_oop

Лекції 13 «Прототипи. FS 2. Git 2» і 22 «ООА та ООD. TypeScript». ООП у JavaScript до й
після `class`.

| Функція в `index.js` | Що показує |
| --- | --- |
| `es5` | конструктор, `Person.call(this, …)` для наслідування, `Teacher.prototype = Object.create(Person.prototype)` |
| `exIncapsulation` | методи на прототипі через `User.prototype = { … }` з відновленим `constructor` |
| `exInheritance` | «наслідування» полів через виклик батьківського конструктора |
| `es6` | `class`, `extends`, `super`, гетер і сетер |
| `exPolymorphism` | поліморфізм через спільний інтерфейс `speak()` |

## Запуск

```bash
cd ex_oop
node index.js      # нічого не друкує: усі виклики закоментовані
```

Залежностей немає. Щоб побачити приклад, розкоментувати його виклик (наприклад, `:65`).

## Стан на Node 24.14.1

Код виходу 0, виводу немає.

## Відомі проблеми

- `index.js:23`: після `Teacher.prototype = Object.create(Person.prototype)` не відновлено
  `Teacher.prototype.constructor`, тож він вказує на `Person`.
- `index.js:18`: у `Person(name)` передано п'ять аргументів; ім'ям стає лише `first`, решта
  губиться.
- `index.js:13`: `alert` у Node не існує; виклик `person1.greeting()` дав би `ReferenceError`.
- `index.js:55`, `:61`: `firstUser`, `secondUser` без `let`/`const` стають глобальними
  (у strict-режимі це `ReferenceError`).
- `index.js:68-80`: `BlueGlassBrick` не пов'язано з `Brick.prototype`, успадковуються лише
  поля з конструктора; функція нічого не викликає.
- `index.js:122-141`: усі три об'єкти створено одним конструктором `Animal`, тож це не
  поліморфізм підтипів, а різні дані в одному типі.

## Теорія

- «Об'єкти та прототипи в JavaScript»
- «Принципи ООП»
- «Функції та замикання в JavaScript» (`this`, `call`)

Перевірені експерименти: `../js/objects-functions/02-prototypes-classes.js`, `../design/principles/oop.ts`.
