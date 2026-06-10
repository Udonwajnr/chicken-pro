module.exports = {
  type: 'chicken',
  label: 'Poultry (Chicken)',
  breeds: ['broiler', 'layer', 'cockerel'],

  feedSchedule: {
    broiler: [
      { weekStart: 1, weekEnd: 2, phase: 'Starter',  feedType: 'Chick Mash',    gPerBirdPerDay: 45  },
      { weekStart: 3, weekEnd: 4, phase: 'Grower',   feedType: 'Growers Mash',  gPerBirdPerDay: 85  },
      { weekStart: 5, weekEnd: 6, phase: 'Finisher', feedType: 'Finisher Mash', gPerBirdPerDay: 125 },
    ],
    layer: [
      { weekStart: 1,  weekEnd: 8,  phase: 'Chick',  feedType: 'Chick Mash',   gPerBirdPerDay: 30  },
      { weekStart: 9,  weekEnd: 18, phase: 'Grower', feedType: 'Growers Mash', gPerBirdPerDay: 80  },
      { weekStart: 19, weekEnd: 72, phase: 'Layer',  feedType: 'Layers Mash',  gPerBirdPerDay: 115 },
    ],
    cockerel: [
      { weekStart: 1,  weekEnd: 4,  phase: 'Starter',  feedType: 'Chick Mash',    gPerBirdPerDay: 40  },
      { weekStart: 5,  weekEnd: 8,  phase: 'Grower',   feedType: 'Growers Mash',  gPerBirdPerDay: 90  },
      { weekStart: 9,  weekEnd: 12, phase: 'Finisher', feedType: 'Finisher Mash', gPerBirdPerDay: 120 },
    ],
  },

  brandGuide: {
    Starter: {
      proteinPercent: '22–24%',
      warning: 'Never buy feed with no ingredient list. Check NAFDAC registration number on the bag.',
      buyingTips: [
        'Check protein content — minimum 22% for broiler starter',
        'Look for Lysine and Methionine on the label — essential for fast growth',
        'Check manufacturing date — never buy feed older than 3 months',
        'Smell the feed — good feed smells like grain, never sour or musty',
        'Buy from a cool dry store — heat and moisture cause mould and aflatoxin poisoning',
      ],
      brands: [
        {
          name:        'Vital Feed',
          product:     'Vital Broiler Starter',
          ingredients: ['Maize', 'Soya', 'Fish Meal', 'Lysine', 'Methionine', 'Vitamins A/D3/E'],
          priceRange:  '₦7,500 – ₦8,500 per 25kg bag',
          whereToBuy:  'Agrovets, Vital Feed agents, AgroMall online',
          rating:      5,
        },
        {
          name:        'Hybrid Feeds',
          product:     'Hybrid Broiler Chick Mash',
          ingredients: ['Maize', 'Groundnut Cake', 'Fish Meal', 'Premix', 'DCP'],
          priceRange:  '₦7,000 – ₦8,000 per 25kg bag',
          whereToBuy:  'Feed stores nationwide',
          rating:      4,
        },
        {
          name:        'Olam Feeds',
          product:     'Futura Broiler Starter',
          ingredients: ['Maize', 'Soya Bean Meal', 'Vitamins', 'Amino acids'],
          priceRange:  '₦8,000 – ₦9,000 per 25kg bag',
          whereToBuy:  'Olam distributors, AgroMall',
          rating:      4,
        },
        {
          name:        'Top Feeds',
          product:     'Top Broiler Starter',
          ingredients: ['Maize', 'Soybean', 'Lysine', 'Methionine', 'Coccidiostat'],
          priceRange:  '₦7,200 – ₦7,800 per 25kg bag',
          whereToBuy:  'Top Feeds agents, open market',
          rating:      4,
        },
      ],
    },

    Grower: {
      proteinPercent: '20–22%',
      warning: 'Check for DCP (Dicalcium Phosphate) on the label — needed for bone development at this stage.',
      buyingTips: [
        'Protein should be 20–22% — lower than starter because birds are bigger now',
        'Must contain DCP for strong bone development',
        'Check expiry date and storage condition at the shop',
        'Texture should be uniform dry pellets or mash — no clumps or wet spots',
        'Buy in bulk if you have storage — 10+ bags saves cost per kg',
      ],
      brands: [
        {
          name:        'Vital Feed',
          product:     'Vital Broiler Grower',
          ingredients: ['Maize', 'Soya', 'Fish Meal', 'Methionine', 'Minerals'],
          priceRange:  '₦7,000 – ₦8,000 per 25kg bag',
          whereToBuy:  'Agrovets, Vital Feed agents',
          rating:      5,
        },
        {
          name:        'Hybrid Feeds',
          product:     'Hybrid Growers Mash',
          ingredients: ['Maize', 'Groundnut Cake', 'Soya', 'DCP', 'Premix'],
          priceRange:  '₦6,800 – ₦7,500 per 25kg bag',
          whereToBuy:  'Feed stores nationwide',
          rating:      4,
        },
        {
          name:        'Olam Feeds',
          product:     'Futura Broiler Grower',
          ingredients: ['Maize', 'Soybean Meal', 'Vitamins', 'Phosphorus'],
          priceRange:  '₦7,500 – ₦8,500 per 25kg bag',
          whereToBuy:  'Olam distributors',
          rating:      4,
        },
        {
          name:        'Top Feeds',
          product:     'Top Broiler Grower',
          ingredients: ['Maize', 'Soybean', 'Amino acids', 'Coccidiostat'],
          priceRange:  '₦6,900 – ₦7,600 per 25kg bag',
          whereToBuy:  'Top Feeds agents',
          rating:      4,
        },
      ],
    },

    Finisher: {
      proteinPercent: '18–20%',
      warning: 'CRITICAL — Finisher feed must be coccidiostat-free or have a withdrawal period stated. You are close to slaughter. Medication residues in meat is a food safety issue.',
      buyingTips: [
        'Protein 18–20% — lowest of the three phases',
        'Must be coccidiostat-FREE or within withdrawal period before slaughter',
        'Higher energy content than grower — helps birds put on final weight fast',
        'Do not switch to finisher too early — wait until week 5',
        'Check the withdrawal period on the bag — usually 5–7 days before slaughter',
      ],
      brands: [
        {
          name:        'Vital Feed',
          product:     'Vital Broiler Finisher',
          ingredients: ['Maize', 'Soya', 'Wheat Offal', 'Vitamins', 'Low coccidiostat'],
          priceRange:  '₦6,500 – ₦7,500 per 25kg bag',
          whereToBuy:  'Agrovets, Vital Feed agents',
          rating:      5,
        },
        {
          name:        'Hybrid Feeds',
          product:     'Hybrid Finisher Mash',
          ingredients: ['Maize', 'Groundnut', 'Soya', 'Minerals', 'Premix'],
          priceRange:  '₦6,500 – ₦7,200 per 25kg bag',
          whereToBuy:  'Feed stores nationwide',
          rating:      4,
        },
        {
          name:        'Olam Feeds',
          product:     'Futura Broiler Finisher',
          ingredients: ['Maize', 'Soybean', 'Energy boosters', 'Vitamins'],
          priceRange:  '₦7,000 – ₦8,000 per 25kg bag',
          whereToBuy:  'Olam distributors',
          rating:      4,
        },
        {
          name:        'Top Feeds',
          product:     'Top Broiler Finisher',
          ingredients: ['Maize', 'Soybean', 'Wheat offal', 'Amino acids'],
          priceRange:  '₦6,500 – ₦7,000 per 25kg bag',
          whereToBuy:  'Top Feeds agents',
          rating:      4,
        },
      ],
    },

    Chick: {
      proteinPercent: '20–22%',
      warning: 'Coccidiostat is essential at this stage — young chicks are highly vulnerable to coccidiosis.',
      buyingTips: [
        'Must contain coccidiostat — young chicks are very vulnerable',
        'Protein 20–22% for healthy early growth',
        'Feed must be fine mash texture — chicks cannot eat large pellets',
        'Keep feed dry at all times — wet feed causes disease in young chicks',
        'Do not mix with grower or layer feed at this stage',
      ],
      brands: [
        {
          name:        'Vital Feed',
          product:     'Vital Chick Mash',
          ingredients: ['Maize', 'Soya', 'Fish Meal', 'Coccidiostat', 'Vitamins'],
          priceRange:  '₦7,000 – ₦8,500 per 25kg bag',
          whereToBuy:  'Agrovets, Vital Feed agents',
          rating:      5,
        },
        {
          name:        'Hybrid Feeds',
          product:     'Hybrid Chick Starter',
          ingredients: ['Maize', 'Groundnut Cake', 'Fish Meal', 'Premix', 'Coccidiostat'],
          priceRange:  '₦7,000 – ₦8,000 per 25kg bag',
          whereToBuy:  'Feed stores nationwide',
          rating:      4,
        },
      ],
    },

    Layer: {
      proteinPercent: '16–17%',
      warning: 'Do NOT give layer mash before week 18. High calcium before laying age causes kidney damage and early death.',
      buyingTips: [
        'Calcium content must be 3.5–4% — this is what makes strong eggshells',
        'Do NOT give to birds younger than 18 weeks — kidney damage risk',
        'Protein 16–17% — lower than grower but calcium is higher',
        'Ensure fresh supply — layer mash can go stale fast in humid weather',
        'Supplement with oyster shell or limestone grit for extra calcium if shells are thin',
      ],
      brands: [
        {
          name:        'Vital Feed',
          product:     'Vital Layer Mash',
          ingredients: ['Maize', 'Soya', 'Limestone', 'DCP', 'Vitamins', 'Premix'],
          priceRange:  '₦6,800 – ₦8,000 per 25kg bag',
          whereToBuy:  'Agrovets, Vital Feed agents',
          rating:      5,
        },
        {
          name:        'Hybrid Feeds',
          product:     'Hybrid Layer Mash',
          ingredients: ['Maize', 'Groundnut Cake', 'Soya', 'Limestone', 'Premix'],
          priceRange:  '₦6,500 – ₦7,500 per 25kg bag',
          whereToBuy:  'Feed stores nationwide',
          rating:      4,
        },
        {
          name:        'Top Feeds',
          product:     'Top Layer Mash',
          ingredients: ['Maize', 'Soybean', 'Calcium carbonate', 'Vitamins'],
          priceRange:  '₦6,800 – ₦7,800 per 25kg bag',
          whereToBuy:  'Top Feeds agents',
          rating:      4,
        },
      ],
    },
  },

  vaccinationSchedule: {
    broiler: [
      { dayOffset: 7,  name: 'Newcastle Disease (Lasota)', method: 'Eye drop / drinking water' },
      { dayOffset: 14, name: 'Gumboro (IBD)',              method: 'Drinking water'             },
      { dayOffset: 21, name: 'Newcastle Booster',          method: 'Drinking water'             },
      { dayOffset: 28, name: 'Gumboro Booster',            method: 'Drinking water'             },
    ],
    layer: [
      { dayOffset: 7,   name: 'Newcastle Disease (Lasota)', method: 'Eye drop'       },
      { dayOffset: 14,  name: 'Gumboro (IBD)',              method: 'Drinking water' },
      { dayOffset: 21,  name: 'Newcastle Booster',          method: 'Drinking water' },
      { dayOffset: 42,  name: 'Fowl Pox',                   method: 'Wing web stab'  },
      { dayOffset: 56,  name: 'Newcastle (Komarov)',         method: 'Injection'      },
      { dayOffset: 112, name: 'Newcastle 6-month Booster',  method: 'Drinking water' },
    ],
    cockerel: [
      { dayOffset: 7,  name: 'Newcastle Disease (Lasota)', method: 'Eye drop'       },
      { dayOffset: 14, name: 'Gumboro (IBD)',              method: 'Drinking water' },
      { dayOffset: 21, name: 'Newcastle Booster',          method: 'Drinking water' },
      { dayOffset: 42, name: 'Fowl Pox',                   method: 'Wing web stab'  },
    ],
  },

  slaughterWeightKg: { broiler: 1.8, cockerel: 2.5 },
  cycleWeeks:        { broiler: 6,   layer: 72, cockerel: 12 },
  productionTracking:{ broiler: 'weight', layer: 'eggs', cockerel: 'weight' },
};