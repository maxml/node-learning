const fs = require('fs');
const path = 'ex/hello.txt';

function readFile() {
    fs.readFile(path, { encoding: 'utf8' }, (err, content) => {
        if (err) {
            return console.error(err);
        }

        console.log(content);
    });
}
// readFile();

function access() {
    fs.access(path, fs.constants.X_OK, (err) => {
        if (err) {
            console.log("%s doesn't exist", path);
        } else {
            console.log('can execute %s', path);
        }
    });

    fs.access(path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
        if (err) {
            console.log("%s doesn't exist", path);
        } else {
            console.log('can read/write %s', path);
        }
    });
}
// access();

function isExisted() {
    fs.stat(path, function (err) {
        if (!err) {
            console.log('file or directory exists');
        } else if (err.code === 'ENOENT') {
            console.log('file or directory does not exist');
        }
    });
}
// isExisted();

function writeFile() {
    fs.writeFile(path, 'Hello world!', function (err) {
        if (err) {
            return console.error(err);
        }

        console.log('File is created');
    });
}
// writeFile();
// isExisted();
// access();
// readFile();

function updateFile() {
    fs.readFile(path, 'utf-8', function (err, data) {
        if (err) {
            return console.error(err);
        }

        const newValue = data.replace(/world/gim, 'team');
        fs.writeFile(path, newValue, 'utf-8', function (err) {
            if (err) {
                return console.error(err);
            }

            console.log('Done!');
        })
    })
}
// updateFile();

function deleteFile() {
    fs.unlink(path, function (err) {
        if (err) {
            return console.log(err);
        }

        console.log('file deleted');
    });
}
// deleteFile();

function renameFile() {
    writeFile();

    getCurrentFilenames();

    // Rename the file 
    fs.rename(path, 'newname.txt', () => {
        console.log("\nFile Renamed!\n");

        // List all the filenames after renaming 
        getCurrentFilenames();
    });

    function getCurrentFilenames() {
        console.log("Current filenames:");
        fs.readdirSync(__dirname).forEach(file => {
            console.log(file);
        });
    }
}
// renameFile();

function append() {
    const content = 'Some content!'
    fs.appendFile(path, content, (err) => {
        if (err) {
            return console.error(err)
        }

        console.log('Added');
    })
}
// append();