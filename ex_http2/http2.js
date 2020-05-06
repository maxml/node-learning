const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
    key: fs.readFileSync(__dirname + '/server.key'),
    cert: fs.readFileSync(__dirname + '/server.crt')
});

server.on('error', (err) => console.error(err));
server.on('stream', (stream, headers) => {
    // stream is a Duplex
    stream.respond({
        'content-type': 'text/html',
        ':status': 200
    });
    stream.end('<h1>Hello World</h1>');
});

console.log(process.argv);
const port = process.argv[2];

server.listen(port, (err) => {
    if (err) {
        throw new Error(err);
    }

    /* eslint-disable no-console */
    console.log('Listening on port: ' + port + '.');
    /* eslint-enable no-console */
});
