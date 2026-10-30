# Межі модулів у модульному моноліті

Код перевірки, на яку спирається нотатка
`Obsidian Vault/Engineering/General/System design/Моноліт і мікросервіси.md`
(розділ «Модульний моноліт як кінцевий стан», позначка «перевірено»).

Прогін 2026-10-30: Node v24.14.1, `dependency-cruiser` 18.7.0, `typescript` 6.0.3 і 7.0.2.

Правило `.dependency-cruiser.cjs`: файл модуля `src/modules/<m>/` може імпортувати з іншого
модуля лише його `index.ts`. `src/modules/billing/service.ts` навмисно імпортує і
публічне API `orders`, і його внутрішній `internal/repo.ts`.

```bash
npm ci
npm run boundaries      # очікувано: код виходу 1, одне порушення
```

## Результат

З `typescript` 6.0.3 (зафіксовано в `package.json`):

```
  error module-public-api-only: src/modules/billing/service.ts → src/modules/orders/internal/repo.ts

x 1 dependency violations (1 errors, 0 warnings). 3 modules, 3 dependencies cruised.
```

Код виходу 1: імпорт `../orders/index` пройшов, імпорт внутрішнього файлу зловлено.

З `typescript` 7.0.2 (`npm i --no-save typescript@7.0.2`):

```
✔ no dependency violations found (0 modules, 0 dependencies cruised)

‼ missing-tsc-transpiler: dependency-cruiser detected a TypeScript environment,
    but not a compatible TypeScript compiler (typescript: >=2.0.0 <7.0.0). ...
```

Код виходу **0**: перевірка «зелена», бо не розібрала жодного файлу. Тож у CI варто
перевіряти не лише код виходу, а й що кількість розібраних модулів більша за нуль, і
тримати `typescript@^6` поруч із TypeScript 7 (як у `examples/typescript`).
