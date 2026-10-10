const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const { creerBilletSchema, modifierBilletSchema } = require('../validators/billetValidators');
const billetsController = require('../controllers/billetsController');

router.use(requireAuth);

router.get('/', billetsController.lister);
router.get('/:id', billetsController.recuperer);

// Écriture : SUPERADMIN, ADMIN, AGENT (AGENT enregistre les ventes)
router.post('/', validate(creerBilletSchema), billetsController.creer);

// Modification / annulation : SUPERADMIN, ADMIN
router.put(
  '/:id',
  requireRole('SUPERADMIN', 'ADMIN'),
  validate(modifierBilletSchema),
  billetsController.modifier
);
router.post(
  '/:id/annuler',
  requireRole('SUPERADMIN', 'ADMIN'),
  billetsController.annuler
);

// Suppression : SUPERADMIN, ADMIN
router.delete('/:id', requireRole('SUPERADMIN', 'ADMIN'), billetsController.supprimer);

module.exports = router;
