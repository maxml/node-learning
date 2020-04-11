const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const request = require("request");

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
request.get('http://www.google.com', (err, resp) => {
    if (err) {
        return console.error(err);
    }
    console.log("Total bytes received: ", resp.body.length);
    myWorker.postMessage({ finished: true, timeDiff: Date.now() - start }) //так можно отправлять сообщения воркеру
})