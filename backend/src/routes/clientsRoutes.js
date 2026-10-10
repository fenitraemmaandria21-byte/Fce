const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const {
  creerClientSchema,
  modifierClientSchema,
} = require('../validators/clientValidators');
const clientsController = require('../controllers/clientsController');

router.use(requireAuth);

// Liste des clients : tous les utilisateurs authentifiés.
router.get('/', clientsController.lister);

// Fiche détaillée : tous les utilisateurs authentifiés.
router.get('/:id', clientsController.recuperer);

// Création : SUPERADMIN, ADMIN, AGENT (les agents enregistrent des locations).
router.post('/', requireRole('SUPERADMIN', 'ADMIN', 'AGENT'), validate(creerClientSchema), clientsController.creer);

// Modification : SUPERADMIN et ADMIN.
router.put('/:id', requireRole('SUPERADMIN', 'ADMIN'), validate(modifierClientSchema), clientsController.modifier);

// Suppression (client sans location) : SUPERADMIN et ADMIN.
router.delete('/:id', requireRole('SUPERADMIN', 'ADMIN'), clientsController.supprimer);

module.exports = router;