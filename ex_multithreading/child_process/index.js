const express = require('express')
const { fork } = require('child_process');

const app = express()
const port = 3000

app.get('/endpoint', (request, response) => {
    const process = fork('./sendMail.js');
    const mails = ['email1', 'email2'];

    process.send({ mails });
    process.on('message', (message) => {
        console.log(`Number of mails sent ${message.counter}`);

        return response.json({ status: true, conter: message.counter });
    });

});

app.all('*', (request, response) => {
    console.log(request.url);
    response.send('Hello from Express!')
});

app.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }

    console.log(`server is listening on ${port}`)
});
