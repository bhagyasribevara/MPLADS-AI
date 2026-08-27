/**
 * Analytics Routes
 * Mounted at /api/analytics
 */

const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics - Macro KPIs & regional statistics (Accessible to all authenticated roles & public transparency)
router.get('/', analyticsController.getMacroMetrics);

// GET /api/analytics/geojson - GeoJSON FeatureCollection for Leaflet interactive map
router.get('/geojson', analyticsController.getProjectsGeoJSON);

module.exports = router;
