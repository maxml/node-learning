const express = require('express')

const app = express()
const port = 3000

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
