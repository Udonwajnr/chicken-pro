require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "ChickenPro API is running" });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/farms", require("./routes/farms"));
app.use("/api/batches", require("./routes/batches"));
app.use("/api/batches/:id/feed", require("./routes/feed"));
app.use("/api/batches/:id/health", require("./routes/health"));
app.use("/api/batches/:id/production", require("./routes/production"));
app.use("/api/batches/:id/finance", require("./routes/finance"));
app.use("/api/finance", require("./routes/finance"));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/knowledge', require('./routes/knowledge'));
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
