const mongoose = require('mongoose');

const VaccinationSchema = new mongoose.Schema({
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
  vaccineName: {
    type: String,
    required: true,
  },
  method: {
    type: String,
  },
  scheduledDate: {
    type: Date,
    required: true,
  },
  doneDate: {
    type: Date,
    default: null,
  },
  isDone: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Vaccination', VaccinationSchema);