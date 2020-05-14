const cluster = require('cluster')
const http = require('http')
const numCPUs = require('os').cpus().length

if (cluster.isMaster) {
    masterProcess()
} else {
    childProcess()
}

function masterProcess() {
    console.log(`Master ${process.pid} is running`)

    for (let i = 0; i < numCPUs; i++) {
        console.log(`Forking process number ${i}...`)
        cluster.fork()
    }
}

function childProcess() {
    console.log(`Process ${process.pid} started...`)

    http.createServer((req, res) => {
        console.log(`request on ${process.pid}`);

        setTimeout(() => {
            res.writeHead(200)
            res.end(`Hello World from ${process.pid}`)
        }, 1000);
    }).listen(3000)
}