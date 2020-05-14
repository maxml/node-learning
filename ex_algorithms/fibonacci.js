function fibonacci(n) {
    const fibSequence = [1];

    let currentValue = 1;
    let previousValue = 0;

    if (n === 1) {
        return fibSequence;
    }

    let iterationsCounter = n - 1;

    while (iterationsCounter) {
        currentValue += previousValue;
        previousValue = currentValue - previousValue;

        fibSequence.push(currentValue);

        iterationsCounter -= 1;
    }

    return fibSequence;
}

console.log(fibonacci(10));
console.log(fibonacci(20));
console.log(fibonacci(40));
console.log(fibonacci(100));
console.log(fibonacci(300).slice(250, 300));
console.log(fibonacci(500).slice(450, 500));

function fibonacciNth(n) {
    let currentValue = 1;
    let previousValue = 0;

    if (n === 1) {
        return 1;
    }

    let iterationsCounter = n - 1;

    while (iterationsCounter) {
        currentValue += previousValue;
        previousValue = currentValue - previousValue;

        iterationsCounter -= 1;
    }

    return currentValue;
}
console.log(fibonacciNth(600));
console.log(fibonacciNth(700));
console.log(fibonacciNth(900));
console.log(fibonacciNth(1200));
console.log(fibonacciNth(1350));
console.log(fibonacciNth(1425));
console.log(fibonacciNth(1460));
console.log(fibonacciNth(1470));
console.log(fibonacciNth(1475));
console.log(fibonacciNth(1476));
console.log(fibonacciNth(1477));
console.log(fibonacciNth(1478));
console.log(fibonacciNth(1480));
console.log(fibonacciNth(1500));
