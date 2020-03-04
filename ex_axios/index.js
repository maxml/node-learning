const api = require('./api');
api()
    .then((res) => {
        console.log('Result= ' + JSON.stringify(res));
    })
    .catch((err) => {
        console.log(err);
    })