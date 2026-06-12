const Batch        = require('../models/Batch');
const DailyUpdate  = require('../models/DailyUpdate');
const Vaccination  = require('../models/Vaccination');
const Expense      = require('../models/Expense');
const Sale         = require('../models/Sale');
const EggLog       = require('../models/EggLog');
const WeightLog    = require('../models/WeightLog');
const Medication   = require('../models/Medication');
const asyncHandler = require('../utils/asyncHandler');

// ════════════════════════════════════════
// MAIN DASHBOARD OVERVIEW
// ════════════════════════════════════════
exports.getOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now    = new Date();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart  = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  // ── Fetch everything in parallel ──
  const [
    allBatches,
    allExpenses,
    allSales,
    upcomingVaccines,
  ] = await Promise.all([
    Batch.find({ userId }),
    Expense.find({ userId }),
    Sale.find({ userId }),
    Vaccination.find({
      userId,
      isDone: false,
      scheduledDate: {
        $gte: now,
        $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    }).populate('batchId', 'name breed').sort({ scheduledDate: 1 }).limit(5),
  ]);

  const activeBatches = allBatches.filter(b => b.status === 'active');

  // ── Bird counts ──
  const totalLiveBirds = activeBatches.reduce((sum, b) => sum + (b.currentAlive || 0), 0);
  const totalBirds     = activeBatches.reduce((sum, b) => sum + b.quantity, 0);
  const totalDeaths    = activeBatches.reduce((sum, b) => sum + b.totalDeaths, 0);

  // ── This month financials ──
  const monthExpenses = allExpenses
    .filter(e => new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthRevenue = allSales
    .filter(s => new Date(s.date) >= monthStart)
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const monthProfit = monthRevenue - monthExpenses;

  // ── All time financials ──
  const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRevenue  = allSales.reduce((sum, s)   => sum + s.totalAmount, 0);
  const netProfit     = totalRevenue - totalExpenses;

  // ── Mortality alerts ──
  const mortalityAlerts = activeBatches
    .filter(b => b.quantity > 0 && (b.totalDeaths / b.quantity) * 100 > 3)
    .map(b => ({
      batchId:       b._id,
      batchName:     b.name,
      mortalityRate: parseFloat(((b.totalDeaths / b.quantity) * 100).toFixed(1)),
      message:       `${b.name} has a ${parseFloat(((b.totalDeaths / b.quantity) * 100).toFixed(1))}% mortality rate. Investigate immediately.`,
    }));

  // ── Overdue vaccines ──
  const overdueVaccines = await Vaccination.find({
    userId,
    isDone:        false,
    scheduledDate: { $lt: now },
  }).populate('batchId', 'name').sort({ scheduledDate: 1 });

  // ── Active batch cards ──
  const batchCards = activeBatches.map(b => ({
    _id:           b._id,
    name:          b.name,
    breed:         b.breed,
    quantity:      b.quantity,
    currentAlive:  b.currentAlive,
    totalDeaths:   b.totalDeaths,
    mortalityRate: b.mortalityRate,
    daysAlive:     b.daysAlive,
    currentWeek:   b.currentWeek,
    status:        b.status,
    startDate:     b.startDate,
    targetDate:    b.targetDate,
  }));

  // ── Alerts array ──
  const alerts = [
    ...mortalityAlerts.map(a => ({ type: 'HIGH_MORTALITY', ...a })),
    ...overdueVaccines.map(v => ({
      type:      'OVERDUE_VACCINE',
      batchName: v.batchId?.name || 'Unknown batch',
      message:   `${v.vaccineName} was due on ${new Date(v.scheduledDate).toDateString()}. Administer immediately.`,
    })),
  ];

  res.json({
    success: true,
    dashboard: {
      // Summary cards
      summary: {
        activeBatches:    activeBatches.length,
        totalBatches:     allBatches.length,
        totalLiveBirds,
        totalBirds,
        totalDeaths,
      },

      // Financials
      finance: {
        thisMonth: {
          expenses: monthExpenses,
          revenue:  monthRevenue,
          profit:   monthProfit,
          isProfit: monthProfit >= 0,
        },
        allTime: {
          expenses: totalExpenses,
          revenue:  totalRevenue,
          profit:   netProfit,
          isProfit: netProfit >= 0,
        },
      },

      // Upcoming vaccines next 7 days
      upcomingVaccines: upcomingVaccines.map(v => ({
        _id:           v._id,
        vaccineName:   v.vaccineName,
        method:        v.method,
        scheduledDate: v.scheduledDate,
        batchName:     v.batchId?.name || 'Unknown',
        daysUntil:     Math.ceil((new Date(v.scheduledDate) - now) / (1000 * 60 * 60 * 24)),
      })),

      // Alerts
      alerts,
      alertCount: alerts.length,

      // Batch cards
      activeBatches: batchCards,
    },
  });
});

