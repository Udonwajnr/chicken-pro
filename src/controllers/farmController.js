const Farm = require("../models/Farm");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { LIVESTOCK } = require("../config/livestock");

// ─── CREATE FARM ─────────────────────────────
exports.createFarm = asyncHandler(async (req, res) => {
  const {
    name,
    location,
    sizeInSqM,
    penCount,
    experienceLevel,
    goal,
    livestockTypes,
  } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Farm name is required" });
  }

  // Check if user already has a farm
  const existing = await Farm.findOne({ userId: req.user._id });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "You already have a farm. Use PUT to update it.",
    });
  }

  const farm = await Farm.create({
    userId: req.user._id,
    name,
    location,
    sizeInSqM,
    penCount,
    experienceLevel,
    goal,
    livestockTypes: livestockTypes || ["chicken"],
  });

  // Mark onboarding complete on user
  await User.findByIdAndUpdate(req.user._id, { onboardingComplete: true });

  res.status(201).json({ success: true, farm });
});

// ─── GET MY FARM ─────────────────────────────
exports.getMyFarm = asyncHandler(async (req, res) => {
  const farm = await Farm.findOne({ userId: req.user._id });

  if (!farm) {
    return res.status(404).json({
      success: false,
      message: "No farm found. Please complete setup.",
    });
  }

  res.json({ success: true, farm });
});

// ─── UPDATE FARM ─────────────────────────────
exports.updateFarm = asyncHandler(async (req, res) => {
  const {
    name,
    location,
    sizeInSqM,
    penCount,
    experienceLevel,
    goal,
    livestockTypes,
  } = req.body;

  const farm = await Farm.findOneAndUpdate(
    { userId: req.user._id },
    {
      name,
      location,
      sizeInSqM,
      penCount,
      experienceLevel,
      goal,
      livestockTypes,
    },
    { new: true, runValidators: true },
  );

  if (!farm) {
    return res.status(404).json({ success: false, message: "Farm not found" });
  }

  res.json({ success: true, farm });
});

