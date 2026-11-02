const db = require('../config/db');
const { recordAuditLog } = require('../utils/auditLogger');

/**
 * Create a new booking request with priority-based queueing and overlap prevention
 */
async function createBooking(req, res) {
  const client = await db.pool.connect();
  try {
    const { assetId, startTime, endTime, purpose } = req.body;
    const userId = req.user.id;

    if (!assetId || !startTime || !endTime) {
      return res.status(400).json({ error: 'assetId, startTime, and endTime are required.' });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    await client.query('BEGIN');

    // 1. Verify Asset existence and status
    const assetRes = await client.query('SELECT * FROM assets WHERE id = $1 FOR UPDATE', [assetId]);
    if (assetRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found.' });
    }
    const asset = assetRes.rows[0];
    if (asset.status !== 'AVAILABLE') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Asset is currently ${asset.status} and cannot be booked.` });
    }

    // 2. Check user quota limits and active bookings count
    const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const user = userRes.rows[0];

    if (user.current_active_bookings >= user.quota_limit) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User has reached maximum active quota limit for bookings.' });
    }

    // 3. Check for time slot conflicts with existing approved/pending bookings
    const conflictRes = await client.query(
      `SELECT * FROM bookings 
       WHERE asset_id = $1 
       AND status IN ('PENDING', 'APPROVED')
       AND NOT (end_time <= $2 OR start_time >= $3)`,
      [assetId, startTime, endTime]
    );

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'Time slot conflict: The asset is already booked or requested for this period.' 
      });
    }

    // 4. Insert booking record
    const insertBookingQuery = `
      INSERT INTO bookings (user_id, asset_id, start_time, end_time, status, priority_tier, purpose)
      VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)
      RETURNING *;
    `;
    const bookingRes = await client.query(insertBookingQuery, [
      userId,
      assetId,
      startTime,
      endTime,
      user.role === 'Admin' || user.role === 'Manager' ? 2 : 1, // Higher priority for admin/manager
      purpose || ''
    ]);

    const createdBooking = bookingRes.rows[0];

    // 5. Update user's active booking count
    await client.query(
      'UPDATE users SET current_active_bookings = current_active_bookings + 1 WHERE id = $1',
      [userId]
    );

    await client.query('COMMIT');

    // 6. Record audit log
    await recordAuditLog({
      eventType: 'BOOKING_CREATED',
      actorId: userId,
      entityName: 'bookings',
      entityId: createdBooking.id,
      payload: {
        assetId,
        startTime,
        endTime,
        priorityTier: createdBooking.priority_tier
      }
    });

    return res.status(201).json({
      message: 'Booking request submitted successfully.',
      booking: createdBooking
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create booking error:', error);
    return res.status(500).json({ error: 'Failed to create booking request.' });
  } finally {
    client.release();
  }
}

/**
 * List bookings for the authenticated user or all for admins
 */
async function listBookings(req, res) {
  try {
    const { status, assetId } = req.query;
    let query = `
      SELECT b.*, a.name as asset_name, a.asset_tag, u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN assets a ON b.asset_id = a.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Non-admin users can only view their own bookings
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      params.push(req.user.id);
      query += ` AND b.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    if (assetId) {
      params.push(assetId);
      query += ` AND b.asset_id = $${params.length}`;
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await db.query(query, params);
    return res.json({ bookings: result.rows });
  } catch (error) {
    console.error('List bookings error:', error);
    return res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
}

/**
 * Update booking status (Approved / Rejected / Completed) - Admin/Manager
 */
async function updateBookingStatus(req, res) {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g., APPROVED, REJECTED, COMPLETED

    if (!['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    await client.query('BEGIN');

    const bookingRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];

    // If cancelling or rejecting an active/approved booking, decrement user active count
    if ((status === 'REJECTED' || status === 'CANCELLED' || status === 'COMPLETED') && booking.status === 'APPROVED') {
      await client.query(
        'UPDATE users SET current_active_bookings = GREATEST(0, current_active_bookings - 1) WHERE id = $1',
        [booking.user_id]
      );
    }

    const updatedRes = await client.query(
      `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    await client.query('COMMIT');

    await recordAuditLog({
      eventType: 'BOOKING_STATUS_UPDATED',
      actorId: req.user.id,
      entityName: 'bookings',
      entityId: id,
      payload: { previousStatus: booking.status, newStatus: status }
    });

    return res.json({
      message: `Booking status updated to ${status}.`,
      booking: updatedRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update booking status error:', error);
    return res.status(500).json({ error: 'Failed to update booking status.' });
  } finally {
    client.release();
  }
}

module.exports = {
  createBooking,
  listBookings,
  updateBookingStatus,
};