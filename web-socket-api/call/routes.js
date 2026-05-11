const router = require('express').Router();
const CallController = require('./controller');

router.post('/create', CallController.createCall);
router.put('/join/:callId', CallController.joinCall);
router.put('/leave/:callId', CallController.leaveCall);

module.exports = router;