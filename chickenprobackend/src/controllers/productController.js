const Product      = require('../models/Product');
const Store        = require('../models/Store');
const asyncHandler = require('../utils/asyncHandler');

// ─── CREATE PRODUCT ───────────────────────────
exports.createProduct = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ userId: req.user._id });
  if (!store) {
    return res.status(400).json({ success: false, message: 'You need a store before listing products.' });
  }

  const { name, category, description, price, quantity, unit, deliveryOptions, batchId } = req.body;

  if (!name || !category || !price || quantity == null) {
    return res.status(400).json({ success: false, message: 'Name, category, price, and quantity are required' });
  }

  const product = await Product.create({
    storeId: store._id,
    userId:  req.user._id,
    name, category, description, price, quantity,
    unit:            unit            || 'per unit',
    deliveryOptions: deliveryOptions || 'local',
    batchId:         batchId        || null,
  });

  res.status(201).json({ success: true, product });
});

// ─── GET MY PRODUCTS ──────────────────────────
exports.getMyProducts = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ userId: req.user._id });
  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found' });
  }

  const products = await Product.find({ storeId: store._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: products.length, products });
});

// ─── GET ALL PRODUCTS (marketplace browse) ────
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, location, minPrice, maxPrice, search, featured } = req.query;

  const filter = { status: 'active' };

  if (category)  filter.category = category;
  if (featured)  filter.isFeatured = true;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }
  if (search) {
    filter.$text = { $search: search };
  }

  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip  = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('storeId', 'name location rating isVerified')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  // Filter by location if provided (from store location)
  const filtered = location
    ? products.filter(p => p.storeId?.location?.toLowerCase().includes(location.toLowerCase()))
    : products;

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    count: filtered.length,
    products: filtered,
  });
});

// ─── GET SINGLE PRODUCT ───────────────────────
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('storeId', 'name location rating isVerified totalSales photo');

  if (!product || product.status === 'inactive') {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, product });
});

// ─── UPDATE PRODUCT ───────────────────────────
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, product });
});

// ─── DELETE PRODUCT ───────────────────────────
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndDelete({
    _id:    req.params.id,
    userId: req.user._id,
  });

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({ success: true, message: 'Product deleted' });
});

// ─── SEARCH PRODUCTS ──────────────────────────
exports.searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, message: 'Search query is required' });
  }

  const products = await Product.find({
    status: 'active',
    $text:  { $search: q },
  })
    .populate('storeId', 'name location rating isVerified')
    .limit(20);

  res.json({ success: true, count: products.length, products });
});