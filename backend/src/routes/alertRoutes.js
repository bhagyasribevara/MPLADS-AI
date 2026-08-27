/**
 * Alert Routes
 * Mounted at /api/alerts
 */

const express = require('express');
const alertController = require('../controllers/alertController');
const { authenticateJWT, authorizeRoles, jurisdictionScope } = require('../middleware/auth');

const router = express.Router();

// GET /api/alerts - List open/investigating/resolved fraud alerts
router.get('/', authenticateJWT, jurisdictionScope, alertController.getAlerts);

// PUT /api/alerts/:id/status - Update alert status (Collector, State Nodal, Ministry)
router.put(
  '/:id/status',
  authenticateJWT,
  authorizeRoles('DISTRICT_COLLECTOR', 'STATE_NODAL', 'MINISTRY'),
  alertController.updateAlertStatus
);

module.exports = router;
