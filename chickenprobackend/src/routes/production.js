const express    = require('express');
const router     = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');

const {
  logEggs,
  getEggHistory,
  logWeight,
  getWeightHistory,
  getProductionOverview,
} = require('../controllers/productionController');

router.get('/',         protect, getProductionOverview);
router.post('/eggs',    protect, logEggs);
router.get('/eggs',     protect, getEggHistory);
router.post('/weights', protect, logWeight);
router.get('/weights',  protect, getWeightHistory);

module.exports = router;