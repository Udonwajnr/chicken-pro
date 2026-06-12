const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
  createProduct, getMyProducts, getProducts,
  getProduct, updateProduct, deleteProduct, searchProducts,
} = require('../controllers/productController');

router.post('/',          protect, createProduct);
router.get('/mine',       protect, getMyProducts);
router.get('/search',     protect, searchProducts);
router.get('/',           protect, getProducts);
router.get('/:id',        protect, getProduct);
router.put('/:id',        protect, updateProduct);
router.delete('/:id',     protect, deleteProduct);

module.exports = router;