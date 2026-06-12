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

  // ── Farmer's custom prices (optional overrides) ──
  const {
    customChickPrice,
    customFeedCost,
    customDrugCost,
    customMiscCost,
    customSellPrice, // per bird (broiler/cockerel) or per crate (layer)
    customLaborCost,
  } = req.query;

  const qty = parseInt(quantity) || 100;

  // ── Our default market prices (Nigeria 2025) ──
  const defaults = {
    broiler: {
      cycleWeeks: 6,
      chickPrice: 900,
      feedCost: 2200,
      drugCost: 300,
      miscCost: 100,
      laborCost: 500,
      sellPricePerBird: 3800,
      sellUnit: "per bird",
      weightKg: 1.9,
      pricePerKg: 2000,
    },
    layer: {
      cycleWeeks: 72,
      chickPrice: 1200,
      feedCostPerYear: 5500,
      drugCost: 800,
      miscCost: 500,
      laborCost: 1000,
      eggsPerBirdPerYear: 260,
      eggsPerCrate: 30,
      sellPricePerCrate: 1900,
      sellUnit: "per crate of 30 eggs",
    },
    cockerel: {
      cycleWeeks: 12,
      chickPrice: 500,
      feedCost: 3800,
      drugCost: 400,
      miscCost: 300,
      laborCost: 800,
      sellPricePerBird: 5500,
      sellUnit: "per bird",
    },
  };

  const d = defaults[breed] || defaults.broiler;

  // ── Merge defaults with farmer's custom prices ──
  // If farmer provides their own price we use it, otherwise we use our default
  const prices = {
    chickPrice: parseFloat(customChickPrice) || d.chickPrice,
    feedCost: parseFloat(customFeedCost) || d.feedCost || d.feedCostPerYear,
    drugCost: parseFloat(customDrugCost) || d.drugCost,
    miscCost: parseFloat(customMiscCost) || d.miscCost,
    laborCost: parseFloat(customLaborCost) || d.laborCost,
    sellPrice:
      parseFloat(customSellPrice) ||
      (breed === "layer" ? d.sellPricePerCrate : d.sellPricePerBird),
  };

  // ── Cost breakdown (always shown) ──
  const costBreakdown = [
    {
      item: "Day-old chick",
      defaultPrice: breed === "layer" ? d.chickPrice : d.chickPrice,
      priceUsed: prices.chickPrice,
      isCustom: !!customChickPrice,
      totalForBatch: prices.chickPrice * qty,
      note:
        breed === "layer"
          ? "Buy sexed pullets only — females. Males will not lay."
          : "Buy from registered hatcheries only — Chi Farms, Zartech, Obasanjo Farms.",
    },
    {
      item:
        breed === "layer"
          ? "Feed (full year per bird)"
          : `Feed (${d.cycleWeeks} weeks per bird)`,
      defaultPrice: d.feedCost || d.feedCostPerYear,
      priceUsed: prices.feedCost,
      isCustom: !!customFeedCost,
      totalForBatch: prices.feedCost * qty,
      note: "Feed is 60–70% of your total cost. Buy in bulk to save ₦200–500 per bag.",
    },
    {
      item: "Drugs & vaccines per bird",
      defaultPrice: d.drugCost,
      priceUsed: prices.drugCost,
      isCustom: !!customDrugCost,
      totalForBatch: prices.drugCost * qty,
      note: "Never skip vaccines. One Newcastle outbreak can wipe your entire flock in 3 days.",
    },
    {
      item: "Labor per bird",
      defaultPrice: d.laborCost,
      priceUsed: prices.laborCost,
      isCustom: !!customLaborCost,
      totalForBatch: prices.laborCost * qty,
      note: "Farm hand, feeding time, water, daily checks. Many beginners forget to count this.",
    },
    {
      item: "Miscellaneous per bird",
      defaultPrice: d.miscCost,
      priceUsed: prices.miscCost,
      isCustom: !!customMiscCost,
      totalForBatch: prices.miscCost * qty,
      note: "Bedding (wood shavings), electricity, water, equipment wear.",
    },
  ];

  const totalCostPerBird =
    prices.chickPrice +
    prices.feedCost +
    prices.drugCost +
    prices.laborCost +
    prices.miscCost;
  const totalCost = totalCostPerBird * qty;

  let preview;

  if (breed === "layer") {
    const totalEggs = qty * d.eggsPerBirdPerYear;
    const totalCrates = Math.floor(totalEggs / d.eggsPerCrate);
    const totalRevenue = totalCrates * prices.sellPrice;
    const totalProfit = totalRevenue - totalCost;
    const roi =
      totalCost > 0
        ? parseFloat(((totalProfit / totalCost) * 100).toFixed(1))
        : 0;
    const profitPerBird = parseFloat((totalProfit / qty).toFixed(2));
    const breakEvenCrates =
      totalCost > 0 ? Math.ceil(totalCost / prices.sellPrice) : 0;

    preview = {
      breed,
      quantity: qty,
      cycleWeeks: d.cycleWeeks,

      // Prices used — shows which ones are custom vs our defaults
      pricesUsed: {
        chickPrice: {
          value: prices.chickPrice,
          isCustom: !!customChickPrice,
          default: d.chickPrice,
        },
        feedCostPerYear: {
          value: prices.feedCost,
          isCustom: !!customFeedCost,
          default: d.feedCostPerYear,
        },
        drugCost: {
          value: prices.drugCost,
          isCustom: !!customDrugCost,
          default: d.drugCost,
        },
        laborCost: {
          value: prices.laborCost,
          isCustom: !!customLaborCost,
          default: d.laborCost,
        },
        miscCost: {
          value: prices.miscCost,
          isCustom: !!customMiscCost,
          default: d.miscCost,
        },
        sellPricePerCrate: {
          value: prices.sellPrice,
          isCustom: !!customSellPrice,
          default: d.sellPricePerCrate,
        },
      },

      // Cost
      costBreakdown,
      totalCostPerBird,
      totalCost,

      // Revenue
      eggsPerYear: totalEggs,
      cratesPerYear: totalCrates,
      sellUnit: d.sellUnit,
      sellPrice: prices.sellPrice,
      totalRevenue,

      // Profit
      totalProfit,
      profitPerBird,
      roi,
      isProfit: totalProfit >= 0,
      breakEvenCrates,

      // Education
      revenueNote: `A good layer lays ~${d.eggsPerBirdPerYear} eggs per year. At ₦${prices.sellPrice.toLocaleString()} per crate of ${d.eggsPerCrate}, each bird earns roughly ₦${(Math.floor(d.eggsPerBirdPerYear / d.eggsPerCrate) * prices.sellPrice).toLocaleString()} per year in revenue.`,
      profitNote:
        "Layers take 18–20 weeks before laying. You spend money for 5 months before earning. But once they start it is daily income for over a year.",
      tips: [
        "Do NOT give layer mash before week 18 — high calcium causes kidney damage.",
        "Maintain 16 hours of light per day — use a timer. Darkness kills production.",
        "Collect eggs 2–3 times daily to reduce breakage.",
        "Cull poor layers at month 6 — they eat feed and produce nothing.",
      ],
      summary: `With ${qty} layers at your prices, you could earn approx. ₦${totalProfit.toLocaleString()} per year after all costs. ROI: ${roi}%.`,
    };
  } else {
    // Broiler or Cockerel
    const totalRevenue = qty * prices.sellPrice;
    const totalProfit = totalRevenue - totalCost;
    const roi =
      totalCost > 0
        ? parseFloat(((totalProfit / totalCost) * 100).toFixed(1))
        : 0;
    const profitPerBird = parseFloat((totalProfit / qty).toFixed(2));
    const breakEven =
      prices.sellPrice > 0 ? Math.ceil(totalCost / prices.sellPrice) : 0;

    preview = {
      breed,
      quantity: qty,
      cycleWeeks: d.cycleWeeks,

      // Prices used
      pricesUsed: {
        chickPrice: {
          value: prices.chickPrice,
          isCustom: !!customChickPrice,
          default: d.chickPrice,
        },
        feedCost: {
          value: prices.feedCost,
          isCustom: !!customFeedCost,
          default: d.feedCost,
        },
        drugCost: {
          value: prices.drugCost,
          isCustom: !!customDrugCost,
          default: d.drugCost,
        },
        laborCost: {
          value: prices.laborCost,
          isCustom: !!customLaborCost,
          default: d.laborCost,
        },
        miscCost: {
          value: prices.miscCost,
          isCustom: !!customMiscCost,
          default: d.miscCost,
        },
        sellPricePerBird: {
          value: prices.sellPrice,
          isCustom: !!customSellPrice,
          default: d.sellPricePerBird,
        },
      },

      // Cost
      costBreakdown,
      totalCostPerBird,
      totalCost,

      // Revenue
      sellUnit: d.sellUnit,
      sellPrice: prices.sellPrice,
      totalRevenue,

      // Profit
      totalProfit,
      profitPerBird,
      roi,
      isProfit: totalProfit >= 0,
      breakEvenBirds: breakEven,

      // Education
      revenueNote:
        breed === "broiler"
          ? `Broilers sell at 1.8–2kg live weight. At ₦${prices.sellPrice.toLocaleString()} per bird, ${qty} birds earns ₦${totalRevenue.toLocaleString()} total.`
          : `Cockerels sell for ₦4,500–5,000 normally. During Christmas and Eid prices jump to ₦6,000–8,000. Time your batches to festive seasons.`,
      profitNote:
        breed === "broiler"
          ? `Profit per bird is ₦${profitPerBird.toLocaleString()}. Broilers are a volume game — the more birds, the better. At 500 birds that is ₦${(profitPerBird * 500).toLocaleString()} every 6 weeks.`
          : `At normal prices cockerel profit is slim. The real money is in festive season pricing. A bird that sells for ₦5,000 in June sells for ₦7,000 in December.`,
      tips:
        breed === "broiler"
          ? [
              "Buy chicks in batches of at least 100 — smaller batches are not cost-effective.",
              "Stick to the vaccination schedule — one Newcastle outbreak costs more than a whole year of vaccines.",
              "Sell at exactly 6 weeks — every extra week costs ₦600–₦800 per bird in feed with little weight gain.",
              "Negotiate feed prices when buying 10+ bags at a time.",
            ]
          : [
              "Start your batch in October to be ready for Christmas.",
              "Cockerels are more disease-resistant than broilers — good for beginners.",
              "Buyers pay a premium for cockerel taste over broiler — market it right.",
              "Do not sell too early — buyers want fully mature birds.",
            ],
      summary: `With ${qty} ${breed}s at your prices, you could earn approx. ₦${totalProfit.toLocaleString()} every ${d.cycleWeeks} weeks. ROI: ${roi}%.`,
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
