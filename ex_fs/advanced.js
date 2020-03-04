const readline = require('readline');
const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');

// TODO: 
function exStream() {
    var file = 'hello.txt';
    var linesCount = 0;
    var rl = readline.createInterface({
        input: fs.createReadStream(file),
        output: process.stdout,
        terminal: false
    });
    rl.on('line', function (line) {
        console.log(line) // print the content of the line on each linebreak
        linesCount++; // on each linebreak, add +1 to 'linesCount'
    });
    rl.on('close', function () {
        console.log(linesCount); // print the result when the 'close' event is called
    });

    // TODO: streams

    var readable = fs.createReadStream(__dirname + '/node.txt', {
        encoding: 'utf8', highWaterMark: 16 *
            1024
    });
    var writable = fs.createWriteStream(__dirname + '/nodeCopy.txt');
    readable.on('data', function (chunk) {
        writable.write(chunk);
    });


    // TODO: https://github.com/jprichardson/node-fs-extra
    // TODO: example https://github.com/paulmillr/chokidar

    let chunks = [];
    let fileBuffer;

    let fileStream = fs.createReadStream('text.txt');
    fileStream.once('error', (err) => {
        console.error(err);
    });
    fileStream.once('end', () => {
        fileBuffer = Buffer.concat(chunks);

        // fileBuffer.
    });

    fileStream.on('data', (chunk) => {
        chunks.push(chunk);
    });

    // TODO: serialization/deserialization
}

function exAdditional() {
    fs.open('/Users/flavio/test.txt', 'r', (err, fd) => {
        //fd - это дескриптор файла
    });

    // r+ — открыть файл для чтения и для записи.
    // w+ — открыть файл для чтения и для записи, установив указатель потока в начало файла. Если файл не существует — он создаётся.
    // a — открыть файл для записи, установив указатель потока в конец файла. Если файл не существует — он создаётся.
    // a+ — открыть файл для чтения и записи, установив указатель потока в конец файла. Если файл не существует — он создаётся.

    fs.stat('/Users/flavio/test.txt', (err, stats) => {
        if (err) {
            console.error(err)
            return
        }

        console.log(stats.isFile());
        console.log(stats.isDirectory());
        console.log(stats.isSymbolicLink());
        console.log(stats.size);
    })
}

function exPath() {
    const notes = '/users/flavio/notes.txt'
    path.dirname(notes) // /users/flavio
    path.basename(notes) // notes.txt
    path.extname(notes) // .txt

    const name = 'flavio'
    path.join('/', 'users', name, 'notes.txt')

    path.resolve('flavio.txt')
    path.resolve('tmp', 'flavio.txt')
    path.normalize('/users/flavio/..//test.txt')
}
// exPath()

function readDir() {
    const folderPath = './';
    const isFile = fileName => {
        return fs.lstatSync(fileName).isFile()
    }
    const files = fs.readdirSync(folderPath).map(fileName => {
        return path.join(folderPath, fileName)
    }).filter(isFile)

    console.log(files);
}
// readDir();

function exExtra() {
    fs.remove(folder).then(() => {
        console.log('Done');
    }).catch(err => {
        console.error(err)
    })
}
exExtra();