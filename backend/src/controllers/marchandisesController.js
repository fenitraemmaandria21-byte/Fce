const { asyncHandler } = require('../utils/db');
const marchandisesService = require('../services/marchandisesService');
const arrivagesService = require('../services/arrivagesService');

const listerEnvois = asyncHandler(async (req, res) => {
  res.json(await marchandisesService.lister(req));
});

const recupererEnvoi = asyncHandler(async (req, res) => {
  res.json(await marchandisesService.recuperer(req.params.id));
});

const creerEnvoi = asyncHandler(async (req, res) => {
  res.status(201).json(await marchandisesService.creer(req.body, req.utilisateur));
});

const modifierEnvoi = asyncHandler(async (req, res) => {
  res.json(await marchandisesService.modifier(req.params.id, req.body, req.utilisateur));
});

const listerArrivages = asyncHandler(async (req, res) => {
  res.json(await arrivagesService.lister(req));
});

const recupererArrivage = asyncHandler(async (req, res) => {
  res.json(await arrivagesService.recuperer(req.params.id));
});

const creerArrivage = asyncHandler(async (req, res) => {
  res.status(201).json(await arrivagesService.creer(req.body, req.utilisateur));
});

module.exports = {
  listerEnvois,
  recupererEnvoi,
  creerEnvoi,
  modifierEnvoi,
  listerArrivages,
  recupererArrivage,
  creerArrivage,
};
