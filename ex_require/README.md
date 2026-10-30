# ex_require

Лекція 5 «require. lodash. moment». Як працює `require` у CommonJS: кеш модулів, обгортка,
розширення файлів, циклічні залежності.

| Файл | Що показує |
| --- | --- |
| `practice5.js` | точка входу: по черзі (закоментовано) вантажить модулі нижче; активний лише `require('./cycle')` |
| `module.js` | `module.exports` і `exports`, приватна функція, `Math.random()` для перевірки кешу |
| `module2` | файл без розширення: `require('./module2')` виконує його як JS |
| `module3.json` | `require` JSON-файлу повертає розібраний об'єкт |
| `module4.cjs` | розширення `.cjs` завжди CommonJS |
| `wasm.wasm` | файл з розширенням `.wasm`, але всередині текст JS `console.log('jhgfh')` |
| `wrapper.js` | як виглядає обгортка модуля `(exports, require, module, __filename, __dirname)` |
| `cycle/index.js`, `first.js`, `second.js` | цикл A → B → A: B бачить незавершений `exports` модуля A (приклад з документації Node) |
| `new_node_project/` | мінімальний проєкт після `npm init` з `lodash` у залежностях |

## Запуск

```bash
cd ex_require
node practice5.js            # main starting / a starting / b starting / in b, a.done = false …
node module4.cjs
cd new_node_project && npm install && node index.js
```

## Стан на Node 24.14.1

`practice5.js`, `module4.cjs`, `new_node_project/index.js` працюють, код виходу 0.

## Відомі проблеми

- `wasm.wasm`: це не WebAssembly. `require()` розбирає невідоме розширення як JavaScript,
  тому `require('./wasm.wasm')` друкує `jhgfh` і повертає `{}` (перевірено в
  `../js/modules-v8/`). Справжній `.wasm` вантажать через `WebAssembly.instantiate`.
- `wrapper.js:1-4`: функція лише оголошена й ніколи не викликається; `require` цього файлу
  нічого не друкує. Це ілюстрація, а не робочий приклад.
- `module.js:1`: повідомлення `evaluating example.js` не відповідає імені файлу.
- `new_node_project/package.json`: без lock-файлу; діапазон `lodash ^4.17.15` сьогодні
  резолвиться в 4.18.1, а в інший день дасть іншу версію (у діапазон потрапляє й
  deprecated 4.18.0, «Bad release»).

## Теорія

- «Модулі в JavaScript» (CJS і ESM, кеш, цикли, розширення)
- «Архітектура Node.js» (завантажувач модулів)
- «Пакети та npm»

Перевірені експерименти: `../js/modules-v8/modules/` (`cjs/02-cycle.js` доповнює `cycle/`).
