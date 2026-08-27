/**
 * Authentication & Role-Based Access Control (RBAC) Middleware
 * Verifies JWT tokens, enforces role privileges, and manages jurisdiction scoping.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');

/**
 * Verifies passwords against PBKDF2-SHA256 (used by Phase 1 seeders) or standard bcrypt.
 */
function verifyPassword(plainPassword, storedHash) {
  if (!storedHash) return false;

  // 1. PBKDF2-SHA256 format: pbkdf2_sha256$iterations$salt$hash
  if (storedHash.startsWith('pbkdf2_sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedHash = parts[3];
      const computedHash = crypto
        .pbkdf2Sync(plainPassword, salt, iterations, 32, 'sha256')
        .toString('hex');
      return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash));
    }
  }

  // 2. Standard bcrypt format ($2a$ or $2b$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compareSync(plainPassword, storedHash);
  }

  // 3. Direct SHA256 fallback
  const sha256Hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
  return sha256Hash === storedHash;
}

/**
 * Hashes passwords using standard PBKDF2-SHA256.
 */
function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const hash = crypto
    .pbkdf2Sync(plainPassword, salt, iterations, 32, 'sha256')
    .toString('hex');
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

/**
 * JWT Authentication Middleware
 * Extracts token from Authorization header and attaches decoded user to req.user.
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid Authorization Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Expired or invalid JWT token.',
      details: err.message,
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Guard
 * Ensures only users with specified roles can access the route.
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User role information missing in token.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access restricted. Required role(s): [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

/**
 * Jurisdiction Scoping Middleware
 * Populates req.jurisdictionScope based on the authenticated user's role.
 */
function jurisdictionScope(req, res, next) {
  if (!req.user) {
    req.jurisdictionScope = { isNational: true };
    return next();
  }

  const { role, state, district, constituency_id } = req.user;

  switch (role) {
    case 'MINISTRY':
    case 'CITIZEN':
      req.jurisdictionScope = { isNational: true };
      break;
    case 'STATE_NODAL':
      req.jurisdictionScope = { state, isNational: false };
      break;
    case 'DISTRICT_COLLECTOR':
      req.jurisdictionScope = { state, district, isNational: false };
      break;
    case 'MP':
      req.jurisdictionScope = { constituencyId: constituency_id, isNational: false };
      break;
    case 'AGENCY':
      req.jurisdictionScope = { state, district, isNational: false };
      break;
    default:
      req.jurisdictionScope = { isNational: true };
  }

  next();
}

module.exports = {
  verifyPassword,
  hashPassword,
  authenticateJWT,
  authorizeRoles,
  jurisdictionScope,
};
