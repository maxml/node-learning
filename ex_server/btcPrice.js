const http = require('http');
const program = require('commander');
const chalk = require('chalk');
const express = require('express')

function getBtcPrice() {
    program.version('0.3.1')
        .option('-e, --euro', 'Show price in Euros')
        .option('-g, --great-british-pound', 'Show price in Great British Pound')
        .option('-r, --ruble', 'Show price in Rubles')
        .option('-j, --jpy', 'Show price in Japanese Yen')
        .option('-y, --yuan', 'Show price in Chinese Yuan')
        .option('-i, --indian-rupee', 'Show price in Indian Rupee')
        .option('-c, --cad', 'Show price in Canadian Dollar')
        .option('-s, --sek', 'Show price in Swedish Krona')
        .parse(process.argv);

    let currency;
    let symbol;

    if (program.euro) {
        currency = 'EUR';
        symbol = '€';
    } else if (program.greatBritishPound) {
        currency = 'GBP';
        symbol = '£';
    } else if (program.ruble) {
        currency = 'RUB';
        symbol = '₽';
    } else if (program.jpy) {
        currency = 'JPY';
        symbol = '¥';
    } else if (program.yuan) {
        currency = 'CNY';
        symbol = '¥';
    } else if (program.indianRupee) {
        currency = 'INR';
        symbol = '₹';
    } else if (program.cad) {
        currency = 'CAD';
        symbol = '$';
    } else if (program.sek) {
        currency = 'SEK';
        symbol = 'kr';
    } else {
        currency = 'USD';
        symbol = '$';
    }

    return new Promise((resolve, reject) => {
        http.get({
            host: 'api.coindesk.com',
            path: '/v1/bpi/currentprice/' + currency + '.json'
        }, function (response) {
            var body = '';
            response.on('data', function (d) {
                body += d;
            });
            response.on('end', function () {
                if (response.statusCode == 200) {
                    console.log(chalk.bgGreen.bold(symbol) + chalk.bgGreen.bold(JSON.parse(body).bpi[currency].rate));
                    resolve(JSON.parse(body).bpi[currency].rate);
                } else {
                    console.log(chalk.red("Error retrieving prices from api.coindesk.com."));
                    reject(new Error('No result from server'))
                }
            });
        });
    })
};

const app = express();
const port = 3000;

app.get('/', (request, response) => {
    getBtcPrice()
        .then(data => response.send(data))
        .catch(console.err)
});

app.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }

    console.log(`server is listening on ${port}`)
});