// ─── PROFIT PREVIEW ──────────────────────────
// Shows estimated profit based on goal + flock size
// Used in the onboarding wizard Step 3
exports.profitPreview = asyncHandler(async (req, res) => {
  const { breed, quantity } = req.query;
  const qty = parseInt(quantity) || 100;

  const previews = {
    broiler: {
      cycleWeeks: 6,
      costPerBird: 3500,
      revenuePerBird: 3600,
      profitPerBird: 100,
      costBreakdown: [
        {
          item: "Day-old chick",
          amount: 900,
          note: "Buy from a reputable hatchery. Poor quality chicks = poor performance.",
        },
        {
          item: "Feed (6 weeks)",
          amount: 2200,
          note: "Starter (wk 1-2), Grower (wk 3-4), Finisher (wk 5-6). Feed is your biggest cost.",
        },
        {
          item: "Drugs & vaccines",
          amount: 300,
          note: "Newcastle, Gumboro, vitamins. Never skip vaccines — one outbreak can wipe your flock.",
        },
        {
          item: "Miscellaneous",
          amount: 100,
          note: "Water, electricity, bedding (wood shavings).",
        },
      ],
      revenueNote:
        "Broilers sell at 1.8–2kg live weight. Market price is around ₦1,800/kg, so each bird earns roughly ₦3,600.",
      profitNote:
        "Profit per bird is small (₦100) — broilers are a volume game. 500 birds = ₦50,000 profit every 6 weeks. The more birds, the better.",
      tips: [
        "Buy chicks in batches of at least 100 — smaller batches are not cost-effective.",
        "Your biggest risk is disease. Stick to the vaccination schedule the app gives you.",
        "Sell at 6 weeks — every extra week costs you feed money with little weight gain.",
        "Negotiate feed prices when buying in bulk (10 bags or more).",
      ],
    },

    layer: {
      cycleWeeks: 72,
      eggsPerBirdPerYear: 260,
      eggsPerCrate: 30,
      pricePerCrate: 1800,
      costPerBirdPerYear: 8000,
      costBreakdown: [
        {
          item: "Day-old chick (pullet)",
          amount: 1200,
          note: "Buy sexed pullets — females only. Unsexed chicks waste money raising males that will not lay.",
        },
        {
          item: "Feed (per year)",
          amount: 5500,
          note: "Chick mash (wk 1-8), Grower mash (wk 9-18), Layer mash (wk 19+). Layer mash has high calcium for strong eggshells.",
        },
        {
          item: "Drugs & vaccines",
          amount: 800,
          note: "Layers need more vaccines than broilers — longer cycle means more disease exposure.",
        },
        {
          item: "Miscellaneous",
          amount: 500,
          note: "Lighting (layers need 16hrs light/day to lay consistently), water, bedding.",
        },
      ],
      revenueNote:
        "A good layer lays about 260 eggs per year. At 30 eggs per crate and ₦1,800 per crate, each bird earns roughly ₦15,600 per year.",
      profitNote:
        "Layers take 18-20 weeks before they start laying — you spend money for 5 months before you earn anything. But once they start, it is daily income for over a year.",
      tips: [
        "Do NOT give layer mash before week 18. High calcium before laying age damages their kidneys.",
        "Maintain 16 hours of light per day — use a bulb on a timer. Darkness reduces egg production.",
        "Collect eggs 2-3 times daily to reduce breakage and egg eating behaviour.",
        "Cull (remove) poor layers at month 6 — they eat feed without earning revenue.",
        "Layers are more profitable than broilers at scale but require more patience.",
      ],
    },

    cockerel: {
      cycleWeeks: 12,
      costPerBird: 5000,
      revenuePerBird: 5000,
      profitPerBird: 0,
      costBreakdown: [
        {
          item: "Day-old chick",
          amount: 500,
          note: "Cockerel chicks are cheaper than broilers or pullets.",
        },
        {
          item: "Feed (12 weeks)",
          amount: 3800,
          note: "Cockerels eat more and for longer than broilers. Feed cost is the main challenge.",
        },
        {
          item: "Drugs & vaccines",
          amount: 400,
          note: "Same vaccines as broilers but spread over 12 weeks instead of 6.",
        },
        {
          item: "Miscellaneous",
          amount: 300,
          note: "Cockerels are hardier than broilers — lower mortality risk.",
        },
      ],
      revenueNote:
        "Cockerels sell for ₦4,500–5,000 at 12 weeks normally. But during festive seasons (Christmas, Eid, Easter) prices jump to ₦6,000–8,000 per bird.",
      profitNote:
        "At normal prices profit is near zero — cockerels are only highly profitable when timed to festive seasons. Plan your batch start date so birds are ready 1-2 weeks before Christmas or Eid.",
      tips: [
        "Time your batches to be ready for Christmas (start in October) or Eid (check date yearly).",
        "Cockerels are more disease-resistant than broilers — good for beginner farmers.",
        "They grow slower but buyers pay premium for local (cockerel) chicken taste over broiler.",
        "Do not sell too early — buyers want fully mature birds, not small ones.",
      ],
    },
  };

  const data = previews[breed] || previews.broiler;

  let preview;

  if (breed === "layer") {
    const totalEggs = qty * data.eggsPerBirdPerYear;
    const totalCrates = Math.floor(totalEggs / data.eggsPerCrate);
    const totalRevenue = totalCrates * data.pricePerCrate;
    const totalCost = qty * data.costPerBirdPerYear;
    const totalProfit = totalRevenue - totalCost;

    preview = {
      breed,
      quantity: qty,
      cycleWeeks: data.cycleWeeks,
      costBreakdown: data.costBreakdown,
      totalCostPerBird: data.costPerBirdPerYear,
      totalCost,
      eggsPerYear: totalEggs,
      cratesPerYear: totalCrates,
      totalRevenue,
      totalProfit,
      revenueNote: data.revenueNote,
      profitNote: data.profitNote,
      tips: data.tips,
      summary: `With ${qty} layers you could earn approx. ₦${totalProfit.toLocaleString()} per year after costs.`,
    };
  } else {
    const totalCost = qty * data.costPerBird;
    const totalRevenue = qty * data.revenuePerBird;
    const totalProfit = qty * data.profitPerBird;

    preview = {
      breed,
      quantity: qty,
      cycleWeeks: data.cycleWeeks,
      costBreakdown: data.costBreakdown,
      totalCostPerBird: data.costPerBird,
      totalCost,
      totalRevenue,
      totalProfit,
      revenueNote: data.revenueNote,
      profitNote: data.profitNote,
      tips: data.tips,
      summary: `With ${qty} ${breed}s you could earn approx. ₦${totalProfit.toLocaleString()} every ${data.cycleWeeks} weeks.`,
    };
  }

  res.json({ success: true, preview });
});

// ─── GET LIVESTOCK TYPES ──────────────────────
// Returns available livestock types for the wizard dropdown
exports.getLivestockTypes = asyncHandler(async (req, res) => {
  const types = Object.values(LIVESTOCK).map((l) => ({
    type: l.type,
    label: l.label,
    breeds: l.breeds,
  }));

  res.json({ success: true, types });
});
