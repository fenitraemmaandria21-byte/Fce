const caisseService = require('../services/caisseService');
const { asyncHandler } = require('../utils/db');

// GET /api/caisse
const lister = asyncHandler(async (req, res) => {
  res.json(await caisseService.lister(req));
});

// GET /api/caisse/:id
const recuperer = asyncHandler(async (req, res) => {
  res.json(await caisseService.recuperer(req.params.id));
});

// POST /api/caisse
const ouvrir = asyncHandler(async (req, res) => {
  const donnees = await caisseService.ouvrir(req.body, req.utilisateur);
  res.status(201).json({ donnees });
});

// PUT /api/caisse/:id
const modifier = asyncHandler(async (req, res) => {
  const donnees = await caisseService.modifier(req.params.id, req.body, req.utilisateur);
  res.json({ donnees });
});

// POST /api/caisse/:id/cloturer
const cloturer = asyncHandler(async (req, res) => {
  const donnees = await caisseService.cloturer(req.params.id, req.body, req.utilisateur);
  res.json({ donnees });
});

// DELETE /api/caisse/:id
const supprimer = asyncHandler(async (req, res) => {
  res.json(await caisseService.supprimer(req.params.id, req.utilisateur));
});

module.exports = { lister, recuperer, ouvrir, modifier, cloturer, supprimer };
