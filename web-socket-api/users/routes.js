const router = require('express').Router();
const UserController = require('./controller');
const { check } = require('../common/middlewares/IsAuthenticated');

router.get('/', check, UserController.getUser);
router.get('/all', check, UserController.getAllUsers);
// test comment

module.exports = router; 