// ════════════════════════════════════════
// CHARTS DATA
// ════════════════════════════════════════

// ─── Monthly Revenue vs Expenses ─────────────
exports.getRevenueChart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const months = parseInt(req.query.months) || 6;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (months - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const [expenses, sales] = await Promise.all([
    Expense.find({ userId, date: { $gte: startDate } }),
    Sale.find({ userId, date: { $gte: startDate } }),
  ]);

  // Build month buckets
  const monthLabels = [];
  const data        = [];

  for (let i = months - 1; i >= 0; i--) {
    const d     = new Date();
    d.setMonth(d.getMonth() - i);
    const year  = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

    const monthExpenses = expenses
      .filter(e => {
        const ed = new Date(e.date);
        return ed.getFullYear() === year && ed.getMonth() === month;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const monthRevenue = sales
      .filter(s => {
        const sd = new Date(s.date);
        return sd.getFullYear() === year && sd.getMonth() === month;
      })
      .reduce((sum, s) => sum + s.totalAmount, 0);

    monthLabels.push(label);
    data.push({
      month:    label,
      expenses: monthExpenses,
      revenue:  monthRevenue,
      profit:   monthRevenue - monthExpenses,
    });
  }

  res.json({ success: true, chart: { labels: monthLabels, data } });
});

// ─── Batch Profit Comparison ──────────────────
exports.getBatchChart = asyncHandler(async (req, res) => {
  const userId   = req.user._id;
  const batches  = await Batch.find({ userId }).sort({ createdAt: -1 }).limit(10);

  const [allExpenses, allSales] = await Promise.all([
    Expense.find({ userId }),
    Sale.find({ userId }),
  ]);

  const batchData = batches.map(batch => {
    const batchExpenses = allExpenses
      .filter(e => e.batchId.toString() === batch._id.toString())
      .reduce((sum, e) => sum + e.amount, 0);

    const batchRevenue = allSales
      .filter(s => s.batchId.toString() === batch._id.toString())
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const profit = batchRevenue - batchExpenses;
    const roi    = batchExpenses > 0
      ? parseFloat(((profit / batchExpenses) * 100).toFixed(1))
      : 0;

    return {
      batchId:   batch._id,
      batchName: batch.name,
      breed:     batch.breed,
      status:    batch.status,
      expenses:  batchExpenses,
      revenue:   batchRevenue,
      profit,
      roi,
      isProfit:  profit >= 0,
    };
  });

  // Sort by profit descending
  batchData.sort((a, b) => b.profit - a.profit);

  res.json({ success: true, chart: { batches: batchData } });
});

// ─── Mortality Rate Chart ─────────────────────
exports.getMortalityChart = asyncHandler(async (req, res) => {
  const userId  = req.user._id;
  const batches = await Batch.find({ userId, status: 'active' });

  const mortalityData = await Promise.all(
    batches.map(async batch => {
      const updates = await DailyUpdate.find({ batchId: batch._id })
        .sort({ date: 1 })
        .limit(42); // max 6 weeks

      return {
        batchId:   batch._id,
        batchName: batch.name,
        breed:     batch.breed,
        data:      updates.map(u => ({
          date:          u.date,
          deaths:        u.deaths,
          mortalityRate: batch.quantity > 0
            ? parseFloat(((batch.quantity - u.aliveCount) / batch.quantity * 100).toFixed(2))
            : 0,
        })),
      };
    })
  );

  res.json({ success: true, chart: { batches: mortalityData } });
});

// ─── Egg Production Chart (layers only) ───────
exports.getEggChart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const days   = parseInt(req.query.days) || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const layerBatches = await Batch.find({ userId, breed: 'layer', status: 'active' });

  const chartData = await Promise.all(
    layerBatches.map(async batch => {
      const eggLogs = await EggLog.find({
        batchId: batch._id,
        date:    { $gte: startDate },
      }).sort({ date: 1 });

      return {
        batchId:   batch._id,
        batchName: batch.name,
        data:      eggLogs.map(log => ({
          date:           log.date,
          totalEggs:      log.totalEggs,
          productionRate: batch.currentAlive > 0
            ? parseFloat(((log.totalEggs / batch.currentAlive) * 100).toFixed(1))
            : 0,
        })),
      };
    })
  );

  res.json({ success: true, chart: { batches: chartData, days } });
});

