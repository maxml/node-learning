const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");

const app = express();

const port = process.env.PORT || 3000;
console.log("Port is: " + port);

// ======================================== MIDDLEWARE
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cors());
app.use(loggerMiddleware);

function loggerMiddleware(request, response, next) {
    console.log(`loggerMiddleware, ${request.method} ${request.path}`);
    console.log("loggerMiddleware, time: " + new Date().toLocaleString());

    console.log("loggerMiddleware, request query: " + JSON.stringify(request.query));
    console.log("loggerMiddleware, request body: " + JSON.stringify(request.body));
    console.log("loggerMiddleware, request headers: " + JSON.stringify(request.headers));
    // https://github.com/expressjs/express/issues/3177
    console.log("loggerMiddleware, request params: " + request.params);

    next();
}

app.get('/users/:username', function (request, response) {
    console.log(request.params.username);
    response.send('You\'ve found the treasure');
});

app.all("*", (_, response) => {
    response.send("Hello, project!");
});

app.listen(port, () => {
    console.log("Example app listening on port " + port);
});

