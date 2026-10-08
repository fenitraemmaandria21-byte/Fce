const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const journalController = require('../controllers/journalController');

router.use(requireAuth);

// Historique : SUPERADMIN et ADMIN
router.get('/', requireRole('SUPERADMIN', 'ADMIN'), journalController.lister);

module.exports = router;
