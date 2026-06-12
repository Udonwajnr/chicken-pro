const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');

const {
  createBatch,
  getBatches,
  getBatch,
  updateBatch,
  deleteBatch,
  logDailyUpdate,
  getDailyUpdates,
} = require('../controllers/batchController');

router.post('/',                      protect, createBatch);
router.get('/',                       protect, getBatches);
router.get('/:id',                    protect, getBatch);
router.put('/:id',                    protect, updateBatch);
router.delete('/:id',                 protect, deleteBatch);
router.post('/:id/updates',           protect, logDailyUpdate);
router.get('/:id/updates',            protect, getDailyUpdates);

module.exports = router;