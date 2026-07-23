const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { breakerOperationsReport } = require('../controllers/reports.controller');

const router = express.Router();

router.get('/breaker-operations', authenticate, authorize(['operator', 'engineer', 'admin']), breakerOperationsReport);

module.exports = router;
