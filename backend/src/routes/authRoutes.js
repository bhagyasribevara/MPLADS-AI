/**
 * Authentication Routes
 * Mounted at /api/auth
 */

const express = require('express');
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authenticateJWT, authController.getProfile);

module.exports = router;
