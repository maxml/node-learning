# ex_patterns

Лекція 23 «Патерни. SOLID. GRASP. 12 факторів». Патерни GoF і SOLID на TypeScript; кожен
`.ts` компілюється в `build/` і запускається окремо.

| Файл | Що показує |
| --- | --- |
| `solid.ts` | по прикладу на кожен принцип: SRP (`Book`/`Printer`/`Pager`), OCP (фігури, кредитні картки), LSP (`Bird`/`Ostrich`), ISP, DIP (`WeatherProvider` з інтерфейсом клієнта) |
| `creational/singleton.ts` | сінглтон через приватний конструктор і `getInstance()` |
| `creational/factoryMethod.ts`, `abstractFactory.ts`, `builder.ts` | фабричний метод, абстрактна фабрика (кнопки під ОС), будівельник з директором |
| `structural/adapter.ts`, `decorator.ts`, `composite.ts`, `proxy.ts` | адаптер, декоратор, компонувальник (дерево), замісник з перевіркою доступу й логуванням |
| `behavioral/strategy.ts`, `observer.ts`, `command.ts`, `mediator.ts`, `visitor.ts` | стратегія, спостерігач, команда, посередник, відвідувач |
| `build/` | закомічений результат `tsc` (target ES5) |

## Запуск

```bash
cd ex_patterns
npm ci
npm start                         # tsc && node build/structural/proxy.js
node build/behavioral/observer.js # будь-який інший патерн
```

## Стан на Node 24.14.1

Усі 15 файлів у `build/` запускаються з кодом 0. `tsc --noEmit` закріпленим TypeScript 3.9
проходить без помилок. Перезбірка дає байт-у-байт той самий `build/`, крім `build/index.js`.

## Відомі проблеми

- `build/index.js`: осиротілий артефакт, джерела `index.ts` немає; це стара версія
  `build/solid.js` (без частини прикладів OCP).
- `solid.ts:188-201`: приклад ISP не розділяє інтерфейс: `IBird` і далі вимагає `fly()` і
  `run()`, а `Ostrich2` реалізує `fly()` порожнім методом, тобто показує саме порушення.
  Розділення виглядало б як `Flyer` і `Runner` окремо.
- `solid.ts:220-244`: `WindowSwitch` залежить від конкретного `CarWindow`; це ілюстрація
  порушення DIP, але виправленої версії поруч немає.
- `solid.ts:205`: `get()` повертає `Promise<IhttpClient>`, тип відповіді плутається з типом
  клієнта.
- Файли без `import`/`export`, тож TypeScript вважає їх скриптами зі спільною глобальною
  областю; через це класи названо `DecoratorComponent`, `ObserverSubject`,
  `VisitorComponent` замість `Component`, `Subject`.
- `package.json`: `typescript` і `@types/node` у `dependencies`, а не `devDependencies`.

## Теорія

- «Патерни проєктування»
- «SOLID»
- «GRASP»
- «Принципи ООП»
- «Twelve-Factor App»

Перевірені експерименти: `../design/patterns/`, `../design/principles/solid.ts`.
