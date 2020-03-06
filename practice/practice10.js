console.log('Hello');

function exSpreadOperator() {
    const { a, ...z } = { x: 1, y: 2, a: 2, b: 4, c: 5 }

    console.log(z);
    console.log(a);
}
exSpreadOperator()

const arr = [...a, ...b];
const obj = { a: 1, ...b, ...c };

fn.apply(null, arr);
fn(...arr);