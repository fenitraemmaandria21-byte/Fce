const notificationsService = require('../services/notificationsService');
const { asyncHandler } = require('../utils/db');

// GET /api/notifications — liste + compteur de non-lus (base de données).
const lister = asyncHandler(async (req, res) => {
  res.json(await notificationsService.lister(req.utilisateur));
});

// POST /api/notifications/:id/lu — marque une notification comme lue.
const marquerLue = asyncHandler(async (req, res) => {
  res.json(await notificationsService.marquerLue(req.params.id, req.utilisateur));
});

// POST /api/notifications/tout-lu — marque toutes les notifications comme lues.
const toutMarquerLues = asyncHandler(async (req, res) => {
  res.json(await notificationsService.toutMarquerLues(req.utilisateur));
});

module.exports = { lister, marquerLue, toutMarquerLues };
