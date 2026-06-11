const express    = require('express');
const router     = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');

const {
  logExpense,
  getExpenses,
  deleteExpense,
  logSale,
  getSales,
  deleteSale,
  getPnL,
  getFinanceOverview,
} = require('../controllers/financeController');

// ─── Batch-specific routes ────────────────────
// Used via /api/batches/:id/finance/...
router.post('/expenses',              protect, logExpense);
router.get('/expenses',               protect, getExpenses);
router.delete('/expenses/:expenseId', protect, deleteExpense);
router.post('/sales',                 protect, logSale);
router.get('/sales',                  protect, getSales);
router.delete('/sales/:saleId',       protect, deleteSale);
router.get('/pnl',                    protect, getPnL);

// ─── Global route ─────────────────────────────
// Used via /api/finance/overview
router.get('/overview',               protect, getFinanceOverview);

module.exports = router;