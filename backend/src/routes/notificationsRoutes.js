const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const notificationsController = require('../controllers/notificationsController');

// Centre de notifications : accessible à tous les utilisateurs authentifiés.
router.use(requireAuth);

router.get('/', notificationsController.lister);

module.exports = router;
