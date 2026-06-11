const mongoose = require('mongoose');

const WeightLogSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  avgWeightKg: {
    type: Number,
    required: [true, 'Average weight is required'],
    min: 0,
  },
  sampleSize: {
    type: Number,
    default: 10, // how many birds were weighed
    min: 1,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('WeightLog', WeightLogSchema);