const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { loginSchema, amorcageSchema } = require('../validators/authValidators');
const authController = require('../controllers/authController');

router.post('/login', validate(loginSchema), authController.login);
router.get('/me', requireAuth, authController.me);

// Amorçage : création du premier superadmin (aucun utilisateur en base).
router.get('/bootstrap/status', authController.statutAmorcage);
router.post('/bootstrap', validate(amorcageSchema), authController.amorcer);

router.post('/logout', requireAuth, authController.logout);

module.exports = router;
