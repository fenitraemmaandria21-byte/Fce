const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const {
  creerUtilisateurSchema,
  modifierUtilisateurSchema,
  changerStatutUtilisateurSchema,
} = require('../validators/authValidators');
const usersController = require('../controllers/usersController');

router.use(requireAuth);

// Consultation : SUPERADMIN et ADMIN
router.get('/', requireRole('SUPERADMIN', 'ADMIN'), usersController.lister);
router.get('/:id', requireRole('SUPERADMIN', 'ADMIN'), usersController.recuperer);

// Écriture : SUPERADMIN uniquement (l'ADMIN ne crée pas d'utilisateurs)
router.post('/', requireRole('SUPERADMIN'), validate(creerUtilisateurSchema), usersController.creer);
router.put(
  '/:id',
  requireRole('SUPERADMIN'),
  validate(modifierUtilisateurSchema),
  usersController.modifier
);
router.patch(
  '/:id/status',
  requireRole('SUPERADMIN'),
  validate(changerStatutUtilisateurSchema),
  usersController.changerStatut
);

module.exports = router;
