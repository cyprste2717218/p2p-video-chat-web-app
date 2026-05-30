const router = require('express').Router();
const CallController = require('./controller');
const { check } = require('../common/middlewares/IsAuthenticated');

router.post('/create', check, CallController.createCall);
router.put('/:callID/join', check, CallController.joinCall);
router.put('/:callID/leave', check, CallController.leaveCall);

module.exports = router;