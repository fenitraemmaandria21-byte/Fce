const journalService = require('../services/journalService');

async function lister(req, res) {
  res.json(await journalService.lister(req));
}

module.exports = { lister };
