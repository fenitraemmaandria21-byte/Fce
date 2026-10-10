const { asyncHandler } = require('../utils/db');
const locationsService = require('../services/locationsService');

const lister = asyncHandler(async (req, res) => {
  res.json(await locationsService.lister(req));
});

const recuperer = asyncHandler(async (req, res) => {
  res.json(await locationsService.recuperer(req.params.id));
});

const creer = asyncHandler(async (req, res) => {
  res.status(201).json(await locationsService.creer(req.body, req.utilisateur));
});

const modifier = asyncHandler(async (req, res) => {
  res.json(await locationsService.modifier(req.params.id, req.body, req.utilisateur));
});

const changerStatut = asyncHandler(async (req, res) => {
  const { statut, motif } = req.body;
  res.json(await locationsService.changerStatut(req.params.id, statut, motif, req.utilisateur));
});

const supprimer = asyncHandler(async (req, res) => {
  res.json(await locationsService.supprimer(req.params.id, req.utilisateur));
});

module.exports = { lister, recuperer, creer, modifier, changerStatut, supprimer };
