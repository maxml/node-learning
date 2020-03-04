const fs = require('fs');
const dir = '/home/admin1/finik/ex/ex_fs/ex';

function createFolder() {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        }
    } catch (err) {
        console.error(err)
    }
}
// createFolder();

function readDir() {
    fs.readdir(dir, (err, files) => {
        if (err) {
            return console.error(err);
        }

        console.log(files.join('\n'));
    });
}
readDir();
