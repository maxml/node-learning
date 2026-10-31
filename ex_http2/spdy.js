// HISTORICAL, does not run: `spdy` (unmaintained since 2020) depends on
// http-deceiver, which calls process.binding('http_parser') that modern Node
// removed, and its dependency tree carries open advisories, so `spdy` and
// `express` were dropped from package.json (2026-10-31). The working
// equivalent is fastify.js.
const port = 3000
const spdy = require('spdy')
const express = require('express')
const fs = require('fs')

const app = express()

app.get('*', (req, res) => {
    res
        .status(200)
        .json({ message: 'You are working with Http/2' })
})

const options = {
    key: fs.readFileSync(__dirname + '/server.key'),
    cert: fs.readFileSync(__dirname + '/server.crt')
}

spdy
    .createServer(options, app)
    .listen(port, (error) => {
        if (error) {
            console.error(error)
            return process.exit(1)
        }

        console.log('Listening on port: ' + port + '.')
    })