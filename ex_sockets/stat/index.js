const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '/public')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.htm'));
});

const { createServer } = require('http');
const WebSocket = require('ws');
const server = createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function (ws) {
    const id = setInterval(function () {
        ws.send(JSON.stringify(process.memoryUsage()), function () {
            //
            // Ignore errors.
            //
        });
    }, 100);
    console.log('started client interval');

    ws.on('close', function () {
        console.log('stopping client interval');
        clearInterval(id);
    });
});

server.listen(3000, function () {
    console.log('Listening on http://localhost:3000');
});