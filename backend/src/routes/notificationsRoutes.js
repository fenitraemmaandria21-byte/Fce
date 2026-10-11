const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const notificationsController = require('../controllers/notificationsController');

// Centre de notifications : accessible à tous les utilisateurs authentifiés.
// Chaque utilisateur ne voit et ne traite que ses propres notifications.
router.use(requireAuth);

router.get('/', notificationsController.lister);
router.post('/tout-lu', notificationsController.toutMarquerLues);
router.post('/:id/lu', notificationsController.marquerLue);

module.exports = router;
