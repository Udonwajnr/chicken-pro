const FeedLog              = require('../models/FeedLog');
const Batch                = require('../models/Batch');
const asyncHandler         = require('../utils/asyncHandler');
const { getFeedRecommendation } = require('../utils/feedCalculator');

// ─── GET FEED RECOMMENDATION ─────────────────
exports.getRecommendation = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const recommendation = getFeedRecommendation(batch);

  res.json({ success: true, recommendation });
});

// ─── LOG FEED ────────────────────────────────
exports.logFeed = asyncHandler(async (req, res) => {
  const { quantityKg, costPerKg, brandUsed, stockRemainingKg, notes, date } = req.body;

  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  if (!quantityKg) {
    return res.status(400).json({ success: false, message: 'Quantity is required' });
  }

  // Get current phase from recommendation
  const rec = getFeedRecommendation(batch);

  const feedLog = await FeedLog.create({
    batchId:          batch._id,
    userId:           req.user._id,
    date:             date || new Date(),
    phase:            rec.phase,
    feedType:         rec.feedType,
    brandUsed,
    quantityKg,
    costPerKg:        costPerKg || 0,
    stockRemainingKg: stockRemainingKg || 0,
    notes,
  });

  // Low stock alert
  const alert = stockRemainingKg && stockRemainingKg < 5
    ? { type: 'LOW_STOCK', message: `Only ${stockRemainingKg}kg of feed remaining. Buy more soon.` }
    : null;

  res.status(201).json({ success: true, feedLog, alert });
});

// ─── GET FEED HISTORY ────────────────────────
exports.getFeedHistory = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const feedLogs = await FeedLog.find({ batchId: batch._id }).sort({ date: -1 });

  res.json({ success: true, count: feedLogs.length, feedLogs });
});

// ─── GET FEED COST SUMMARY ───────────────────
exports.getFeedCost = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const feedLogs = await FeedLog.find({ batchId: batch._id });

  const totalKgConsumed = feedLogs.reduce((sum, log) => sum + log.quantityKg, 0);
  const totalCost       = feedLogs.reduce((sum, log) => sum + log.totalCost, 0);
  const costPerBird     = batch.quantity > 0
    ? parseFloat((totalCost / batch.quantity).toFixed(2))
    : 0;

  // Breakdown by phase
  const byPhase = feedLogs.reduce((acc, log) => {
    const phase = log.phase || 'Unknown';
    if (!acc[phase]) acc[phase] = { totalKg: 0, totalCost: 0 };
    acc[phase].totalKg   += log.quantityKg;
    acc[phase].totalCost += log.totalCost;
    return acc;
  }, {});

  res.json({
    success: true,
    summary: {
      totalKgConsumed: parseFloat(totalKgConsumed.toFixed(2)),
      totalCost:       parseFloat(totalCost.toFixed(2)),
      costPerBird,
      byPhase,
      logsCount: feedLogs.length,
    },
  });
});