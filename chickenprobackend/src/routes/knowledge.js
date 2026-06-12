const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');

const {
  getMarketPrices,
  getGuides,
  getGuide,
  getDiseases,
  getDisease,
  getVideos,
  getHubOverview,
} = require('../controllers/knowledgeController');

router.get('/',                  protect, getHubOverview);
router.get('/market-prices',     protect, getMarketPrices);
router.get('/guides',            protect, getGuides);
router.get('/guides/:id',        protect, getGuide);
router.get('/diseases',          protect, getDiseases);
router.get('/diseases/:name',    protect, getDisease);
router.get('/videos',            protect, getVideos);

module.exports = router;