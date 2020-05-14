// cli input
process.argv.forEach(function (val, index, array) {
    console.log(index + ': ' + val);
});

var args = process.argv.slice(2);
console.log(args);
