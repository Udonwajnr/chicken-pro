const Expense      = require('../models/Expense');
const Sale         = require('../models/Sale');
const Batch        = require('../models/Batch');
const asyncHandler = require('../utils/asyncHandler');

// ─── HELPER ──────────────────────────────────
async function getBatch(batchId, userId) {
  return await Batch.findOne({ _id: batchId, userId });
}

// ════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════

// ─── LOG EXPENSE ─────────────────────────────
exports.logExpense = asyncHandler(async (req, res) => {
  const { category, amount, date, description } = req.body;

  const batch = await getBatch(req.params.id, req.user._id);
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  if (!category || !amount) {
    return res.status(400).json({ success: false, message: 'Category and amount are required' });
  }

  const expense = await Expense.create({
    batchId: batch._id,
    userId:  req.user._id,
    category,
    amount,
    date:        date || new Date(),
    description,
  });

  res.status(201).json({ success: true, expense });
});

// ─── GET EXPENSES ────────────────────────────
exports.getExpenses = asyncHandler(async (req, res) => {
  const batch = await getBatch(req.params.id, req.user._id);
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const expenses = await Expense.find({ batchId: batch._id }).sort({ date: -1 });

  // Breakdown by category
  const byCategory = expenses.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = { total: 0, count: 0 };
    acc[exp.category].total += exp.amount;
    acc[exp.category].count += 1;
    return acc;
  }, {});

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  res.json({
    success: true,
    count:   expenses.length,
    totalExpenses,
    byCategory,
    expenses,
  });
});

// ─── DELETE EXPENSE ──────────────────────────
exports.deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({
    _id:    req.params.expenseId,
    userId: req.user._id,
  });

  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  res.json({ success: true, message: 'Expense deleted' });
});

// ════════════════════════════════════════
// SALES
// ════════════════════════════════════════

// ─── LOG SALE ────────────────────────────────
exports.logSale = asyncHandler(async (req, res) => {
  const { buyerName, quantity, pricePerUnit, date, notes } = req.body;

  const batch = await getBatch(req.params.id, req.user._id);
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  if (!quantity || !pricePerUnit) {
    return res.status(400).json({ success: false, message: 'Quantity and price per unit are required' });
  }

  const sale = await Sale.create({
    batchId: batch._id,
    userId:  req.user._id,
    buyerName,
    quantity,
    pricePerUnit,
    date:  date || new Date(),
    notes,
  });

  res.status(201).json({ success: true, sale });
});

// ─── GET SALES ───────────────────────────────
exports.getSales = asyncHandler(async (req, res) => {
  const batch = await getBatch(req.params.id, req.user._id);
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const sales = await Sale.find({ batchId: batch._id }).sort({ date: -1 });

  const totalRevenue   = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalUnitsSold = sales.reduce((sum, s) => sum + s.quantity,    0);

  res.json({
    success: true,
    count:   sales.length,
    totalRevenue,
    totalUnitsSold,
    sales,
  });
});

// ─── DELETE SALE ─────────────────────────────
exports.deleteSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOneAndDelete({
    _id:    req.params.saleId,
    userId: req.user._id,
  });

  if (!sale) {
    return res.status(404).json({ success: false, message: 'Sale not found' });
  }

  res.json({ success: true, message: 'Sale deleted' });
});

// ════════════════════════════════════════
// P&L — PROFIT AND LOSS
// ════════════════════════════════════════

