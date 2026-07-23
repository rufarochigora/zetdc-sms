const express = require('express');
const authenticate = require('../middleware/authenticate');
const { listSites, getSite } = require('../controllers/sites.controller');

const router = express.Router();

router.get('/', authenticate, listSites);
router.get('/:id', authenticate, getSite);

module.exports = router;
