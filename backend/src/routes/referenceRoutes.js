const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const referenceController = require('../controllers/referenceController');

router.use(requireAuth);

router.get('/gares', referenceController.listerGares);
router.get('/zones', referenceController.listerZones);
router.get('/arrets', referenceController.listerArrets);
router.get('/tarifs/billets', referenceController.listerTarifsBillet);
router.get('/tarifs/locations', referenceController.listerTarifsLocation);
router.get('/trains', referenceController.listerTrains);
router.get('/voitures', referenceController.listerVoitures);
router.get('/wagons', referenceController.listerWagons);

// Paramètres système : SUPERADMIN uniquement
router.get('/parametres', requireRole('SUPERADMIN'), referenceController.listerParametres);

module.exports = router;
