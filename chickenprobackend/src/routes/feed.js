const express    = require('express');
const router     = express.Router({ mergeParams: true }); // mergeParams to access :id from parent
const { protect } = require('../middleware/auth');

const {
  getRecommendation,
  logFeed,
  getFeedHistory,
  getFeedCost,
} = require('../controllers/feedController');

router.get('/recommendation', protect, getRecommendation);
router.post('/',              protect, logFeed);
router.get('/',               protect, getFeedHistory);
router.get('/cost',           protect, getFeedCost);

module.exports = router;