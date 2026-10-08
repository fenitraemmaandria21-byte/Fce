const { asyncHandler } = require('../utils/db');
const dashboardService = require('../services/dashboardService');

const tableauDeBord = asyncHandler(async (req, res) => {
  res.json(await dashboardService.tableauDeBord());
});

const statsBilletterie = asyncHandler(async (req, res) => {
  res.json(await dashboardService.statsBilletterie(req));
});

const statsMarchandises = asyncHandler(async (req, res) => {
  res.json(await dashboardService.statsMarchandises(req));
});

const statsArrivages = asyncHandler(async (req, res) => {
  res.json(await dashboardService.statsArrivages(req));
});

const statsLocation = asyncHandler(async (req, res) => {
  res.json(await dashboardService.statsLocation(req));
});

const statsRecettes = asyncHandler(async (req, res) => {
  res.json(await dashboardService.statsRecettes(req));
});

module.exports = {
  tableauDeBord,
  statsBilletterie,
  statsMarchandises,
  statsArrivages,
  statsLocation,
  statsRecettes,
};
