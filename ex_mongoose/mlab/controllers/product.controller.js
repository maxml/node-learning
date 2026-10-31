const Product = require('../models/product.model');

// Mongoose 7+ не приймає колбеки, тому обробники async. Express 5 сам передає
// відхилений проміс з async-обробника в next(err), окремий try/catch не потрібен.

exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.productCreate = async function (req, res) {
    let product = new Product(
        {
            name: req.body.name,
            price: req.body.price
        }
    );

    await product.save();
    res.send('Product Created successfully');
};

exports.productDetails = async function (req, res) {
    const product = await Product.findById(req.params.id);
    res.send(product);
};

exports.productUpdate = async function (req, res) {
    await Product.findByIdAndUpdate(req.params.id, { $set: req.body });
    res.send('Product udpated.');
};

exports.productDelete = async function (req, res) {
    // findByIdAndRemove прибрано в Mongoose 8
    await Product.findByIdAndDelete(req.params.id);
    res.send('Deleted successfully!');
};
