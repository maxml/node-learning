const fs = require('fs');
require('colors');
const path = './ex/big.file'
const zlib = require('zlib');
const crypto = require('crypto');

const { Readable, Writable, Duplex, Transform } = require('stream');


function exStream() {
    const file = fs.createWriteStream(path);

    for (let i = 0; i <= 1e7; i++) {
        file.write('Lorem ipsum dolor sit amet, '
            + 'consectetur adipisicing elit, sed do eiusmod tempor incididunt'
            + 'ut labore et dolore magna aliqua. Ut enim ad minim'
            + 'veniam, quis nostrud exercitation ullamco laboris'
            + 'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n');
    }

    file.end();
}
// exStream();

function readFile() {
    fs.readFile(path, { encoding: 'utf8' }, (err, content) => {
        if (err) {
            return console.error(err);
        }

        console.log(content);
    });
}
// readFile();

function readStream() {
    const readable = fs.createReadStream(path);

    readable.pipe(process.stdin);

    readable.on('data', (chunk) => {
        console.log(chunk.toString().red);
    });

    readable.on('end', () => {
        readable.end();
    });

    // readableSrc
    //     .pipe(transformStream1)
    //     .pipe(transformStream2)
    //     .pipe(finalWrtitableDest)
}
// readStream();

function ownStreams() {
    // const outStream = new Writable({
    //     write(chunk, _, callback) {
    //         console.log(chunk.toString());
    //         callback();
    //     }
    // });

    // process.stdin.pipe(outStream);

    const inStream = new Readable({
        read() { }
    });

    inStream.push('ABCDEFGHIJKLM');
    inStream.push('NOPQRSTUVWXYZ\n');

    inStream.push(null); // No more data

    inStream.pipe(process.stdout);
}
// ownStreams();

function exDuplex() {
    const duplexStream = new Duplex({
        write(chunk, encoding, callback) {
            console.log(chunk.toString());
            callback();
        },

        read(size) {
            this.push(String.fromCharCode(this.currentCharCode++));
            if (this.currentCharCode > 90) {
                this.push(null);
            }
        }
    });

    duplexStream.currentCharCode = 65;

    process.stdin.pipe(duplexStream).pipe(process.stdout);
}
// exDuplex();

function exTransform() {
    const upperCaseTr = new Transform({
        transform(chunk, encoding, callback) {
            this.push(chunk.toString().toUpperCase());
            callback();
        }
    });

    process.stdin.pipe(upperCaseTr).pipe(process.stdout);
}
// exTransform();

function sendObject() {
    const commaSplitter = new Transform({
        readableObjectMode: true,

        transform(chunk, encoding, callback) {
            this.push(chunk.toString().trim().split(','));
            callback();
        }
    });

    const arrayToObject = new Transform({
        readableObjectMode: true,
        writableObjectMode: true,

        transform(chunk, encoding, callback) {
            const obj = {};
            for (let i = 0; i < chunk.length; i += 2) {
                obj[chunk[i]] = chunk[i + 1];
            }
            this.push(obj);
            callback();
        }
    });

    const objectToString = new Transform({
        writableObjectMode: true,

        transform(chunk, encoding, callback) {
            this.push(JSON.stringify(chunk) + '\n');
            callback();
        }
    });

    process.stdin
        .pipe(commaSplitter)
        .pipe(arrayToObject)
        .pipe(objectToString)
        .pipe(process.stdout)
}
// sendObject();

function simpleZlib() {
    const file = process.argv[2];

    fs.createReadStream(file)
        .pipe(zlib.createGzip())
        .pipe(fs.createWriteStream(file + '.gz'));
}
// simpleZlib();

function simpleCrypto() {
    const file = process.argv[2];

    const reportProgress = new Transform({
        transform(chunk, encoding, callback) {
            process.stdout.write('.');
            callback(null, chunk);
        }
    });

    fs.createReadStream(file)
        .pipe(zlib.createGzip())
        .pipe(crypto.createCipher('aes192', 'a_secret'))
        .pipe(reportProgress)
        .pipe(fs.createWriteStream(file + '.zz'))
        .on('finish', () => console.log('Done'));
}
// simpleCrypto();
