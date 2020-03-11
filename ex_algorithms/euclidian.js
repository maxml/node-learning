function euclideanAlgorithmIterative(originalA, originalB) {
    let a = Math.abs(originalA);
    let b = Math.abs(originalB);

    while (a && b && a !== b) {
        [a, b] = a > b ? [a - b, b] : [a, b - a];
    }

    return a || b;
}

function euclideanAlgorithm(originalA, originalB) {
    const a = Math.abs(originalA);
    const b = Math.abs(originalB);

    return (b === 0) ? a : euclideanAlgorithm(b, a % b);
}

console.log(euclideanAlgorithm(213, 109));
console.log(euclideanAlgorithm(214, 110));
console.log(euclideanAlgorithm(215, 120));
console.log(euclideanAlgorithm(220, 120));
console.log(euclideanAlgorithm(240, 120));
