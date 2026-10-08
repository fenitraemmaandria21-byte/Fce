const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const {
  creerEnvoiSchema,
  modifierEnvoiSchema,
  creerArrivageSchema,
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

// Arrivages
router.get('/arrivages', ctrl.listerArrivages);
router.get('/arrivages/:id', ctrl.recupererArrivage);
router.post('/arrivages', validate(creerArrivageSchema), ctrl.creerArrivage);

module.exports = router;
