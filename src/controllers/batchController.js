const Batch         = require('../models/Batch');
const DailyUpdate   = require('../models/DailyUpdate');
const Farm          = require('../models/Farm');
const asyncHandler  = require('../utils/asyncHandler');
const { getLivestock } = require('../config/livestock');

// ─── CREATE BATCH ────────────────────────────
exports.createBatch = asyncHandler(async (req, res) => {
  const { name, breed, quantity, startDate, notes, livestockType } = req.body;

  if (!name || !breed || !quantity || !startDate) {
    return res.status(400).json({
      success: false,
      message: 'Name, breed, quantity and startDate are required',
    });
  }

  // Get user's farm
  const farm = await Farm.findOne({ userId: req.user._id });
  if (!farm) {
    return res.status(404).json({
      success: false,
      message: 'Farm not found. Please complete farm setup first.',
    });
  }

  const batch = await Batch.create({
    farmId: farm._id,
    userId: req.user._id,
    name,
    breed,
    quantity,
    startDate,
    notes,
    livestockType: livestockType || 'chicken',
  });

  // Auto-generate vaccination schedule
  await generateVaccinationSchedule(batch);

  res.status(201).json({ success: true, batch });
});

// ─── GET ALL BATCHES ─────────────────────────
exports.getBatches = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = { userId: req.user._id };
  if (status) filter.status = status;

  const batches = await Batch.find(filter).sort({ createdAt: -1 });

  // Add summary stats to each batch
  const batchesWithStats = batches.map(b => ({
    ...b.toJSON(),
    mortalityRate: b.mortalityRate,
    daysAlive:     b.daysAlive,
    currentWeek:   b.currentWeek,
  }));

  res.json({ success: true, count: batches.length, batches: batchesWithStats });
});

// ─── GET SINGLE BATCH ────────────────────────
exports.getBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  res.json({
    success: true,
    batch: {
      ...batch.toJSON(),
      mortalityRate: batch.mortalityRate,
      daysAlive:     batch.daysAlive,
      currentWeek:   batch.currentWeek,
    },
  });
});

// ─── UPDATE BATCH ────────────────────────────
exports.updateBatch = asyncHandler(async (req, res) => {
  const { name, status, notes, targetDate } = req.body;

  const batch = await Batch.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { name, status, notes, targetDate },
    { new: true, runValidators: true }
  );

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  res.json({ success: true, batch });
});

// ─── DELETE BATCH ────────────────────────────
exports.deleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOneAndDelete({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  // Also delete all daily updates for this batch
  await DailyUpdate.deleteMany({ batchId: batch._id });

  res.json({ success: true, message: 'Batch deleted successfully' });
});

// ─── LOG DAILY UPDATE ────────────────────────
exports.logDailyUpdate = asyncHandler(async (req, res) => {
  const { aliveCount, deaths, feedConsumedKg, notes, date } = req.body;

  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  if (aliveCount === undefined) {
    return res.status(400).json({ success: false, message: 'Alive count is required' });
  }

  // Save the daily update
  const update = await DailyUpdate.create({
    batchId:       batch._id,
    userId:        req.user._id,
    date:          date || new Date(),
    aliveCount,
    deaths:        deaths || 0,
    feedConsumedKg: feedConsumedKg || 0,
    notes,
  });

  // Update batch currentAlive and totalDeaths
  batch.currentAlive = aliveCount;
  batch.totalDeaths  = batch.quantity - aliveCount;
  await batch.save();

  // Mortality alert — if mortality rate > 3% flag it
  const mortalityRate = (batch.totalDeaths / batch.quantity) * 100;
  const alert = mortalityRate > 3
    ? { type: 'HIGH_MORTALITY', message: `Warning: Mortality rate is ${mortalityRate.toFixed(1)}%. Investigate immediately.` }
    : null;

  res.status(201).json({ success: true, update, alert });
});

// ─── GET DAILY UPDATES ───────────────────────
exports.getDailyUpdates = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const updates = await DailyUpdate.find({ batchId: batch._id }).sort({ date: -1 });

  res.json({ success: true, count: updates.length, updates });
});

// ─── HELPER — AUTO GENERATE VACCINATIONS ─────
const Vaccination = require('../models/Vaccination');

async function generateVaccinationSchedule(batch) {
  try {
    const config   = getLivestock(batch.livestockType);
    const schedule = config.vaccinationSchedule[batch.breed];
    if (!schedule) return;

    const vaccinations = schedule.map(v => ({
      batchId:       batch._id,
      userId:        batch.userId,
      vaccineName:   v.name,
      method:        v.method,
      scheduledDate: new Date(
        new Date(batch.startDate).getTime() + v.dayOffset * 24 * 60 * 60 * 1000
      ),
    }));

    await Vaccination.insertMany(vaccinations);
  } catch (err) {
    console.error('Failed to generate vaccination schedule:', err.message);
  }
}