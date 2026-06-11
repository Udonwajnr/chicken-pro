const asyncHandler  = require('../utils/asyncHandler');
const knowledgeBase = require('../config/knowledgeBase');
const { getLivestock } = require('../config/livestock');

// ─── GET MARKET PRICES ───────────────────────
exports.getMarketPrices = asyncHandler(async (req, res) => {
  const { region } = req.query;

  let prices = knowledgeBase.marketPrices;

  // Filter by region if provided
  if (region) {
    prices = prices.filter(p =>
      p.region.toLowerCase().includes(region.toLowerCase())
    );
  }

  if (prices.length === 0) {
    return res.status(404).json({
      success: false,
      message: `No price data found for region: ${region}. Available regions: Lagos, Abuja, Kano, Port Harcourt, Ibadan`,
    });
  }

  res.json({
    success:          true,
    availableRegions: knowledgeBase.marketPrices.map(p => p.region),
    count:            prices.length,
    prices,
  });
});

// ─── GET ALL GUIDES ──────────────────────────
exports.getGuides = asyncHandler(async (req, res) => {
  const { category } = req.query;

  let guides = knowledgeBase.guides;

  if (category) {
    guides = guides.filter(g =>
      g.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Return summary only — no full content in list view
  const guideSummaries = guides.map(g => ({
    id:       g.id,
    title:    g.title,
    category: g.category,
    readTime: g.readTime,
    summary:  g.summary,
  }));

  const categories = [...new Set(knowledgeBase.guides.map(g => g.category))];

  res.json({
    success:    true,
    categories,
    count:      guideSummaries.length,
    guides:     guideSummaries,
  });
});

// ─── GET SINGLE GUIDE ────────────────────────
exports.getGuide = asyncHandler(async (req, res) => {
  const guide = knowledgeBase.guides.find(g => g.id === req.params.id);

  if (!guide) {
    return res.status(404).json({
      success: false,
      message: 'Guide not found',
    });
  }

  res.json({ success: true, guide });
});

// ─── GET DISEASE LIBRARY ─────────────────────
exports.getDiseases = asyncHandler(async (req, res) => {
  const { search, urgency, livestockType } = req.query;

  const config   = getLivestock(livestockType || 'chicken');
  let diseases   = config.diseases || [];

  // Filter by urgency
  if (urgency) {
    diseases = diseases.filter(d =>
      d.urgency.toLowerCase() === urgency.toLowerCase()
    );
  }

  // Search by name, alias, or symptom
  if (search) {
    const term = search.toLowerCase();
    diseases   = diseases.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.aliases.some(a => a.toLowerCase().includes(term)) ||
      d.symptoms.some(s => s.toLowerCase().includes(term))
    );
  }

  // Return summary in list view
  const diseaseSummaries = diseases.map(d => ({
    name:        d.name,
    urgency:     d.urgency,
    affectedAge: d.affectedAge,
    symptoms:    d.symptoms.slice(0, 3), // first 3 symptoms as preview
    callVet:     d.callVet,
  }));

  res.json({
    success:  true,
    count:    diseaseSummaries.length,
    diseases: diseaseSummaries,
  });
});

// ─── GET SINGLE DISEASE ──────────────────────
exports.getDisease = asyncHandler(async (req, res) => {
  const { livestockType } = req.query;

  const config  = getLivestock(livestockType || 'chicken');
  const disease = config.diseases?.find(d =>
    d.name.toLowerCase().replace(/\s+/g, '-') === req.params.name.toLowerCase() ||
    d.name.toLowerCase() === req.params.name.toLowerCase().replace(/-/g, ' ')
  );

  if (!disease) {
    return res.status(404).json({
      success: false,
      message: 'Disease not found',
    });
  }

  res.json({ success: true, disease });
});

// ─── GET VIDEOS ──────────────────────────────
exports.getVideos = asyncHandler(async (req, res) => {
  const { tag } = req.query;

  let videos = knowledgeBase.videos;

  if (tag) {
    videos = videos.filter(v =>
      v.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }

  const allTags = [...new Set(knowledgeBase.videos.flatMap(v => v.tags))];

  res.json({
    success:  true,
    allTags,
    count:    videos.length,
    videos,
  });
});

// ─── GET KNOWLEDGE HUB OVERVIEW ──────────────
// Returns everything in one call for the hub home page
exports.getHubOverview = asyncHandler(async (req, res) => {
  const config   = getLivestock('chicken');
  const diseases = config.diseases || [];

  res.json({
    success: true,
    hub: {
      guides: {
        total:      knowledgeBase.guides.length,
        categories: [...new Set(knowledgeBase.guides.map(g => g.category))],
        featured:   knowledgeBase.guides.slice(0, 3).map(g => ({
          id:       g.id,
          title:    g.title,
          category: g.category,
          readTime: g.readTime,
          summary:  g.summary,
        })),
      },
      diseases: {
        total:    diseases.length,
        critical: diseases.filter(d => d.urgency === 'CRITICAL').length,
        high:     diseases.filter(d => d.urgency === 'HIGH').length,
        medium:   diseases.filter(d => d.urgency === 'MEDIUM').length,
      },
      marketPrices: {
        availableRegions: knowledgeBase.marketPrices.map(p => p.region),
        lastUpdated:      knowledgeBase.marketPrices[0]?.updatedAt,
      },
      videos: {
        total:  knowledgeBase.videos.length,
        allTags: [...new Set(knowledgeBase.videos.flatMap(v => v.tags))],
      },
    },
  });
});