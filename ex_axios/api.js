const axios = require("axios");

const BASE_URL = "https://api.github.com";
const options = {
    url: BASE_URL + '/users/maxml',
    headers: {
        'User-Agent': 'request'
    }
};

module.exports = () => {
    return new Promise((resolve, reject) => {

        axios(options)
            .then((response) => {
                console.log("Data: " + JSON.stringify(response.data));
                console.log("Status: " + JSON.stringify(response.status));
                console.log("StatusText: " + JSON.stringify(response.statusText));
                console.log("Headers: " + JSON.stringify(response.headers));
                console.log("Config: " + JSON.stringify(response.config));

                resolve(response.data);
            })
            .catch(err => {
                console.log(err);
                reject();
            })
    })
}