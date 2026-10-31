const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
// `request` (deprecated, vulnerable) replaced with the global fetch (Node 18+).

function startWorker(path, cb) {
    let worker = new Worker(path, { workerData: null });

    worker.on('message', (msg) => {
        cb(null, msg)
    })
    worker.on('error', cb);
    worker.on('exit', (code) => {
        if (code != 0)
            console.error(new Error(`Worker stopped with exit code ${code}`))
    });

    return worker;
}

console.log("this is the main thread");

let myWorker = startWorker(__dirname + '/worker.js', (err, result) => {
    if (err) {
        return console.error(err);
    }

    console.log("[[Heavy computation function finished]]")
    console.log("First value is: ", result.val);
    console.log("Took: ", (result.timeDiff / 1000), " seconds");
});

const start = Date.now();
fetch('http://www.google.com')
    .then((resp) => resp.text())
    .then((body) => {
        console.log("Total bytes received: ", body.length);
        myWorker.postMessage({ finished: true, timeDiff: Date.now() - start }) //так можно отправлять сообщения воркеру
    })
    .catch((err) => console.error(err));