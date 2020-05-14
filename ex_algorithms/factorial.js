function factorialRecursive(number) {
    return number > 1 ? number * factorialRecursive(number - 1) : 1;
}

function factorial(number) {
    let result = 1;

    for (let i = 2; i <= number; i += 1) {
        result *= i;
    }

    return result;
}

console.log(factorial(100));
console.log(factorial(150));
console.log(factorial(165));
console.log(factorial(170));
console.log(factorial(171));
console.log(factorial(175));
console.log(factorial(200));

console.log(factorialRecursive(100));
console.log(factorialRecursive(170));
console.log(factorialRecursive(171));
console.log(factorialRecursive(200));
