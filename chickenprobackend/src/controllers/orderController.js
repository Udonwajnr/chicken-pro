const Order        = require('../models/Order');
const Product      = require('../models/Product');
const Store        = require('../models/Store');
const asyncHandler = require('../utils/asyncHandler');
const https        = require('https');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// ── Helper — Paystack initialize ──────────────
async function initializePaystack(email, amountKobo, reference) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, amount: amountKobo, reference });
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Helper — Paystack verify ──────────────────
async function verifyPaystack(reference) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── CREATE ORDER + Initialize Payment ────────
exports.createOrder = asyncHandler(async (req, res) => {
  const { productId, quantity, deliveryType, deliveryAddress } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ success: false, message: 'Product and quantity are required' });
  }

  const product = await Product.findById(productId);
  if (!product || product.status !== 'active') {
    return res.status(404).json({ success: false, message: 'Product not found or unavailable' });
  }

  if (product.quantity < quantity) {
    return res.status(400).json({ success: false, message: `Only ${product.quantity} units available` });
  }

  if (product.userId.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot buy your own product' });
  }

  const totalAmount = product.price * quantity;
  const platformFee = parseFloat((totalAmount * 0.05).toFixed(2));
  const sellerPayout = parseFloat((totalAmount - platformFee).toFixed(2));

  // Unique Paystack reference
  const paymentRef = `CPO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const order = await Order.create({
    buyerId:   req.user._id,
    sellerId:  product.userId,
    storeId:   product.storeId,
    productId: product._id,
    productName: product.name,
    quantity,
    unitPrice:   product.price,
    totalAmount,
    platformFee,
    sellerPayout,
    paymentRef,
    deliveryType:    deliveryType    || 'delivery',
    deliveryAddress: deliveryAddress || '',
    statusHistory: [{ status: 'pending', note: 'Order created' }],
  });

  // Initialize Paystack payment
  let paystackData = null;
  try {
    const paystackRes = await initializePaystack(
      req.user.email,
      totalAmount * 100, // convert to kobo
      paymentRef
    );
    if (paystackRes.status) {
      paystackData = paystackRes.data;
    }
  } catch (err) {
    console.error('Paystack init error:', err.message);
  }

  res.status(201).json({
    success: true,
    order,
    payment: paystackData, // { authorization_url, access_code, reference }
  });
});

// ─── VERIFY PAYMENT (Paystack Webhook/Callback) ─
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Payment reference is required' });
  }

  const order = await Order.findOne({ paymentRef: reference });
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.status !== 'pending') {
    return res.json({ success: true, message: 'Payment already processed', order });
  }

  // Verify with Paystack
  const paystackRes = await verifyPaystack(reference);

  if (paystackRes.status && paystackRes.data.status === 'success') {
    order.status = 'paid';
    order.statusHistory.push({ status: 'paid', note: 'Payment confirmed by Paystack' });
    await order.save();

    // Reduce product stock
    await Product.findByIdAndUpdate(order.productId, {
      $inc: { quantity: -order.quantity, totalSold: order.quantity },
    });

    res.json({ success: true, message: 'Payment verified. Order is now in escrow.', order });
  } else {
    res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
});

// ─── GET MY ORDERS ────────────────────────────
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { role } = req.query; // 'buyer' or 'seller'

  const filter = role === 'seller'
    ? { sellerId: req.user._id }
    : { buyerId:  req.user._id };

  const orders = await Order.find(filter)
    .populate('productId', 'name photos category')
    .populate('buyerId',   'name phone')
    .populate('sellerId',  'name phone')
    .populate('storeId',   'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: orders.length, orders });
});

// ─── GET SINGLE ORDER ─────────────────────────
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('productId', 'name photos category price unit')
    .populate('buyerId',   'name phone email')
    .populate('sellerId',  'name phone email')
    .populate('storeId',   'name location');

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Only buyer or seller can view
  const isInvolved =
    order.buyerId._id.toString()  === req.user._id.toString() ||
    order.sellerId._id.toString() === req.user._id.toString();

  if (!isInvolved) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  res.json({ success: true, order });
});

// ─── UPDATE ORDER STATUS ──────────────────────
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const buyerId  = order.buyerId.toString();
  const sellerId = order.sellerId.toString();
  const userId   = req.user._id.toString();

  // Status flow validation
  const sellerActions = ['confirmed', 'dispatched', 'cancelled'];
  const buyerActions  = ['delivered', 'disputed'];

  if (sellerActions.includes(status) && userId !== sellerId) {
    return res.status(403).json({ success: false, message: 'Only the seller can perform this action' });
  }
  if (buyerActions.includes(status) && userId !== buyerId) {
    return res.status(403).json({ success: false, message: 'Only the buyer can perform this action' });
  }

  order.status = status;
  order.statusHistory.push({ status, note: note || '' });

  // Release escrow when buyer confirms delivery
  if (status === 'delivered') {
    order.escrowReleased   = true;
    order.escrowReleasedAt = new Date();

    // Update store total sales
    await Store.findByIdAndUpdate(order.storeId, {
      $inc: { totalSales: 1 },
    });
  }

  // Restore stock if cancelled before delivery
  if (status === 'cancelled' && order.status !== 'delivered') {
    await Product.findByIdAndUpdate(order.productId, {
      $inc: { quantity: order.quantity, totalSold: -order.quantity },
    });
  }

  await order.save();
  res.json({ success: true, order });
});

// ─── RAISE DISPUTE ────────────────────────────
exports.raiseDispute = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Only the buyer can raise a dispute' });
  }

  if (order.status !== 'delivered') {
    return res.status(400).json({ success: false, message: 'Can only dispute after delivery is confirmed' });
  }

  order.status        = 'disputed';
  order.disputeReason = reason;
  order.statusHistory.push({ status: 'disputed', note: reason });
  await order.save();

  res.json({ success: true, message: 'Dispute raised. Our team will review within 48 hours.', order });
});