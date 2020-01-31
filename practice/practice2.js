let functionVariable = function (param1) {
    console.log('sfd')
}

let var2 = functionVariable;

// var2();

// console.log();

// let a = 4;


// let i = 3;

// while (i) {
//     console.log(i--);
// }

// console.log(null || 0 && 0);

let array = new Array(100);

array[0] = 0;

array.push('jdf', 'sdfsdf');
array.pop();

array.unshift('sdfs', 'sdfsd');
array.unshift(['sdfs', 'sdfsd']);
// array.shift();

delete array[3];

// console.log(array);

function f(c) {
    let d = c || 3;
    // if (c === undefined) {
    //     c = 3;
    // }

    let a = 0;
    console.log(a);

    console.log('array' + array);

    console.log(d);

    return (+'2' + '4');
}

let a = undefined;
// console.log(f(a));


// checkArrayMethodExecutionTime();

doArraySplice();

function checkArrayMethodExecutionTime() {
    let arr2 = [];
    // arr2[2] = 3;
    console.log(arr2)

    function someFunction() {
        for (let i = 0; i < 100; i++) {
            arr2[i] = 1;
        }
    }

    function someFunction2() {
        for (let i = 0; i < 100; i++) {
            arr2.push(1);
        }
    }

    function someFunction3() {
        for (let i = 0; i < 100; i++) {
            arr2.unshift(1);
        }
    }

    arr2 = [];
    console.time('someFunction');

    someFunction(); // Whatever is timed goes between the two "console.time"
    console.log(arr2.length)

    console.timeEnd('someFunction');

    arr2 = [];
    console.time('someFunction2');

    someFunction2(); // Whatever is timed goes between the two "console.time"
    console.log(arr2.length)

    console.timeEnd('someFunction2');

    arr2 = [];
    console.time('someFunction3');

    someFunction3(); // Whatever is timed goes between the two "console.time"
    console.log(arr2.length)

    console.timeEnd('someFunction3');
}

function doArraySplice() {
    [["Bilbo", 'dsfd'], "Gandalf", "Nazgul", 'test'].forEach((item, index, array) => {
        // console.log(`${item} is at index `);
        if (item === 'Gandalf') {
            // console.log(array.slice());
            // console.log(array)
        }
    });
}

let array2 = [["Bilbo2", 'dsfd2'], "Gandalf", "Nazgul", 'test']
for (let index = 0; index < array2.length; index++) {
    const element = array2[index];
    // console.log(element);
}

const myAwesomeArray = [[1, 2], [3, 4]]

console.log(myAwesomeArray.concat(11, 23, [11, 23]));
console.log();

let newArr = myAwesomeArray.flat().filter((item) => {
    return item > 2
})


newArr = myAwesomeArray.flat().map((item) => {
    return item * 2
})


newArr = myAwesomeArray.flat().reduce((item, aggregator) => {
    return aggregator + item
}, 1000)

console.log(newArr);
