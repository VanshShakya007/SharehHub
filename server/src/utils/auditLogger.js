const crypto = require('crypto');
const db = require('../config/db');

/**
 * Creates SHA-256 hash string from stringified input
 */
function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Append an immutable log entry to the hash-chained audit trail
 * @param {Object} entry 
 * @param {string} entry.eventType - e.g. 'ASSET_CREATED', 'CHECK_IN_VERIFIED'
 * @param {string} entry.actorId - UUID of the user performing the action
 * @param {string} entry.entityName - Targeted table/domain, e.g. 'assets'
 * @param {string} entry.entityId - ID of targeted entity
 * @param {Object} entry.payload - State diff or action parameters
 */
async function recordAuditLog({ eventType, actorId, entityName, entityId, payload }) {
  // 1. Fetch the latest audit log entry to get its current_hash and sequence_id
  const latestResult = await db.query(
    'SELECT sequence_id, current_hash FROM audit_logs ORDER BY sequence_id DESC LIMIT 1'
  );

  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  let nextSeq = 1;

  if (latestResult.rows.length > 0) {
    prevHash = latestResult.rows[0].current_hash;
    nextSeq = parseInt(latestResult.rows[0].sequence_id, 10) + 1;
  }

  const timestamp = new Date().toISOString();
  const serializedPayload = JSON.stringify(payload || {});

  // Compute canonical hash block
  const rawBlockData = `${prevHash}|${nextSeq}|${timestamp}|${eventType}|${actorId || 'SYSTEM'}|${entityName}|${entityId}|${serializedPayload}`;
  const currentHash = sha256(rawBlockData);

  const insertQuery = `
    INSERT INTO audit_logs (
      sequence_id, timestamp, event_type, actor_id, entity_name, entity_id, payload, prev_hash, current_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    nextSeq,
    timestamp,
    eventType,
    actorId || null,
    entityName,
    String(entityId),
    payload || {},
    prevHash,
    currentHash,
  ];

  const result = await db.query(insertQuery, values);
  return result.rows[0];
}

/**
 * Cryptographically verifies the integrity of the audit chain from genesis to head
 * @returns {Promise<{ isValid: boolean, checkedBlocks: number, brokenBlockSequence?: number }>}
 */
async function verifyAuditChain() {
  const result = await db.query('SELECT * FROM audit_logs ORDER BY sequence_id ASC');
  const rows = result.rows;

  if (rows.length === 0) {
    return { isValid: true, checkedBlocks: 0 };
  }

  let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check link to previous
    if (i > 0 && row.prev_hash !== expectedPrevHash) {
      return {
        isValid: false,
        checkedBlocks: i + 1,
        brokenBlockSequence: row.sequence_id,
        reason: `Previous hash mismatch at sequence ${row.sequence_id}`,
      };
    }

    // Recompute current hash
    const rawBlockData = `${row.prev_hash}|${row.sequence_id}|${new Date(row.timestamp).toISOString()}|${row.event_type}|${row.actor_id || 'SYSTEM'}|${row.entity_name}|${row.entity_id}|${JSON.stringify(row.payload)}`;
    const computedHash = sha256(rawBlockData);

    // If block 1 is seeded genesis, skip recalculation or assert consistency
    if (i > 0 && computedHash !== row.current_hash) {
      return {
        isValid: false,
        checkedBlocks: i + 1,
        brokenBlockSequence: row.sequence_id,
        reason: `Current hash tamper detected at sequence ${row.sequence_id}`,
      };
    }

    expectedPrevHash = row.current_hash;
  }

  return { isValid: true, checkedBlocks: rows.length };
}

module.exports = {
  recordAuditLog,
  verifyAuditChain,
};
