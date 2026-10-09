const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { loginSchema } = require('../validators/authValidators');
const authController = require('../controllers/authController');

router.post('/login', validate(loginSchema), authController.login);
router.get('/me', requireAuth, authController.me);

router.post('/logout', requireAuth, authController.logout);

module.exports = router;
