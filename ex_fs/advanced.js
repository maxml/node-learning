const readline = require('readline');
const fs = require('fs');
const path = require('path');

function exAdditional() {
    // fs.open('/Users/flavio/test.txt', 'r', (err, fd) => {
    //fd - это дескриптор файла
    // });

    // r+ — открыть файл для чтения и для записи.
    // w+ — открыть файл для чтения и для записи, установив указатель потока в начало файла. Если файл не существует — он создаётся.
    // a — открыть файл для записи, установив указатель потока в конец файла. Если файл не существует — он создаётся.
    // a+ — открыть файл для чтения и записи, установив указатель потока в конец файла. Если файл не существует — он создаётся.

    fs.stat('ex/big.file.zz', (err, stats) => {
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
// exAdditional();

function readDir() {
    const folderPath = './';

    const isFile = fileName => {
        return fs.lstatSync(fileName).isFile()
    }

    const files = fs.readdirSync(folderPath)
        .map(fileName => {
            return path.join(folderPath, fileName)
        }).filter(isFile)

    console.log(files);
}
// readDir();

function simpleReadline() {
    const fileRebuilder = readline.createInterface({
        input: fs.createReadStream('./ex/big.file'),
        output: fs.createWriteStream('./ex/big-converted.file'),
    });

    var lineRead = 0;
    fileRebuilder.on('line', function (line) {
        lineRead++;

        console.log("@[ line", lineRead, "]", "writing!");
        fileRebuilder.output.write(line + "\n");
    }).on('close', function () {
        console.log("[fileRebuilder]", "closed");
        fileRebuilder.close();
    });
}
// simpleReadline();
