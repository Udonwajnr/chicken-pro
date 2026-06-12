const chicken = require('./chicken');
// const pig  = require('./pig');   // add later
// const fish = require('./fish');  // add later

const LIVESTOCK = { chicken };

const getLivestock = (type) => {
  const config = LIVESTOCK[type];
  if (!config) throw new Error(`Unknown livestock type: ${type}`);
  return config;
};

module.exports = { getLivestock, LIVESTOCK };