const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_sharehub_jwt_key_2026_hackathon';

/**
 * Authenticate incoming request via Authorization: Bearer <token>
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied: No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Validate that user is still active in DB
    const userRes = await db.query(
      'SELECT id, name, email, role, department, quota_limit, current_active_bookings FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User does not exist or has been deactivated.' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles - e.g. 'Admin', 'Manager', 'Auditor'
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Action requires one of [${allowedRoles.join(', ')}]. Current role: ${req.user.role}.`,
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles,
};
