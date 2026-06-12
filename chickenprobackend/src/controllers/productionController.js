const EggLog    = require('../models/EggLog');
const WeightLog = require('../models/WeightLog');
const Batch     = require('../models/Batch');
const asyncHandler = require('../utils/asyncHandler');
const { getLivestock } = require('../config/livestock');

// ─── HELPER — verify batch belongs to user ───
async function getBatch(batchId, userId) {
  return await Batch.findOne({ _id: batchId, userId });
}

// ════════════════════════════════════════
// EGG LOGS — for layer batches
// ════════════════════════════════════════

// ─── LOG EGGS ────────────────────────────────
exports.logEggs = async (req, res) => {
  try {
    const batch = await getBatch(req.params.id, req.user._id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batch.breed !== 'layer') {
      return res.status(400).json({
        success: false,
        message: 'Egg logging is only available for layer batches',
      });
    }

    const { totalEggs, brokenEggs, soldEggs, notes, date } = req.body;

    if (totalEggs === undefined) {
      return res.status(400).json({ success: false, message: 'Total eggs is required' });
    }

    const eggLog = await EggLog.create({
      batchId:    batch._id,
      userId:     req.user._id,
      date:       date || new Date(),
      totalEggs,
      brokenEggs: brokenEggs || 0,
      soldEggs:   soldEggs   || 0,
      notes,
    });

    // Production rate — eggs collected vs birds alive
    const productionRate = batch.currentAlive > 0
      ? parseFloat(((totalEggs / batch.currentAlive) * 100).toFixed(1))
      : 0;

    // Alert if production rate drops below 60%
    const alert = productionRate < 60 && productionRate > 0
      ? {
          type:    'LOW_PRODUCTION',
          message: `Production rate is ${productionRate}%. Healthy layers should produce 75–85%. Check feed, lighting and health.`,
        }
      : null;

    res.status(201).json({ success: true, eggLog: { ...eggLog.toJSON(), productionRate }, alert });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET EGG HISTORY ─────────────────────────
exports.getEggHistory = async (req, res) => {
  try {
    const batch = await getBatch(req.params.id, req.user._id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const eggLogs = await EggLog.find({ batchId: batch._id }).sort({ date: -1 });

    // Add production rate to each log
    const logsWithRate = eggLogs.map(log => ({
      ...log.toJSON(),
      productionRate: batch.currentAlive > 0
        ? parseFloat(((log.totalEggs / batch.currentAlive) * 100).toFixed(1))
        : 0,
    }));

    // Cumulative totals
    const totals = {
      totalEggs:  eggLogs.reduce((sum, l) => sum + l.totalEggs,  0),
      brokenEggs: eggLogs.reduce((sum, l) => sum + l.brokenEggs, 0),
      soldEggs:   eggLogs.reduce((sum, l) => sum + l.soldEggs,   0),
      goodEggs:   eggLogs.reduce((sum, l) => sum + (l.totalEggs - l.brokenEggs), 0),
      totalCrates: parseFloat((eggLogs.reduce((sum, l) => sum + l.totalEggs, 0) / 30).toFixed(1)),
    };

    // Last 7 days trend
    const last7Days = logsWithRate.slice(0, 7);
    const avgProductionRate = last7Days.length > 0
      ? parseFloat((last7Days.reduce((sum, l) => sum + l.productionRate, 0) / last7Days.length).toFixed(1))
      : 0;

    res.json({
      success: true,
      count:   eggLogs.length,
      totals,
      avgProductionRateLast7Days: avgProductionRate,
      productionStatus: avgProductionRate >= 75 ? 'good' : avgProductionRate >= 60 ? 'average' : 'poor',
      eggLogs: logsWithRate,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════
// WEIGHT LOGS — for broiler/cockerel batches
// ════════════════════════════════════════

// ─── LOG WEIGHT ──────────────────────────────
exports.logWeight = async (req, res) => {
  try {
    const batch = await getBatch(req.params.id, req.user._id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batch.breed === 'layer') {
      return res.status(400).json({
        success: false,
        message: 'Weight logging is for broiler and cockerel batches. Use egg logging for layers.',
      });
    }

    const { avgWeightKg, sampleSize, notes, date } = req.body;

    if (!avgWeightKg) {
      return res.status(400).json({ success: false, message: 'Average weight is required' });
    }

    const weightLog = await WeightLog.create({
      batchId:    batch._id,
      userId:     req.user._id,
      date:       date || new Date(),
      avgWeightKg,
      sampleSize: sampleSize || 10,
      notes,
    });

    // Check slaughter readiness
    const config           = getLivestock(batch.livestockType || 'chicken');
    const targetWeight     = config.slaughterWeightKg[batch.breed];
    const isReady          = avgWeightKg >= targetWeight;
    const percentOfTarget  = parseFloat(((avgWeightKg / targetWeight) * 100).toFixed(1));

    const readinessStatus = {
      isReady,
      targetWeightKg:   targetWeight,
      currentWeightKg:  avgWeightKg,
      percentOfTarget,
      message: isReady
        ? `✅ Birds are ready for slaughter. Current weight ${avgWeightKg}kg has reached the ${targetWeight}kg target.`
        : `Birds are at ${percentOfTarget}% of target weight. Target is ${targetWeight}kg. Keep feeding.`,
    };

    res.status(201).json({ success: true, weightLog, readinessStatus });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET WEIGHT HISTORY ──────────────────────
exports.getWeightHistory = async (req, res) => {
  try {
    const batch = await getBatch(req.params.id, req.user._id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const weightLogs = await WeightLog.find({ batchId: batch._id }).sort({ date: 1 });

    const config       = getLivestock(batch.livestockType || 'chicken');
    const targetWeight = config.slaughterWeightKg[batch.breed] || null;

    // Latest weight
    const latestLog    = weightLogs[weightLogs.length - 1];
    const latestWeight = latestLog ? latestLog.avgWeightKg : 0;

    // Growth rate — kg gained per week
    let weeklyGrowthRate = null;
    if (weightLogs.length >= 2) {
      const first      = weightLogs[0];
      const last       = weightLogs[weightLogs.length - 1];
      const daysBetween = Math.ceil(
        (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24)
      );
      const weeksBetween = daysBetween / 7;
      const weightGained = last.avgWeightKg - first.avgWeightKg;
      weeklyGrowthRate   = weeksBetween > 0
        ? parseFloat((weightGained / weeksBetween).toFixed(3))
        : null;
    }

    // Projected days to reach target
    let projectedDaysToTarget = null;
    if (weeklyGrowthRate && targetWeight && latestWeight < targetWeight) {
      const weightRemaining    = targetWeight - latestWeight;
      const weeksToTarget      = weightRemaining / weeklyGrowthRate;
      projectedDaysToTarget    = Math.ceil(weeksToTarget * 7);
    }

    const isReady = targetWeight ? latestWeight >= targetWeight : false;

    res.json({
      success: true,
      count:   weightLogs.length,
      summary: {
        latestWeightKg:       latestWeight,
        targetWeightKg:       targetWeight,
        isReadyForSlaughter:  isReady,
        weeklyGrowthRateKg:   weeklyGrowthRate,
        projectedDaysToTarget,
        readinessMessage: isReady
          ? '✅ Ready for slaughter'
          : projectedDaysToTarget
            ? `Approx. ${projectedDaysToTarget} more days to reach target weight`
            : 'Log more weight entries to see projection',
      },
      weightLogs,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════
// PRODUCTION OVERVIEW — works for all breeds
// ════════════════════════════════════════

exports.getProductionOverview = async (req, res) => {
  try {
    const batch = await getBatch(req.params.id, req.user._id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const config          = getLivestock(batch.livestockType || 'chicken');
    const trackingType    = config.productionTracking[batch.breed];

    if (trackingType === 'eggs') {
      // Layer overview
      const eggLogs = await EggLog.find({ batchId: batch._id }).sort({ date: -1 });

      const totalEggs     = eggLogs.reduce((sum, l) => sum + l.totalEggs,  0);
      const totalBroken   = eggLogs.reduce((sum, l) => sum + l.brokenEggs, 0);
      const totalSold     = eggLogs.reduce((sum, l) => sum + l.soldEggs,   0);
      const todayLog      = eggLogs[0];
      const todayRate     = todayLog && batch.currentAlive > 0
        ? parseFloat(((todayLog.totalEggs / batch.currentAlive) * 100).toFixed(1))
        : null;

      return res.json({
        success: true,
        trackingType: 'eggs',
        overview: {
          totalEggs,
          totalBroken,
          totalSold,
          goodEggs:      totalEggs - totalBroken,
          totalCrates:   parseFloat((totalEggs / 30).toFixed(1)),
          todayEggs:     todayLog ? todayLog.totalEggs : null,
          todayRate,
          productionStatus: todayRate
            ? todayRate >= 75 ? 'good' : todayRate >= 60 ? 'average' : 'poor'
            : 'no_data',
          totalLogs: eggLogs.length,
        },
      });

    } else {
      // Broiler / Cockerel overview
      const weightLogs   = await WeightLog.find({ batchId: batch._id }).sort({ date: -1 });
      const targetWeight = config.slaughterWeightKg[batch.breed];
      const latestLog    = weightLogs[0];
      const latestWeight = latestLog ? latestLog.avgWeightKg : null;
      const isReady      = latestWeight ? latestWeight >= targetWeight : false;

      return res.json({
        success: true,
        trackingType: 'weight',
        overview: {
          latestWeightKg:      latestWeight,
          targetWeightKg:      targetWeight,
          isReadyForSlaughter: isReady,
          percentOfTarget:     latestWeight
            ? parseFloat(((latestWeight / targetWeight) * 100).toFixed(1))
            : null,
          totalLogs: weightLogs.length,
          readinessMessage: isReady
            ? '✅ Birds are ready for slaughter'
            : latestWeight
              ? `At ${parseFloat(((latestWeight / targetWeight) * 100).toFixed(1))}% of target weight`
              : 'No weight logs yet. Log first weight entry.',
        },
      });
    }

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};