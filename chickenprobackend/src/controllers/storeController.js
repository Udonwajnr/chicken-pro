const Store        = require('../models/Store');
const Product      = require('../models/Product');
const Order        = require('../models/Order');
const Review       = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');

// ─── CREATE STORE ─────────────────────────────
exports.createStore = asyncHandler(async (req, res) => {
  const existing = await Store.findOne({ userId: req.user._id });
  if (existing) {
    return res.status(400).json({ success: false, message: 'You already have a store. Use PUT to update it.' });
  }

  const { name, description, location, phone } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Store name is required' });
  }

  const store = await Store.create({
    userId: req.user._id,
    name, description, location, phone,
  });

  res.status(201).json({ success: true, store });
});

// ─── GET MY STORE ─────────────────────────────
exports.getMyStore = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ userId: req.user._id });
  if (!store) {
    return res.status(404).json({ success: false, message: 'You do not have a store yet.' });
  }
  res.json({ success: true, store });
});

// ─── GET PUBLIC STORE ─────────────────────────
exports.getStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id).populate('userId', 'name');
  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found' });
  }

  const products = await Product.find({ storeId: store._id, status: 'active' });
  const reviews  = await Review.find({ storeId: store._id })
    .populate('reviewerId', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({ success: true, store, products, reviews });
});

// ─── UPDATE STORE ─────────────────────────────
exports.updateStore = asyncHandler(async (req, res) => {
  const { name, description, location, phone } = req.body;

  const store = await Store.findOneAndUpdate(
    { userId: req.user._id },
    { name, description, location, phone },
    { new: true, runValidators: true }
  );

  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found' });
  }

  res.json({ success: true, store });
});

// ─── SELLER DASHBOARD ─────────────────────────
exports.getSellerDashboard = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ userId: req.user._id });
  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found' });
  }

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allOrders, products, reviews] = await Promise.all([
    Order.find({ sellerId: req.user._id }),
    Product.find({ storeId: store._id }),
    Review.find({ storeId: store._id }),
  ]);

  const completedOrders = allOrders.filter(o => o.status === 'delivered');
  const pendingOrders   = allOrders.filter(o => ['paid', 'confirmed', 'dispatched'].includes(o.status));

  const totalRevenue   = completedOrders.reduce((sum, o) => sum + o.sellerPayout, 0);
  const monthRevenue   = completedOrders
    .filter(o => new Date(o.updatedAt) >= monthStart)
    .reduce((sum, o) => sum + o.sellerPayout, 0);

  const avgRating = reviews.length
    ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
    : 0;

  // Top products by units sold
  const topProducts = products
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);

  res.json({
    success: true,
    dashboard: {
      store,
      stats: {
        totalRevenue,
        monthRevenue,
        totalOrders:   allOrders.length,
        pendingOrders: pendingOrders.length,
        totalProducts: products.length,
        activeProducts: products.filter(p => p.status === 'active').length,
        avgRating,
        totalReviews: reviews.length,
      },
      pendingOrders: pendingOrders.slice(0, 5),
      topProducts,
    },
  });
});