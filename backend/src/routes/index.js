const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fce-si-api',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./usersRoutes'));
router.use('/', require('./referenceRoutes'));
router.use('/billets', require('./billetsRoutes'));
router.use('/', require('./marchandisesRoutes'));
router.use('/locations', require('./locationsRoutes'));
router.use('/clients', require('./clientsRoutes'));
router.use('/journal', require('./journalRoutes'));
router.use('/', require('./documentsRoutes'));
router.use('/', require('./dashboardRoutes'));

module.exports = router;
