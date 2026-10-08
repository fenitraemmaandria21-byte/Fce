const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const {
  creerLocationSchema,
  modifierLocationSchema,
  changerStatutLocationSchema,
} = require('../validators/locationValidators');
const locationsController = require('../controllers/locationsController');

router.use(requireAuth);

router.get('/', locationsController.lister);
router.get('/:id', locationsController.recuperer);

// Création : SUPERADMIN, ADMIN, AGENT
router.post('/', validate(creerLocationSchema), locationsController.creer);

// Modification : SUPERADMIN, ADMIN
router.put(
  '/:id',
  requireRole('SUPERADMIN', 'ADMIN'),
  validate(modifierLocationSchema),
  locationsController.modifier
);

// Validation / refus : SUPERADMIN, ADMIN
router.patch(
  '/:id/statut',
  requireRole('SUPERADMIN', 'ADMIN'),
  validate(changerStatutLocationSchema),
  locationsController.changerStatut
);

module.exports = router;
