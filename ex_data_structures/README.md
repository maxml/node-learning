# ex_data_structures

Лекція 12 «Алгоритми. Таймери» (структури даних). Власні реалізації на функціях-конструкторах
плюс вбудовані `Map`, `Set` та ітератори. Залежностей немає.

| Файл | Що показує |
| --- | --- |
| `exLinkedList.js` | однозв'язний список: `push`, `remove`, `find`, `reverse`, `deleteHead/Tail`; експортується для інших файлів |
| `exStack.js` | «стек» поверх `exLinkedList` |
| `exQueue.js` | FIFO-черга на масиві (`push` / `shift`) |
| `exGraph.js` | орієнтований граф: вершини, ребра, сусіди, матриця суміжності |
| `exTree.js` | двійкове дерево пошуку (вставка, пошук, видалення); не запускається, див. нижче |
| `exMap.js` | `Map`: ключі будь-якого типу, об'єкти як ключі, перетворення з/в об'єкт |
| `exSet.js` | `Set`: унікальність, обхід, рядок як джерело |
| `exIterable.js` | ручний обхід через `Symbol.iterator`, `Array.from` для рядка |

## Запуск

```bash
cd ex_data_structures
node exGraph.js
```

У `exMap.js`, `exSet.js`, `exLinkedList.js` виклики демо закоментовані: файл нічого не
друкує, поки не розкоментувати потрібний виклик.

## Стан на Node 24.14.1

Усі файли завершуються з кодом 0 (`exTree.js` лише тому, що в ньому нічого не викликається).

## Відомі проблеми

Відтворено скриптом `../algorithms/old-examples-bugs.js`.

- `exStack.js:19` і `:23`: `push` додає в хвіст, `pop` знімає з голови, тобто це FIFO, а
  не стек: після `push 1,2,3` `pop()` повертає 1.
- `exQueue.js:14-16`: `get()` викидає значення й повертає саму чергу; `shift` на масиві
  O(n).
- `exLinkedList.js:166`: `toString = …` без `this.` створює глобальну змінну при кожному
  новому вузлі.
- `exGraph.js:74`, `:82`, `:94`: `edges.find({ callback })` передає об'єкт у `find(value)`
  списку, який порівнює значення через `===`; тому `hasEdge` і `findEdge` завжди хибні.
  Наслідок: `getAdjacencyMatrix()` (`:234`) падає з `TypeError … reading 'weight'`, а
  `deleteEdge` (`:52`) з `this.edges.delete is not a function`.
- `exTree.js:3`, `:31`, `:34`: посилання на неоголошені `BinarySearchTreeNode`,
  `Comparator` і `nodeValueComparator`; `new BinaryTree()` кидає `ReferenceError`.

## Теорія

- «Структури даних»
- «Складність алгоритмів»
- «Масиви та колекції в JavaScript»

Коректні реалізації (кільцева черга, купа, LRU, trie) з тестами: `../algorithms/structures.js`.
