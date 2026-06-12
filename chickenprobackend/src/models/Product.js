const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    default: null, // optional link to a farm batch
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: [
      'day_old_chicks',
      'live_birds',
      'eggs',
      'feed',
      'medication',
      'equipment',
      'raw_materials',
    ],
    required: [true, 'Category is required'],
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0,
  },
  unit: {
    type: String,
    default: 'per unit', // per bird, per crate, per bag
  },
  photos: {
    type: [String],
    default: [],
  },
  deliveryOptions: {
    type: String,
    enum: ['pickup', 'local', 'nationwide'],
    default: 'local',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'sold_out'],
    default: 'active',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  totalSold: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Full text search index
ProductSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);