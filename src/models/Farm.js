const mongoose = require("mongoose");

const FarmSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Farm name is required"],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    sizeInSqM: {
      type: Number,
      default: 0,
    },
    penCount: {
      type: Number,
      default: 1,
    },
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "commercial"],
      default: "beginner",
    },
    goal: {
      type: String,
      enum: ["sell_birds", "sell_eggs", "both"],
      default: "sell_birds",
    },
    livestockTypes: {
      type: [String],
      enum: ["chicken", "pig", "fish", "goat", "cattle"],
      default: ["chicken"],
    },
    photo: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Farm", FarmSchema);
