const mongoose = require('mongoose');

const EggLogSchema = new mongoose.Schema({
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
  totalEggs: {
    type: Number,
    required: [true, 'Total eggs is required'],
    min: 0,
  },
  brokenEggs: {
    type: Number,
    default: 0,
    min: 0,
  },
  soldEggs: {
    type: Number,
    default: 0,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Virtual — good eggs (total minus broken)
EggLogSchema.virtual('goodEggs').get(function () {
  return this.totalEggs - this.brokenEggs;
});

EggLogSchema.set('toJSON',   { virtuals: true });
EggLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EggLog', EggLogSchema);