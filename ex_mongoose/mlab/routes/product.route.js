const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');

router.get('/test', productController.test);
router.post('/create', productController.productCreate);
router.get('/:id', productController.productDetails);
router.put('/:id/update', productController.productUpdate);
router.delete('/:id/delete', productController.productDelete);

module.exports = router;