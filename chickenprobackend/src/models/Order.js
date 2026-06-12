const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String, // snapshot at time of order
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  platformFee: {
    type: Number,
    default: 0,
  },
  sellerPayout: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: [
      'pending',      // order placed, awaiting payment
      'paid',         // payment confirmed, in escrow
      'confirmed',    // seller accepted
      'dispatched',   // seller marked as sent
      'delivered',    // buyer confirmed receipt
      'cancelled',    // cancelled before delivery
      'refunded',     // money returned to buyer
      'disputed',     // buyer raised a dispute
    ],
    default: 'pending',
  },
  paymentRef: {
    type: String,
    default: null, // Paystack reference
  },
  escrowReleased: {
    type: Boolean,
    default: false,
  },
  escrowReleasedAt: {
    type: Date,
    default: null,
  },
  deliveryType: {
    type: String,
    enum: ['pickup', 'delivery'],
    default: 'delivery',
  },
  deliveryAddress: {
    type: String,
    trim: true,
  },
  disputeReason: {
    type: String,
    default: null,
  },
  statusHistory: [
    {
      status:    { type: String },
      timestamp: { type: Date, default: Date.now },
      note:      { type: String },
    },
  ],
}, { timestamps: true });

// Auto-calculate fees before saving
OrderSchema.pre('save', async function () {
  if (this.isModified('totalAmount')) {
    this.platformFee  = parseFloat((this.totalAmount * 0.05).toFixed(2)); // 5% commission
    this.sellerPayout = parseFloat((this.totalAmount - this.platformFee).toFixed(2));
  }
});

module.exports = mongoose.model('Order', OrderSchema);