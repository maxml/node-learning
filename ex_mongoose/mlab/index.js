const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const product = require('./routes/product.route');

// =========================== DATABASE

let devDbUrl = 'mongodb://admin:qwerty123456@ds235328.mlab.com:35328/productstutorial';
let mongoDB = process.env.MONGODB_URI || devDbUrl;
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// =========================== SERVER

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/products', product);

const port = 3000;
app.listen(port, () => {
    console.log('Server is up and running on port number ' + port);
});

