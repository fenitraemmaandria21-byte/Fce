const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const { creerBranSchema, creerRfeSchema } = require('../validators/documentValidators');
const documentsController = require('../controllers/documentsController');

router.use(requireAuth);

// BRAN
router.get('/bran', documentsController.listerBran);
router.get('/bran/:id', documentsController.recupererBran);
router.post(
  '/bran',
  requireRole('SUPERADMIN', 'ADMIN'),
  validate(creerBranSchema),
  documentsController.creerBran
);

// RFE (facturation LOCATION)
router.get('/rfe', documentsController.listerRfe);
router.get('/rfe/:id', documentsController.recupererRfe);
router.post(
  '/rfe',
  requireRole('SUPERADMIN', 'ADMIN'),
  validate(creerRfeSchema),
  documentsController.creerRfe
);

module.exports = router;
