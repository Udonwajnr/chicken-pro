require('dotenv').config();

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const { Server } = require('socket.io');
const connectDB  = require('./config/db');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Make io accessible in controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Join a chat room for an order
  socket.on('join_room', (orderId) => {
    socket.join(orderId);
    console.log(`Socket ${socket.id} joined room: ${orderId}`);
  });

  // Send message — save to DB and broadcast to room
  socket.on('send_message', async ({ orderId, content, senderId, senderName }) => {
    const Message = require('./models/Message');
    const Order   = require('./models/Order');

    try {
      const order = await Order.findById(orderId);
      if (!order) return;

      const receiverId = order.buyerId.toString() === senderId
        ? order.sellerId
        : order.buyerId;

      const message = await Message.create({
        orderId, senderId, receiverId, content,
      });

      io.to(orderId).emit('receive_message', {
        _id:        message._id,
        orderId,
        senderId,
        senderName,
        content,
        createdAt:  message.createdAt,
      });
    } catch (err) {
      console.error('Socket message error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ── Connect DB ────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ChickenPro API is running' });
});

// ── Routes — Phase 1 ─────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/farms',      require('./routes/farms'));
app.use('/api/batches',    require('./routes/batches'));
app.use('/api/batches/:id/feed',       require('./routes/feed'));
app.use('/api/batches/:id/health',     require('./routes/health'));
app.use('/api/batches/:id/production', require('./routes/production'));
app.use('/api/batches/:id/finance',    require('./routes/finance'));
app.use('/api/finance',    require('./routes/finance'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/knowledge',  require('./routes/knowledge'));

// ── Routes — Phase 2 (Marketplace) ───────────
app.use('/api/stores',     require('./routes/stores'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/chat',       require('./routes/chat'));
app.use('/api/reviews',    require('./routes/reviews'));

// ── Global error handler ──────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
  });
});

// ── Listen ────────────────────────────────────
// Use server.listen not app.listen (needed for Socket.io)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));