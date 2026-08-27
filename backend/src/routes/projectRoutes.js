/**
 * Project Routes
 * Mounted at /api/projects
 */

const express = require('express');
const projectController = require('../controllers/projectController');
const { authenticateJWT, authorizeRoles, jurisdictionScope } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - View projects with RBAC scoping and filters
router.get('/', authenticateJWT, jurisdictionScope, projectController.getProjects);

// POST /api/projects - Submit recommendation (Only MP, Ministry, District Collector)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('MP', 'MINISTRY', 'DISTRICT_COLLECTOR', 'AGENCY'),
  projectController.createProject
);

// GET /api/projects/:id - Detailed project ledger, contractor, and anomaly logs
router.get('/:id', authenticateJWT, projectController.getProjectById);

module.exports = router;
