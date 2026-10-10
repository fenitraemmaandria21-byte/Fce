const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const clientsController = require('../controllers/clientsController');

router.use(requireAuth);

// Liste des clients : tous les utilisateurs authentifiés.
router.get('/', clientsController.lister);

// Suppression (client sans location) : SUPERADMIN et ADMIN.
router.delete('/:id', requireRole('SUPERADMIN', 'ADMIN'), clientsController.supprimer);

module.exports = router;