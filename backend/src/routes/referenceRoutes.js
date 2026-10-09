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

// Écritures dans le référentiel : SUPERADMIN uniquement
router.put('/gares/:id', requireRole('SUPERADMIN'), referenceController.modifierGare);
router.delete('/gares/:id', requireRole('SUPERADMIN'), referenceController.supprimerGare);
router.put('/arrets/:id', requireRole('SUPERADMIN'), referenceController.modifierArret);
router.delete('/arrets/:id', requireRole('SUPERADMIN'), referenceController.supprimerArret);
router.put('/tarifs/billets/:id', requireRole('SUPERADMIN'), referenceController.modifierTarifBillet);
router.delete('/tarifs/billets/:id', requireRole('SUPERADMIN'), referenceController.supprimerTarifBillet);
router.put('/tarifs/locations/:id', requireRole('SUPERADMIN'), referenceController.modifierTarifLocation);
router.delete('/tarifs/locations/:id', requireRole('SUPERADMIN'), referenceController.supprimerTarifLocation);
router.put('/trains/:id', requireRole('SUPERADMIN'), referenceController.modifierTrain);
router.delete('/trains/:id', requireRole('SUPERADMIN'), referenceController.supprimerTrain);
router.put('/voitures/:id', requireRole('SUPERADMIN'), referenceController.modifierVoiture);
router.delete('/voitures/:id', requireRole('SUPERADMIN'), referenceController.supprimerVoiture);
router.put('/wagons/:id', requireRole('SUPERADMIN'), referenceController.modifierWagon);
router.delete('/wagons/:id', requireRole('SUPERADMIN'), referenceController.supprimerWagon);

// Paramètres système : SUPERADMIN uniquement
router.get('/parametres', requireRole('SUPERADMIN'), referenceController.listerParametres);
router.put('/parametres/:cle', requireRole('SUPERADMIN'), referenceController.modifierParametre);
router.delete('/parametres/:cle', requireRole('SUPERADMIN'), referenceController.supprimerParametre);

module.exports = router;