exports.getPnL = asyncHandler(async (req, res) => {
  const batch = await getBatch(req.params.id, req.user._id);
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const [expenses, sales] = await Promise.all([
    Expense.find({ batchId: batch._id }),
    Sale.find({ batchId: batch._id }),
  ]);

  // ── Expense calculations ──
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = expenses.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = 0;
    acc[exp.category] += exp.amount;
    return acc;
  }, {});

  // ── Revenue calculations ──
  const totalRevenue   = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalUnitsSold = sales.reduce((sum, s) => sum + s.quantity,    0);

  // ── Profit calculations ──
  const netProfit    = totalRevenue - totalExpenses;
  const isProfit     = netProfit >= 0;
  const roi          = totalExpenses > 0
    ? parseFloat(((netProfit / totalExpenses) * 100).toFixed(1))
    : 0;

  // ── Per bird calculations ──
  const costPerBird   = batch.quantity > 0
    ? parseFloat((totalExpenses / batch.quantity).toFixed(2))
    : 0;
  const profitPerBird = batch.quantity > 0
    ? parseFloat((netProfit / batch.quantity).toFixed(2))
    : 0;
  const revenuePerBird = batch.quantity > 0
    ? parseFloat((totalRevenue / batch.quantity).toFixed(2))
    : 0;

  // ── Break-even ──
  const breakEvenPricePerBird = totalUnitsSold > 0
    ? parseFloat((totalExpenses / totalUnitsSold).toFixed(2))
    : parseFloat((totalExpenses / batch.quantity).toFixed(2));

  // ── Status message ──
  let statusMessage;
  if (totalRevenue === 0) {
    statusMessage = 'No sales recorded yet. Keep tracking expenses.';
  } else if (isProfit) {
    statusMessage = `You are making a profit of ₦${netProfit.toLocaleString()} on this batch. ROI is ${roi}%.`;
  } else {
    statusMessage = `You are currently at a loss of ₦${Math.abs(netProfit).toLocaleString()}. You need ₦${Math.abs(netProfit).toLocaleString()} more in sales to break even.`;
  }

  res.json({
    success: true,
    pnl: {
      // Batch info
      batchName:   batch.name,
      breed:       batch.breed,
      quantity:    batch.quantity,
      daysAlive:   batch.daysAlive,

      // Expenses
      totalExpenses,
      byCategory,

      // Revenue
      totalRevenue,
      totalUnitsSold,

      // Profit
      netProfit,
      isProfit,
      roi,

      // Per bird
      costPerBird,
      revenuePerBird,
      profitPerBird,

      // Break-even
      breakEvenPricePerBird,

      // Summary
      statusMessage,
    },
  });
});

// ════════════════════════════════════════
// FINANCE OVERVIEW — all batches summary
// ════════════════════════════════════════

exports.getFinanceOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [allExpenses, allSales, allBatches] = await Promise.all([
    Expense.find({ userId }),
    Sale.find({ userId }),
    Batch.find({ userId }),
  ]);

  const totalExpenses  = allExpenses.reduce((sum, e) => sum + e.amount,      0);
  const totalRevenue   = allSales.reduce((sum, s)    => sum + s.totalAmount,  0);
  const netProfit      = totalRevenue - totalExpenses;

  // This month
  const now            = new Date();
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthExpenses = allExpenses
    .filter(e => new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  const thisMonthRevenue = allSales
    .filter(s => new Date(s.date) >= monthStart)
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const thisMonthProfit = thisMonthRevenue - thisMonthExpenses;

  // Best batch by profit
  const batchProfits = await Promise.all(
    allBatches.map(async (batch) => {
      const batchExpenses = allExpenses.filter(e => e.batchId.toString() === batch._id.toString());
      const batchSales    = allSales.filter(s => s.batchId.toString() === batch._id.toString());
      const profit        = batchSales.reduce((sum, s) => sum + s.totalAmount, 0)
                          - batchExpenses.reduce((sum, e) => sum + e.amount, 0);
      return { batchId: batch._id, batchName: batch.name, profit };
    })
  );

  const bestBatch = batchProfits.sort((a, b) => b.profit - a.profit)[0] || null;

  res.json({
    success: true,
    overview: {
      allTime: {
        totalExpenses,
        totalRevenue,
        netProfit,
        isProfit: netProfit >= 0,
      },
      thisMonth: {
        expenses: thisMonthExpenses,
        revenue:  thisMonthRevenue,
        profit:   thisMonthProfit,
        isProfit: thisMonthProfit >= 0,
      },
      bestBatch,
      totalBatches:  allBatches.length,
      activeBatches: allBatches.filter(b => b.status === 'active').length,
    },
  });
});