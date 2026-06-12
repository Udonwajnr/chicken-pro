const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
  createStore, getMyStore, getStore,
  updateStore, getSellerDashboard,
} = require('../controllers/storeController');

router.post('/',              protect, createStore);
router.get('/me',             protect, getMyStore);
router.get('/me/dashboard',   protect, getSellerDashboard);
router.get('/:id',            protect, getStore);
router.put('/me',             protect, updateStore);

module.exports = router;