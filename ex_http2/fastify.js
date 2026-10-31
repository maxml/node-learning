// The same JSON endpoint as spdy.js, but on a maintained stack: Fastify serves
// HTTP/2 natively (`http2: true`) on top of Node's built-in http2 module.
// Express 4/5 cannot run on http2.createSecureServer (its req/res extend the
// HTTP/1 classes), and spdy, which patched that, no longer runs on Node 24.
const fs = require('fs')
const port = 3000

const fastify = require('fastify')({
    http2: true,
    https: {
        allowHTTP1: true, // clients without HTTP/2 still get an answer over HTTP/1.1
        key: fs.readFileSync(__dirname + '/server.key'),
        cert: fs.readFileSync(__dirname + '/server.crt')
    }
})

fastify.get('/*', async (request, reply) => {
    return { message: 'You are working with Http/' + request.raw.httpVersion }
})

fastify.listen({ port }, (error) => {
    if (error) {
        console.error(error)
        return process.exit(1)
    }

    console.log('Listening on port: ' + port + '.')
})
