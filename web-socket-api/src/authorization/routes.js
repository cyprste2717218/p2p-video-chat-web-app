const router = require('express').Router();
const AuthController = require('./controller');
const { check } = require('../common/middlewares/IsAuthenticated');

router.post('/signup', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', check, AuthController.logout);
router.post('/refresh', check, AuthController.refresh);

module.exports = router;