const http = require('http');
const url = require('url')
const fs = require('fs')
const path = require('path')

let server = new http.Server(function (req, res) {
    var jsonString = '';
    res.setHeader('Content-Type', 'application/json');
    req.on('data', (data) => {
        jsonString += data;
    });

    req.on('end', () => {
        router(req, res, jsonString);
    });
});
server.listen(3000, 'localhost');

function show404(req, res) {
    const nopath = path.join(__dirname, 'nopage', 'index.html')

    fs.readFile(nopath, (err, html) => {
        if (!err) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end('' + html)
        }
        else {
            const text = "Something went wrong. Please contact webmaster";
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end(text)
        }
    })
}

function loadStaticFile(pathname, req, res) {
    const staticPath = path.join(__dirname, pathname)
    if (pathname === '/favicon.ico') {
    }
    else if (/[.]mp3$/gi.test(pathname)) {
        res.writeHead(200, { 'Content-Type': 'audio/mpeg' })
    }
    else if (/[.]css$/gi.test(pathname)) {
        res.writeHead(200, { 'Content-Type': 'text/css' })
    }
    else if (/[.]js$/gi.test(pathname)) {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
    }
    fs.createReadStream(staticPath).pipe(res)
}

function router(req, res, postData) {
    const urlParsed = url.parse(req.url, true)
    const pathname = urlParsed.pathname

    if (/[.]/.test(pathname)) {
        loadStaticFile(pathname, req, res)
        return
    }

    let filepath = path.join(__dirname, 'dynamic', pathname, 'index.js')
    fs.access(filepath, err => {
        if (!err) {
            const routeDestination = require(filepath)
            routeDestination.promise(res, req, postData)
                .then(result => {
                    res.writeHead(200)
                    res.end('' + result)
                })
                .catch(err => {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end(`${err.name}: ${err.message}`)
                })
        } else {
            filepath = path.join(__dirname, 'static', pathname, 'index.html')
            fs.readFile(filepath, 'utf-8', (err, html) => {
                if (err) {
                    show404(req, res)
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end('' + html)
                }
            })
        }
    })
}
