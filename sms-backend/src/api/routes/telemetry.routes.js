const express = require('express');
const authenticate = require('../middleware/authenticate');
const { getReadings } = require('../controllers/telemetry.controller');

// Mounted at /api/sites, so the full path is GET /api/sites/:id/readings
const router = express.Router({ mergeParams: true });

router.get('/:id/readings', authenticate, getReadings);

module.exports = router;
