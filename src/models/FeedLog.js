const mongoose = require('mongoose');

const FeedLogSchema = new mongoose.Schema({
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
  phase: {
    type: String, // Starter / Grower / Finisher
  },
  feedType: {
    type: String, // Chick Mash / Growers Mash etc
  },
  brandUsed: {
    type: String,
    trim: true,
  },
  quantityKg: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0,
  },
  costPerKg: {
    type: Number,
    default: 0,
  },
  totalCost: {
    type: Number,
    default: 0,
  },
  stockRemainingKg: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Auto-calculate totalCost before saving
FeedLogSchema.pre('save', async function () {
  if (this.quantityKg && this.costPerKg) {
    this.totalCost = parseFloat((this.quantityKg * this.costPerKg).toFixed(2));
  }
});

module.exports = mongoose.model('FeedLog', FeedLogSchema);