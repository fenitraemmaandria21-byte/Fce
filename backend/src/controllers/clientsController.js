const clientsService = require('../services/clientsService');
const { asyncHandler } = require('../utils/db');

// GET /api/clients
const lister = asyncHandler(async (req, res) => {
  res.json(await clientsService.lister(req));
});

// DELETE /api/clients/:id
const supprimer = asyncHandler(async (req, res) => {
  res.json(await clientsService.supprimer(req.params.id, req.utilisateur));
});

module.exports = { lister, supprimer };