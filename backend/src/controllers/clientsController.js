const clientsService = require('../services/clientsService');

// GET /api/clients
async function lister(req, res) {
  res.json(await clientsService.lister(req));
}

module.exports = { lister };