const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
  },
  livestockType: {
    type: String,
    enum: ['chicken', 'pig', 'fish', 'goat', 'cattle'],
    default: 'chicken',
  },
  breed: {
    type: String,
    enum: ['broiler', 'layer', 'cockerel'],
    required: [true, 'Breed is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 1,
  },
  currentAlive: {
    type: Number,
  },
  totalDeaths: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  targetDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'sold'],
    default: 'active',
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Auto-set currentAlive to quantity on create
// Auto-set targetDate based on breed cycle
BatchSchema.pre('save', async function () {
  if (this.isNew) {
    this.currentAlive = this.quantity;

    const cycleDays = {
      broiler:  42,  // 6 weeks
      layer:    504, // 72 weeks
      cockerel: 84,  // 12 weeks
    };

    if (!this.targetDate) {
      const target = new Date(this.startDate);
      target.setDate(target.getDate() + (cycleDays[this.breed] || 42));
      this.targetDate = target;
    }
  }
});

// Virtual — mortality rate %
BatchSchema.virtual('mortalityRate').get(function () {
  if (!this.quantity) return 0;
  return ((this.totalDeaths / this.quantity) * 100).toFixed(2);
});

// Virtual — days alive so far
BatchSchema.virtual('daysAlive').get(function () {
  const start = new Date(this.startDate);
  const now   = new Date();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
});

// Virtual — week number
BatchSchema.virtual('currentWeek').get(function () {
  return Math.ceil(this.daysAlive / 7) || 1;
});

BatchSchema.set('toJSON',   { virtuals: true });
BatchSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Batch', BatchSchema);