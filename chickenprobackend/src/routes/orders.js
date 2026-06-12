const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOrder, verifyPayment, getMyOrders,
  getOrder, updateOrderStatus, raiseDispute,
} = require('../controllers/orderController');

router.post('/',                    protect, createOrder);
router.post('/verify',              protect, verifyPayment);
router.get('/',                     protect, getMyOrders);
router.get('/:id',                  protect, getOrder);
router.put('/:id/status',           protect, updateOrderStatus);
router.put('/:id/dispute',          protect, raiseDispute);

module.exports = router;