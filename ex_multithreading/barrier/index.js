var simpleBarrier = require('./library'),
    fs = require('fs');

// `request` (deprecated, vulnerable) replaced with the global fetch (Node 18+),
// wrapped into the same Node-style callback that barrier.waitOn() expects.
function request(url, callback) {
    fetch(url)
        .then(function (res) { return res.text(); })
        .then(function (body) { callback(null, body); }, callback);
}

var barrier = simpleBarrier();

function exFile() {
    fs.readFile('1.txt', barrier.waitOn());
    fs.readFile('2.txt', barrier.waitOn());
    fs.readFile('3.txt', barrier.waitOn());

    barrier.endWith(function (results) {
        console.log('foo, bar, and baz are:', results.join('\n'));
    });
}
exFile();

function exNetwork() {
    function extractUsefulPart(err, data) {
        if (!err) {
            return JSON.parse(data).usefulBit;
        }
        return null;
    }

    request('http://example.com/foo.json', barrier.waitOn(extractUsefulPart));
    request('http://example.com/baz.json', barrier.waitOn(extractUsefulPart));

    barrier.endWith(function (usefulBits) {
        usefulBits.forEach(function (bit) {
            console.log(bit + ' is useful');
        });
    });
}