function exSimple() {
    let str = "Hello";

    let iterator = str[Symbol.iterator]();

    while (true) {
        let result = iterator.next();
        if (result.done) break;

        console.log(result.value);
    }
}
exSimple();

function exFrom() {
    function slice(str, start, end) {
        return Array.from(str).slice(start, end).join('');
    }

    let str = 'Helllo world';

    console.log(slice(str, 1, 3));

    console.log(str.slice(1, 3));
}
exFrom();