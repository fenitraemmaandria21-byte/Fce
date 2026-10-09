const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const clientsController = require('../controllers/clientsController');

router.use(requireAuth);

// Liste des clients : tous les utilisateurs authentifiés.
router.get('/', clientsController.lister);

module.exports = router;