const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const {
  ouvrirCaisseSchema,
  modifierCaisseSchema,
  cloturerCaisseSchema,
} = require('../validators/caisseValidators');
const caisseController = require('../controllers/caisseController');

router.use(requireAuth);

// Consultation : tous les utilisateurs authentifiés.
router.get('/', caisseController.lister);
router.get('/:id', caisseController.recuperer);

// Gestion de la caisse : SUPERADMIN et ADMIN.
router.post('/', requireRole('SUPERADMIN', 'ADMIN'), validate(ouvrirCaisseSchema), caisseController.ouvrir);
router.put('/:id', requireRole('SUPERADMIN', 'ADMIN'), validate(modifierCaisseSchema), caisseController.modifier);
router.post(
  '/:id/cloturer',
  requireRole('SUPERADMIN', 'ADMIN'),
  validate(cloturerCaisseSchema),
  caisseController.cloturer,
);
router.delete('/:id', requireRole('SUPERADMIN', 'ADMIN'), caisseController.supprimer);

module.exports = router;
