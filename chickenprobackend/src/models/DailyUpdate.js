const mongoose = require('mongoose');

const DailyUpdateSchema = new mongoose.Schema({
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
  aliveCount: {
    type: Number,
    required: [true, 'Alive count is required'],
  },
  deaths: {
    type: Number,
    default: 0,
    min: 0,
  },
  feedConsumedKg: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('DailyUpdate', DailyUpdateSchema);