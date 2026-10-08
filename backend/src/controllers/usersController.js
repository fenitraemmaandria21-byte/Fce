const { asyncHandler } = require('../utils/db');
const usersService = require('../services/usersService');

const lister = asyncHandler(async (req, res) => {
  res.json(await usersService.lister(req));
});

const recuperer = asyncHandler(async (req, res) => {
  res.json(await usersService.recuperer(req.params.id));
});

const creer = asyncHandler(async (req, res) => {
  res.status(201).json(await usersService.creer(req.body, req.utilisateur));
});

const modifier = asyncHandler(async (req, res) => {
  res.json(await usersService.modifier(req.params.id, req.body, req.utilisateur));
});

const changerStatut = asyncHandler(async (req, res) => {
  res.json(await usersService.changerStatut(req.params.id, req.body.actif, req.utilisateur));
});

module.exports = { lister, recuperer, creer, modifier, changerStatut };
