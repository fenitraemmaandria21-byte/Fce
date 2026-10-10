const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const {
  creerEnvoiSchema,
  modifierEnvoiSchema,
  creerArrivageSchema,
  modifierArrivageSchema,
} = require('../validators/marchandiseValidators');
const ctrl = require('../controllers/marchandisesController');

router.use(requireAuth);

// Envois
router.get('/marchandises', ctrl.listerEnvois);
router.get('/marchandises/:id', ctrl.recupererEnvoi);
router.post('/marchandises', validate(creerEnvoiSchema), ctrl.creerEnvoi);
router.put(
  '/marchandises/:id',
  requireRole('SUPERADMIN', 'ADMIN'),
  validate(modifierEnvoiSchema),
  ctrl.modifierEnvoi
);
router.delete('/marchandises/:id', requireRole('SUPERADMIN', 'ADMIN'), ctrl.supprimerEnvoi);

// Arrivages
router.get('/arrivages', ctrl.listerArrivages);
router.get('/arrivages/:id', ctrl.recupererArrivage);
router.post('/arrivages', validate(creerArrivageSchema), ctrl.creerArrivage);
router.put(
  '/arrivages/:id',
  requireRole('SUPERADMIN', 'ADMIN'),
  validate(modifierArrivageSchema),
  ctrl.modifierArrivage
);
router.delete('/arrivages/:id', requireRole('SUPERADMIN', 'ADMIN'), ctrl.supprimerArrivage);

module.exports = router;
