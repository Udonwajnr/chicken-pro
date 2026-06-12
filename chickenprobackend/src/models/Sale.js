const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
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
  buyerName: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 1,
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Price per unit is required'],
    min: 0,
  },
  totalAmount: {
    type: Number,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Auto-calculate totalAmount before saving
SaleSchema.pre('save', async function () {
  if (this.quantity && this.pricePerUnit) {
    this.totalAmount = parseFloat((this.quantity * this.pricePerUnit).toFixed(2));
  }
});

module.exports = mongoose.model('Sale', SaleSchema);