const { parentPort } = require('worker_threads');

function random(min, max) {
    return Math.random() * (max - min) + min
}

const sorter = require("./heavySorter");

const start = Date.now()
let bigList = Array(1000000).fill().map((_) => random(1, 10000))

// parentPort.on('message', (msg) => {
//     console.log("Main thread finished on: ", (msg.timeDiff / 1000), " seconds...");
// });

sorter.sort(bigList);
parentPort.postMessage({ val: sorter.firstValue, timeDiff: Date.now() - start });
