const express    = require('express');
const router     = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');

const {
  getVaccinations,
  markVaccinationDone,
  logMedication,
  getMedications,
  checkSymptoms,
  getHealthOverview,
} = require('../controllers/healthController');

router.get('/overview',                    protect, getHealthOverview);
router.get('/vaccinations',                protect, getVaccinations);
router.put('/vaccinations/:vid/done',      protect, markVaccinationDone);
router.post('/medications',                protect, logMedication);
router.get('/medications',                 protect, getMedications);
router.get('/symptoms',                    protect, checkSymptoms);

module.exports = router;