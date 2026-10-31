# ex_lodash

Лекція 5 «require. lodash. moment»; `fp.js` належить до лекції 10 «ФП. VS Code».

| Файл | Що показує |
| --- | --- |
| `index.js` | `_.intersection`, `_.filter` за властивістю, `_.map` по об'єкту, сімейство `_.is*`, `_.mixin`, неявні ланцюжки `_(…)`, `_.compact`, `_.bind`, `_.partial`, робота з об'єктами, `_.assign` |
| `fp.js` | `lodash/fp`: `curry` і `pipe` (slug з рядка), каррінг, часткове застосування, `Maybe` з `ramda-fantasy`, функтор |
| `cars.js` | великий масив виробників і моделей авто; модифікація вкладених даних через `_.last` і `_.set` |

Усі приклади в `index.js` і `fp.js` загорнуті у функції, виклики закоментовані на початку
(`index.js:3-13`) або після кожної функції.

## Запуск

```bash
cd ex_lodash
npm ci
node index.js      # нічого не друкує, поки не розкоментувати виклик
```

## Залежності

`lodash` 4.18.1 (точна версія). До 2026-10-31 тут був `^4.17.15` у lockfile v1: prototype
pollution (`_.zipObjectDeep`, `_.unset`/`_.omit`), command і code injection у `_.template`,
ReDoS. Оновлення в
межах 4.x, код не змінювався; виклик усіх функцій `index.js` дає той самий вивід, що й на 4.17.15.
`npm audit`: 0 вразливостей.

## Стан на Node 24.14.1

- `index.js`: код виходу 0 (нічого не викликається).
- `fp.js`: не запускається, `SyntaxError: Missing initializer in const declaration`.
- `cars.js`: Node розпізнає `export default` як ESM (попередження
  `MODULE_TYPELESS_PACKAGE_JSON`) і падає з `ReferenceError: _ is not defined`.

## Відомі проблеми

- `fp.js:116`: `const showIndexPage;` без ініціалізатора, синтаксична помилка на весь файл
  (`node --check fp.js`).
- `fp.js:77`: `curriedSum(1, (2, 3))` це оператор кома, тобто `curriedSum(1, 3)`; результат
  функція, а не число (перевірено в `../js/objects-functions/07-fp.js`).
- `fp.js:136`: одруківка `requirme`; до того ж `ramda` і `ramda-fantasy` (`:133`, `:136`)
  не входять у `package.json` цієї теки.
- `fp.js:122`: умова інвертована: гілка «мова не задана» читає
  `indexURLs[user.prefs.languages.primary]`.
- `cars.js:3893`: `_` не імпортовано; `:3908` `export default` у файлі без `"type": "module"`.
- `cars.js:3896-3897`: `Object.assign(oldestYear, …)` мутує той самий об'єкт 1000 разів, тож
  масив `years` містить 1000 посилань на один об'єкт з однаковим роком.
- `index.js:308`: `ad = 2` без оголошення створює глобальну змінну (показово, але без коментаря).

## Теорія

- «Незмінність і функціональний стиль у JavaScript» (lodash проти lodash/fp)
- «Модулі в JavaScript» (CJS проти ESM, `export default` у `.js`)
- «Практики JavaScript» (коли lodash уже не потрібен)

Перевірені експерименти: `../js/objects-functions/07-fp.js`, `../js/types/07-lodash-clonedeep.js`.
