/**
 * Authentication Controller
 * Handles user login with dual PBKDF2/bcrypt verification, user registration, and profile lookup.
 */

const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config');
const { verifyPassword, hashPassword } = require('../middleware/auth');

const authController = {
  /**
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required.',
        });
      }

      const userResult = await db.query(
        `SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.state, u.district, 
                u.constituency_id, c.name AS constituency_name, u.created_at
         FROM users u
         LEFT JOIN constituencies c ON u.constituency_id = c.id
         WHERE LOWER(u.email) = LOWER($1);`,
        [email.trim()]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials: user not found.',
        });
      }

      const user = userResult.rows[0];
      const isMatch = verifyPassword(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials: password incorrect.',
        });
      }

      const payload = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        state: user.state,
        district: user.district,
        constituency_id: user.constituency_id,
        constituency_name: user.constituency_name,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        token,
        user: payload,
      });
    } catch (err) {
      console.error('[Auth Login Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed due to an internal error.',
        details: err.message,
      });
    }
  },

  /**
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { email, password, full_name, role, state, district, constituency_id } = req.body;

      if (!email || !password || !full_name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and full_name are required.',
        });
      }

      // Default role to CITIZEN if not specified
      const assignedRole = role ? role.toUpperCase() : 'CITIZEN';
      const validRoles = ['MINISTRY', 'STATE_NODAL', 'DISTRICT_COLLECTOR', 'MP', 'AGENCY', 'CITIZEN'];

      if (!validRoles.includes(assignedRole)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role specified. Valid roles are: ${validRoles.join(', ')}`,
        });
      }

      // Check if user already exists
      const checkResult = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1);', [email.trim()]);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'A user with this email address already exists.',
        });
      }

      const hashedPassword = hashPassword(password);

      const insertResult = await db.query(
        `INSERT INTO users (full_name, email, password_hash, role, state, district, constituency_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, full_name, email, role, state, district, constituency_id, created_at;`,
        [full_name.trim(), email.trim().toLowerCase(), hashedPassword, assignedRole, state || null, district || null, constituency_id || null]
      );

      const newUser = insertResult.rows[0];

      const token = jwt.sign(
        {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          state: newUser.state,
          district: newUser.district,
          constituency_id: newUser.constituency_id,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        token,
        user: newUser,
      });
    } catch (err) {
      console.error('[Auth Register Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'User registration failed.',
        details: err.message,
      });
    }
  },

  /**
   * GET /api/auth/me
   */
  async getProfile(req, res) {
    try {
      const userResult = await db.query(
        `SELECT u.id, u.full_name, u.email, u.role, u.state, u.district, 
                u.constituency_id, c.name AS constituency_name, u.created_at
         FROM users u
         LEFT JOIN constituencies c ON u.constituency_id = c.id
         WHERE u.id = $1;`,
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User profile not found.',
        });
      }

      return res.status(200).json({
        success: true,
        user: userResult.rows[0],
      });
    } catch (err) {
      console.error('[Auth Profile Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user profile.',
        details: err.message,
      });
    }
  },
};

module.exports = authController;
