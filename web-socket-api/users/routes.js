const router = require('express').Router();
const UserController = require('./controller');
const { check } = require('../common/middlewares/isAuthenticated.js');

router.get('/', check, UserController.getUser);
router.get('/all', check, UserController.getAllUsers);

module.exports = router;