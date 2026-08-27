/**
 * Milestone Routes
 * Mounted at /api/milestones
 */

const express = require('express');
const multer = require('multer');
const milestoneController = require('../controllers/milestoneController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max image size
});

// POST /api/milestones - Agency uploads progress & photo (Calls ML perceptual hashing)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('AGENCY', 'DISTRICT_COLLECTOR', 'MINISTRY'),
  upload.single('image_file'),
  milestoneController.createMilestone
);

// PUT /api/milestones/:id/verify - Only District Collector or Ministry can verify
router.put(
  '/:id/verify',
  authenticateJWT,
  authorizeRoles('DISTRICT_COLLECTOR', 'MINISTRY'),
  milestoneController.verifyMilestone
);

module.exports = router;
