const Vaccination  = require('../models/Vaccination');
const Medication   = require('../models/Medication');
const Batch        = require('../models/Batch');
const asyncHandler = require('../utils/asyncHandler');
const { getLivestock } = require('../config/livestock');

// ─── GET VACCINATION SCHEDULE ────────────────
exports.getVaccinations = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const vaccinations = await Vaccination.find({ batchId: batch._id }).sort({ scheduledDate: 1 });

  const today = new Date();

  // Tag each vaccine with its status
  const tagged = vaccinations.map(v => {
    let status;
    if (v.isDone) {
      status = 'done';
    } else if (new Date(v.scheduledDate) < today) {
      status = 'overdue';
    } else {
      const daysUntil = Math.ceil((new Date(v.scheduledDate) - today) / (1000 * 60 * 60 * 24));
      status = daysUntil <= 2 ? 'due_soon' : 'upcoming';
    }
    return { ...v.toJSON(), status };
  });

  // Summary counts
  const summary = {
    total:    tagged.length,
    done:     tagged.filter(v => v.status === 'done').length,
    overdue:  tagged.filter(v => v.status === 'overdue').length,
    dueSoon:  tagged.filter(v => v.status === 'due_soon').length,
    upcoming: tagged.filter(v => v.status === 'upcoming').length,
  };

  // Overall health status
  let healthStatus = 'good';
  if (summary.overdue > 0)  healthStatus = 'critical';
  else if (summary.dueSoon > 0) healthStatus = 'warning';

  res.json({ success: true, summary, healthStatus, vaccinations: tagged });
});

// ─── MARK VACCINATION DONE ───────────────────
exports.markVaccinationDone = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const vaccination = await Vaccination.findOneAndUpdate(
    { _id: req.params.vid, userId: req.user._id },
    { isDone: true, doneDate: new Date(), notes },
    { new: true }
  );

  if (!vaccination) {
    return res.status(404).json({ success: false, message: 'Vaccination not found' });
  }

  res.json({ success: true, vaccination });
});

// ─── LOG MEDICATION ──────────────────────────
exports.logMedication = asyncHandler(async (req, res) => {
  const { drugName, date, dosage, reason, durationDays, cost, notes } = req.body;

  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  if (!drugName) {
    return res.status(400).json({ success: false, message: 'Drug name is required' });
  }

  const medication = await Medication.create({
    batchId: batch._id,
    userId:  req.user._id,
    drugName,
    date:         date || new Date(),
    dosage,
    reason,
    durationDays: durationDays || 1,
    cost:         cost || 0,
    notes,
  });

  res.status(201).json({ success: true, medication });
});

// ─── GET MEDICATION LOG ──────────────────────
exports.getMedications = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const medications = await Medication.find({ batchId: batch._id }).sort({ date: -1 });

  const totalMedCost = medications.reduce((sum, m) => sum + m.cost, 0);

  res.json({ success: true, count: medications.length, totalMedCost, medications });
});

// ─── SYMPTOM CHECKER ─────────────────────────
exports.checkSymptoms = asyncHandler(async (req, res) => {
  const { symptoms, livestockType } = req.query;

  if (!symptoms) {
    return res.status(400).json({ success: false, message: 'Symptoms are required' });
  }

  const config   = getLivestock(livestockType || 'chicken');
  const diseases = config.diseases;

  if (!diseases) {
    return res.status(404).json({ success: false, message: 'No disease data available' });
  }

  // Parse symptoms from comma-separated string
  const userSymptoms = symptoms
    .toLowerCase()
    .split(',')
    .map(s => s.trim());

  // Score each disease by how many symptoms match
  const scored = diseases.map(disease => {
    const matched = userSymptoms.filter(s =>
      disease.symptoms.some(ds => ds.toLowerCase().includes(s) || s.includes(ds.toLowerCase()))
    );

    return {
      ...disease,
      matchedSymptoms: matched,
      matchCount:      matched.length,
      matchPercent:    Math.round((matched.length / userSymptoms.length) * 100),
    };
  });

  // Sort by match count — highest first
  const results = scored
    .filter(d => d.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 3); // return top 3 matches

  if (results.length === 0) {
    return res.json({
      success: true,
      message: 'No matching disease found. Monitor the birds closely and consult a vet if symptoms worsen.',
      results: [],
    });
  }

  res.json({
    success:  true,
    topMatch: results[0],
    results,
    advice:   results[0].callVet
      ? '⚠️ This condition requires immediate veterinary attention. Call a vet today.'
      : 'Monitor closely. Follow the treatment steps above. Call a vet if no improvement in 48 hours.',
  });
});

// ─── GET HEALTH OVERVIEW ─────────────────────
exports.getHealthOverview = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found' });
  }

  const today = new Date();

  const vaccinations = await Vaccination.find({ batchId: batch._id });
  const medications  = await Medication.find({ batchId: batch._id });

  const overdueVaccines = vaccinations.filter(
    v => !v.isDone && new Date(v.scheduledDate) < today
  );
  const dueSoonVaccines = vaccinations.filter(v => {
    if (v.isDone) return false;
    const daysUntil = Math.ceil((new Date(v.scheduledDate) - today) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 2;
  });

  const mortalityRate = batch.quantity > 0
    ? parseFloat(((batch.totalDeaths / batch.quantity) * 100).toFixed(2))
    : 0;

  let overallStatus = 'good';
  if (mortalityRate > 5 || overdueVaccines.length > 0) overallStatus = 'critical';
  else if (mortalityRate > 3 || dueSoonVaccines.length > 0) overallStatus = 'warning';

  res.json({
    success: true,
    overview: {
      overallStatus,
      mortalityRate,
      totalDeaths:       batch.totalDeaths,
      overdueVaccines:   overdueVaccines.length,
      dueSoonVaccines:   dueSoonVaccines.length,
      totalVaccinations: vaccinations.length,
      doneVaccinations:  vaccinations.filter(v => v.isDone).length,
      totalMedications:  medications.length,
      alerts: [
        ...(overdueVaccines.map(v => ({
          type:    'OVERDUE_VACCINE',
          message: `${v.vaccineName} was due on ${new Date(v.scheduledDate).toDateString()}. Administer immediately.`,
        }))),
        ...(dueSoonVaccines.map(v => ({
          type:    'VACCINE_DUE_SOON',
          message: `${v.vaccineName} is due on ${new Date(v.scheduledDate).toDateString()}.`,
        }))),
        ...(mortalityRate > 3 ? [{
          type:    'HIGH_MORTALITY',
          message: `Mortality rate is ${mortalityRate}%. Investigate cause immediately.`,
        }] : []),
      ],
    },
  });
});