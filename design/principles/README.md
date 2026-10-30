# Принципи дизайну: ООП, SOLID, GRASP

Експерименти, на які спираються нотатки
`Obsidian Vault/Engineering/General/Дизайн коду/` («Принципи ООП», «SOLID», «GRASP»),
позначки «перевірено».

Версії (прогін 2026-10-30): Node v24.14.1 (вбудоване type stripping, без `tsx`), npm 11.12.1,
`typescript` 7.0.2 (нативний `tsc`), `@types/node` 24.19.2. Код використовує лише стирані
конструкції TypeScript (`erasableSyntaxOnly`), тому Node запускає `.ts` напряму.

```bash
npm ci            # або npm install
npm run check     # tsc -p tsconfig.json: 0 помилок = всі @ts-expect-error у type-checks.ts спрацювали
node oop.ts
node solid.ts
node grasp.ts
npm run all       # усе разом
```

| Файл             | Що показує                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `oop.ts`         | TS `private` проти `#private`; `implements` і структурна типізація; три види поліморфізму; крихкий базовий клас (`extends Set`); композиція; міксин з `ex_typescript` |
| `type-checks.ts` | твердження про компілятор: приватні члени роблять тип номінальним; методи біваріантні (порушення LSP компілюється); поведінкові правила LSP компілятор не бачить |
| `solid.ts`       | кожен принцип SOLID як порушення → виправлення з видимим у рантаймі наслідком; контрактний тест LSP з контрольною мутацією |
| `grasp.ts`       | дев'ять патернів GRASP на одному сценарії «оформити замовлення»                                 |

## `type-checks.ts`: як перевірено, що директиви не порожні

`tsc` дає 0 помилок, лише якщо кожен рядок під `@ts-expect-error` справді має помилку
(інакше `TS2578 Unused '@ts-expect-error' directive`). Додатково копію файлу без директив
скомпільовано окремо (`tsc --strict --ignoreConfig`), і вона дала рівно три очікувані помилки,
а варіант з методом лишився без помилки:

```
error TS2322: Type '{ balance: number; }' is not assignable to type 'WithTsPrivate'.
  Property 'balance' is private in type 'WithTsPrivate' but not in type '{ balance: number; }'.
error TS2741: Property '#balance' is missing in type '{ balance: number; }' but required in type 'WithEsPrivate'.
error TS2322: Type '(e: OrderPlaced) => string' is not assignable to type '(e: DomainEvent) => string'.
```

## Вивід `node oop.ts`

```
§1 encapsulation
TS private: JSON.stringify                   {"balance":1000000}
TS private: Object.keys                      [ 'balance' ]
ES #private: JSON.stringify (before)         {}
ES #private: JSON.stringify                  {"balance":1000000}
ES #private: withdraw(500) after 'hack'      insufficient funds
ES #private: #balance in esAcc               true
ES #private: #balance in {balance:1}         false

§2 implements / structural typing
implements leaves a runtime trace?           [ 'constructor', 'send' ]
fake instanceof EmailNotifier                false
fake.send()                                  fake a@b.c: hi

§3 polymorphism
subtype (inclusion):                         Circle area=3.14
subtype (inclusion):                         Rect area=6.00
lookup path of describe on Circle            inherited via prototype chain
parametric first<number>                     1
parametric first<string>                     a
ad hoc overload format(3.14159)              3.14
ad hoc overload format(Date)                 2026-10-30
ad hoc coercion 1 + '2'                      12

§4 fragile base class
new CountingSet([1,2,3]).size                3
…added (expected 3)                          0

§5 composition
wrapper size / added                         3 / 3

§6 prototype-copy mixin
isActive before activate() (type says boolean) undefined
```

`§1`: після `(esAcc as any).balance = 1_000_000` у JSON з'являється *нова публічна* властивість,
а `#balance` лишається 100, тому `withdraw(500)` кидає помилку. `§4`: конструктор `Set` викликає
перевизначений `add` під час `super()` (ECMA-262 §24.2.2.1), а ініціалізатор поля `added = 0`
виконується після `super()` і обнуляє лічильник.

## Вивід `node solid.ts`

```
S: single responsibility
violating: HR report before/after accounting change  regular=15 → regular=14.5
fixed: HR report after accounting change             regular=15
fixed: pay with the new accounting rule              145

O: open/closed
violating: platinum discount                         0
fixed: platinum discount                             20

L: liskov substitution
contract vs CheckingAccount                          ok
contract vs BusinessCheckingAccount                  FAIL at open(0): business accounts need >= 1000
fixed contract vs PersonalAccount                    ok
fixed contract vs BusinessAccount                    ok
fixed contract vs LyingAccount (mutation)            FAIL at open(0): secret minimum 1000

I: interface segregation
reset via 2-method fake                              password updated for u1
methods the fake had to implement                    2

D: dependency inversion
placeOrder.run('o-1', 42)                            o-1
adapter rows                                         [ { id: 'o-1', total: 42 } ]
```

## Вивід `node grasp.ts`

```
HTTP route → controller                          {
  status: 201,
  body: { orderId: 'o-1', net: 75, gross: 97, ref: 'ch_o-1' }
}
queue consumer → same controller                 { orderId: 'o-2', net: 75, gross: 115, ref: 'ch_o-2' }
repo status of o-1 (Pure Fabrication)            placed
same controller, swapped TaxRates                { orderId: 'o-3', net: 75, gross: 97.75, ref: 'ch_o-3' }
addLine after place()                            order already placed
```
