const Message      = require('../models/Message');
const Order        = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

// ─── GET MESSAGES FOR AN ORDER ────────────────
exports.getMessages = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const isInvolved =
    order.buyerId.toString()  === req.user._id.toString() ||
    order.sellerId.toString() === req.user._id.toString();

  if (!isInvolved) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const messages = await Message.find({ orderId: order._id })
    .populate('senderId', 'name')
    .sort({ createdAt: 1 })
    .limit(100);

  // Mark messages as read
  await Message.updateMany(
    { orderId: order._id, receiverId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({ success: true, count: messages.length, messages });
});

// ─── SEND MESSAGE ─────────────────────────────
exports.sendMessage = asyncHandler(async (req, res) => {
  const { orderId, content } = req.body;

  if (!orderId || !content) {
    return res.status(400).json({ success: false, message: 'Order ID and content are required' });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const isInvolved =
    order.buyerId.toString()  === req.user._id.toString() ||
    order.sellerId.toString() === req.user._id.toString();

  if (!isInvolved) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const receiverId = order.buyerId.toString() === req.user._id.toString()
    ? order.sellerId
    : order.buyerId;

  const message = await Message.create({
    orderId:    order._id,
    senderId:   req.user._id,
    receiverId,
    content,
  });

  const populated = await message.populate('senderId', 'name');

  res.status(201).json({ success: true, message: populated });
});

// ─── GET UNREAD COUNT ─────────────────────────
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({
    receiverId: req.user._id,
    isRead:     false,
  });
  res.json({ success: true, count });
});