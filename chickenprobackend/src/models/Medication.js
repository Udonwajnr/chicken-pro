const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  drugName: {
    type: String,
    required: [true, 'Drug name is required'],
    trim: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  dosage: {
    type: String,
    trim: true,
  },
  reason: {
    type: String,
    trim: true,
  },
  durationDays: {
    type: Number,
    default: 1,
  },
  cost: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Medication', MedicationSchema);