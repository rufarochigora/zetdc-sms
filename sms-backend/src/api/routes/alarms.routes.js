const express = require('express');
const authenticate = require('../middleware/authenticate');
const { listAlarms, acknowledgeAlarm, clearAlarm } = require('../controllers/alarms.controller');

const router = express.Router();

router.get('/', authenticate, listAlarms);
router.post('/:id/acknowledge', authenticate, acknowledgeAlarm);
router.post('/:id/clear', authenticate, clearAlarm);

module.exports = router;
