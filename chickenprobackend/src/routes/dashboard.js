const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');

const {
  getOverview,
  getRevenueChart,
  getBatchChart,
  getMortalityChart,
  getEggChart,
  getWeightChart,
  getFarmReport,
} = require('../controllers/dashboardController');

router.get('/overview',          protect, getOverview);
router.get('/charts/revenue',    protect, getRevenueChart);
router.get('/charts/batches',    protect, getBatchChart);
router.get('/charts/mortality',  protect, getMortalityChart);
router.get('/charts/eggs',       protect, getEggChart);
router.get('/charts/weights',    protect, getWeightChart);
router.get('/report',            protect, getFarmReport);

module.exports = router;