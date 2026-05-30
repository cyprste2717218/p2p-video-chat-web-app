const router = require('express').Router();
const CallController = require('./controller');
const { check } = require('../common/middlewares/IsAuthenticated');

router.post('/create', check, CallController.createCall);
router.put('/join/:callId', check, CallController.joinCall);
router.put('/leave/:callId', check, CallController.leaveCall);

module.exports = router;