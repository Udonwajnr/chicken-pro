const { getLivestock } = require('../config/livestock');

function getFeedRecommendation(batch) {
  const config   = getLivestock(batch.livestockType || 'chicken');
  const schedule = config.feedSchedule[batch.breed];

  if (!schedule) {
    return { message: 'No feed schedule found for this breed' };
  }

  // Calculate current week
  const startDate = new Date(batch.startDate);
  const today     = new Date();
  const diffDays  = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const ageWeek   = Math.ceil(diffDays / 7) || 1;

  // Find the phase for this week
  const phase = schedule.find(s => ageWeek >= s.weekStart && ageWeek <= s.weekEnd);

  if (!phase) {
    return {
      message:  'Batch cycle is complete. Birds should be sold or culled.',
      ageWeek,
      complete: true,
    };
  }

  const birdsAlive    = batch.currentAlive || batch.quantity;
  const totalGPerDay  = phase.gPerBirdPerDay * birdsAlive;
  const totalKgPerDay = totalGPerDay / 1000;
  const bagsPerWeek   = (totalKgPerDay * 7) / 25; // 25kg bag

  // Get brand guide for this phase
  const brandGuide = config.brandGuide?.[phase.phase] || null;

  return {
    ageWeek,
    daysOld:         diffDays,
    phase:           phase.phase,
    feedType:        phase.feedType,
    gPerBirdPerDay:  phase.gPerBirdPerDay,
    birdsAlive,
    totalKgPerDay:   parseFloat(totalKgPerDay.toFixed(2)),
    bagsPerWeek:     parseFloat(bagsPerWeek.toFixed(1)),
    estimatedWeeklyCost: brandGuide
      ? `₦${(bagsPerWeek * 7500).toLocaleString()} – ₦${(bagsPerWeek * 8500).toLocaleString()}`
      : null,
    brandGuide,
  };
}

module.exports = { getFeedRecommendation };