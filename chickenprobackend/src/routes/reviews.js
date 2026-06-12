const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
  submitReview, getStoreReviews,
} = require('../controllers/reviewController');

router.post('/',                   protect, submitReview);
router.get('/store/:storeId',      protect, getStoreReviews);

module.exports = router;