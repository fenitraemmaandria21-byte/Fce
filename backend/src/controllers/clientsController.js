const clientsService = require('../services/clientsService');
const { asyncHandler } = require('../utils/db');

// GET /api/clients
const lister = asyncHandler(async (req, res) => {
  res.json(await clientsService.lister(req));
});

// GET /api/clients/:id
const recuperer = asyncHandler(async (req, res) => {
  res.json(await clientsService.recuperer(req.params.id));
});

// POST /api/clients
const creer = asyncHandler(async (req, res) => {
  const client = await clientsService.creer(req.body, req.utilisateur);
  res.status(201).json({ donnees: client });
});

// PUT /api/clients/:id
const modifier = asyncHandler(async (req, res) => {
  const client = await clientsService.modifier(req.params.id, req.body, req.utilisateur);
  res.json({ donnees: client });
});

// DELETE /api/clients/:id
const supprimer = asyncHandler(async (req, res) => {
  res.json(await clientsService.supprimer(req.params.id, req.utilisateur));
});

module.exports = { lister, recuperer, creer, modifier, supprimer };