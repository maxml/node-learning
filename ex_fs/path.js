const path = require('path');

console.log(path.basename('/foo/bar/baz/asdf/quux.html', '.html'));
console.log(path.dirname('/foo/bar/baz/asdf/quux.html'));

// console.log(process.env.PATH.split(path.delimiter));

console.log(path.extname('index.coffee.md'));
console.log(path.extname('index.'));
console.log(path.extname('index'));
console.log(path.extname('.index'));

console.log(
    path.format({
        root: '/',
        name: 'file',
        ext: '.txt'
    })
);

console.log(path.isAbsolute('/foo/bar'));
console.log(path.isAbsolute('//server'));

console.log(path.join('/foo', 'bar', 'baz/asdf', 'quux', '..'));

console.log(path.normalize('/foo/bar//baz/asdf/quux/..'));

console.log(path.parse('/home/user/dir/file.txt'));

console.log(path.relative('/data/orandea/test/aaa', '/data/orandea/impl/bbb'));

console.log(path.resolve(__dirname, 'someFile'));
console.log(path.resolve('wwwroot', 'static_files/png/', '../gif/image.gif'));

console.log('foo/bar/baz'.split(path.sep));

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
