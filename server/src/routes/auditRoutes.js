const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyAuditChain } = require('../utils/auditLogger');
const { authenticateToken, requireRoles } = require('../middleware/auth');

/**
 * GET /api/audit
 * Fetch recent audit log blocks
 */
router.get('/', authenticateToken, requireRoles('Admin', 'Auditor', 'Manager'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const result = await db.query(
      `SELECT a.*, u.name as actor_name, u.email as actor_email, u.role as actor_role
       FROM audit_logs a
       LEFT JOIN users u ON a.actor_id = u.id
       ORDER BY a.sequence_id DESC
       LIMIT $1`,
      [limit]
    );

    return res.json({ logs: result.rows });
  } catch (err) {
    console.error('Audit log fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve audit trail.' });
  }
});

/**
 * GET /api/audit/verify
 * Cryptographically verify integrity of entire SHA-256 chain
 */
router.get('/verify', authenticateToken, requireRoles('Admin', 'Auditor'), async (req, res) => {
  try {
    const verification = await verifyAuditChain();
    return res.json(verification);
  } catch (err) {
    console.error('Audit verification error:', err);
    return res.status(500).json({ error: 'Audit chain verification encountered an error.' });
  }
});

module.exports = router;
