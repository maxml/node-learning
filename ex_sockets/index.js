var http = require('http');
var fs = require('fs');
var path = require('path');

var filePath = path.join(__dirname, 'index.html');
var stat = fs.statSync(filePath);

var server = http.createServer(function (req, res) {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': stat.size
        });
        var rs = fs.createReadStream(filePath);
        rs.pipe(res);
        return;
    }
    req.pipe(res);
});

server.listen(process.env.PORT || 3000);

const ws = require('ws')
var WebSocketServer = ws.Server,
    wss = new WebSocketServer({ server: server });

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        ws.send(message);
    });
});