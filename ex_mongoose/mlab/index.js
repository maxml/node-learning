const express = require('express');
const mongoose = require('mongoose');

const product = require('./routes/product.route');

// =========================== DATABASE

// Рядок підключення лише з оточення; за замовчуванням локальний MongoDB
// (mLab закрито в 2020). Облікові дані в коді не зберігаємо.
const mongoDB = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/productstutorial';
mongoose.connect(mongoDB).catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
});

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// =========================== SERVER

const app = express();
// body-parser вбудовано в Express (express.json / express.urlencoded)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/products', product);

const port = Number(process.env.PORT) || 3000;
// Express 5 передає помилку listen (напр. EADDRINUSE) у колбек, а не кидає її
app.listen(port, (err) => {
    if (err) throw err;
    console.log('Server is up and running on port number ' + port);
});
