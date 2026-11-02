const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// All booking routes require authentication
router.use(authenticateToken);

// Create a new booking request
router.post('/', bookingController.createBooking);

// List bookings (user-specific for normal users, all for admins/managers)
router.get('/', bookingController.listBookings);

// Update booking status (Approve / Reject / Complete) - Admin/Manager only
router.patch('/:id/status', requireRoles('Admin', 'Manager'), bookingController.updateBookingStatus);

module.exports = router;