// ─── Weight Growth Chart (broilers/cockerels) ─
exports.getWeightChart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const weightBatches = await Batch.find({
    userId,
    breed:  { $in: ['broiler', 'cockerel'] },
    status: 'active',
  });

  const chartData = await Promise.all(
    weightBatches.map(async batch => {
      const weightLogs = await WeightLog.find({ batchId: batch._id }).sort({ date: 1 });

      return {
        batchId:       batch._id,
        batchName:     batch.name,
        breed:         batch.breed,
        targetWeightKg: batch.breed === 'broiler' ? 1.8 : 2.5,
        data:          weightLogs.map(log => ({
          date:        log.date,
          avgWeightKg: log.avgWeightKg,
        })),
      };
    })
  );

  res.json({ success: true, chart: { batches: chartData } });
});

// ════════════════════════════════════════
// FARM PERFORMANCE REPORT
// ════════════════════════════════════════
exports.getFarmReport = asyncHandler(async (req, res) => {
  const userId  = req.user._id;

  const [allBatches, allExpenses, allSales] = await Promise.all([
    Batch.find({ userId }),
    Expense.find({ userId }),
    Sale.find({ userId }),
  ]);

  const completedBatches = allBatches.filter(b => b.status !== 'active');
  const activeBatches    = allBatches.filter(b => b.status === 'active');

  const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRevenue  = allSales.reduce((sum, s)   => sum + s.totalAmount, 0);
  const netProfit     = totalRevenue - totalExpenses;

  // Best batch
  const batchProfits = allBatches.map(batch => {
    const exp = allExpenses
      .filter(e => e.batchId.toString() === batch._id.toString())
      .reduce((sum, e) => sum + e.amount, 0);
    const rev = allSales
      .filter(s => s.batchId.toString() === batch._id.toString())
      .reduce((sum, s) => sum + s.totalAmount, 0);
    return {
      batchName: batch.name,
      breed:     batch.breed,
      profit:    rev - exp,
      roi:       exp > 0 ? parseFloat(((rev - exp) / exp * 100).toFixed(1)) : 0,
    };
  });

  const bestBatch  = [...batchProfits].sort((a, b) => b.profit - a.profit)[0]  || null;
  const worstBatch = [...batchProfits].sort((a, b) => a.profit - b.profit)[0] || null;

  const avgProfitPerBatch = allBatches.length > 0
    ? parseFloat((netProfit / allBatches.length).toFixed(2))
    : 0;

  res.json({
    success: true,
    report: {
      totalBatches:      allBatches.length,
      activeBatches:     activeBatches.length,
      completedBatches:  completedBatches.length,
      totalExpenses,
      totalRevenue,
      netProfit,
      isProfit:          netProfit >= 0,
      roi:               totalExpenses > 0
        ? parseFloat((netProfit / totalExpenses * 100).toFixed(1))
        : 0,
      avgProfitPerBatch,
      bestBatch,
      worstBatch,
    },
  });
});