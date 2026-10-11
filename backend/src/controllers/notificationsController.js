const notificationsService = require('../services/notificationsService');
const { asyncHandler } = require('../utils/db');

// GET /api/notifications
const lister = asyncHandler(async (req, res) => {
  res.json({ donnees: await notificationsService.lister(req.utilisateur) });
});

module.exports = { lister };
