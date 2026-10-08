const { asyncHandler } = require('../utils/db');
const referenceService = require('../services/referenceService');

const listerGares = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerGares(req));
});

const listerZones = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerZones());
});

const listerArrets = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerArrets());
});

const listerTarifsBillet = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerTarifsBillet(req));
});

const listerTarifsLocation = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerTarifsLocation(req));
});

const listerTrains = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerTrains());
});

const listerVoitures = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerVoitures());
});

const listerWagons = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerWagons(req));
});

const listerParametres = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerParametres());
});

module.exports = {
  listerGares,
  listerZones,
  listerArrets,
  listerTarifsBillet,
  listerTarifsLocation,
  listerTrains,
  listerVoitures,
  listerWagons,
  listerParametres,
};
