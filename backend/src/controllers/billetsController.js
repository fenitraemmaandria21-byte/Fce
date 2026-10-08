const { asyncHandler } = require('../utils/db');
const billetsService = require('../services/billetsService');

const lister = asyncHandler(async (req, res) => {
  res.json(await billetsService.lister(req));
});

const recuperer = asyncHandler(async (req, res) => {
  res.json(await billetsService.recuperer(req.params.id));
});


const creer = asyncHandler(async (req, res) => {
  res.status(201).json(await billetsService.creer(req.body, req.utilisateur));
});

const modifier = asyncHandler(async (req, res) => {
  res.json(await billetsService.modifier(req.params.id, req.body, req.utilisateur));
});

const annuler = asyncHandler(async (req, res) => {
  res.json(await billetsService.annuler(req.params.id, req.utilisateur));
});

module.exports = { lister, recuperer, creer, modifier, annuler };
