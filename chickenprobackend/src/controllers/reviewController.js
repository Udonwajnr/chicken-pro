const Review       = require('../models/Review');
const Order        = require('../models/Order');
const Store        = require('../models/Store');
const asyncHandler = require('../utils/asyncHandler');

// ─── SUBMIT REVIEW ────────────────────────────
exports.submitReview = asyncHandler(async (req, res) => {
  const { orderId, rating, comment } = req.body;

  if (!orderId || !rating) {
    return res.status(400).json({ success: false, message: 'Order ID and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Only the buyer can leave a review' });
  }

  if (order.status !== 'delivered') {
    return res.status(400).json({ success: false, message: 'Can only review after delivery is confirmed' });
  }

  // Check for duplicate
  const existing = await Review.findOne({ orderId });
  if (existing) {
    return res.status(400).json({ success: false, message: 'You have already reviewed this order' });
  }

  const review = await Review.create({
    orderId,
    reviewerId: req.user._id,
    sellerId:   order.sellerId,
    storeId:    order.storeId,
    rating,
    comment,
  });

  // Update store average rating
  const allReviews = await Review.find({ storeId: order.storeId });
  const avgRating  = parseFloat(
    (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
  );

  await Store.findByIdAndUpdate(order.storeId, {
    rating:       avgRating,
    totalRatings: allReviews.length,
  });

  res.status(201).json({ success: true, review });
});

// ─── GET STORE REVIEWS ────────────────────────
exports.getStoreReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ storeId: req.params.storeId })
    .populate('reviewerId', 'name')
    .sort({ createdAt: -1 });

  const avgRating = reviews.length
    ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
    : 0;

  res.json({ success: true, count: reviews.length, avgRating, reviews });
});