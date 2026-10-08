const { asyncHandler } = require('../utils/db');
const documentsService = require('../services/documentsService');

const creerBran = asyncHandler(async (req, res) => {
  res.status(201).json(await documentsService.creerBran(req.body, req.utilisateur));
});

const listerBran = asyncHandler(async (req, res) => {
  res.json(await documentsService.listerBran(req));
});

const recupererBran = asyncHandler(async (req, res) => {
  res.json(await documentsService.recupererBran(req.params.id));
});

const creerRfe = asyncHandler(async (req, res) => {
  res.status(201).json(await documentsService.creerRfe(req.body, req.utilisateur));
});

const listerRfe = asyncHandler(async (req, res) => {
  res.json(await documentsService.listerRfe(req));
});

const recupererRfe = asyncHandler(async (req, res) => {
  res.json(await documentsService.recupererRfe(req.params.id));
});

module.exports = {
  creerBran,
  listerBran,
  recupererBran,
  creerRfe,
  listerRfe,
  recupererRfe,
};
