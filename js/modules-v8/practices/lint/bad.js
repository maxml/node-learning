// Each line below is a bug pattern a linter catches before review. Not meant to run.
var total = 0;
let limit = 10;

export function add(order, item) {
  if (order.status = 'closed') return;     // assignment in condition
  if (item.qty == '0') return;            // loose equality with coercion
  order.items.push(item);                 // mutates the caller's argument
  totl += item.price;                     // typo: undeclared variable
  if (order.total == NaN) throw 'bad total'; // NaN comparison + throwing a string
  console.log(total, limit);              // .eslintrc.json bans console: ESLint 10 ignores that file
}
