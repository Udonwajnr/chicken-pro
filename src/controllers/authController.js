const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../utils/asyncHandler");

// ─── REGISTER ───────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, location } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email and password are required",
    });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: "Email already registered" });
  }

  const user = await User.create({ name, email, password, phone, location });

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
    },
  });
});

// ─── LOGIN ──────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid email or password" });
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
    },
  });
});

// ─── GET ME ─────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─── UPDATE PROFILE ─────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, location, role } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, location, role },
    { new: true, runValidators: true },
  );

  res.json({ success: true, user });
});

// ─── UPDATE FCM TOKEN ────────────────────────
exports.updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  await User.findByIdAndUpdate(req.user._id, { fcmToken });
  res.json({ success: true, message: "FCM token updated" });
});
