const express = require('express');
const app = express()

app.use((err, request, response, next) => {
    console.log(err)
    response.status(500).send('Something broke!')
})

app.get('/', (request, response) => {
    throw new Error('oops');
});

app.listen(3000)