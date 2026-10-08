const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

router.use(requireAuth);

router.get('/dashboard', dashboardController.tableauDeBord);

router.get('/statistiques/billetterie', dashboardController.statsBilletterie);
router.get('/statistiques/marchandises', dashboardController.statsMarchandises);
router.get('/statistiques/arrivages', dashboardController.statsArrivages);
router.get('/statistiques/location', dashboardController.statsLocation);
router.get('/statistiques/recettes', dashboardController.statsRecettes);

module.exports = router;
