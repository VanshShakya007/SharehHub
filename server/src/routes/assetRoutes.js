const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Optional auth helper to annotate eligibility without failing guest views
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_sharehub_jwt_key_2026_hackathon');
    const userRes = await db.query(
      'SELECT id, name, email, role, department, quota_limit, current_active_bookings FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    if (userRes.rows.length > 0) {
      req.user = userRes.rows[0];
    }
  } catch (e) {
    // ignore invalid token for optional auth
  }
  next();
}

// Public / Authenticated catalog reading
router.get('/', optionalAuth, assetController.listAssets);
router.get('/:id', optionalAuth, assetController.getAsset);

// Restricted asset governance operations (Manager, Admin)
router.post('/', authenticateToken, requireRoles('Admin', 'Manager'), assetController.createAsset);
router.patch('/:id', authenticateToken, requireRoles('Admin', 'Manager'), assetController.updateAsset);

module.exports = router;
