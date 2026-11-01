const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_sharehub_jwt_key_2026_hackathon';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { name, email, password, role = 'Student', department } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ error: 'Name, email, password, and department are required.' });
    }

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, department, quota_limit, current_active_bookings, created_at`,
      [name, email.toLowerCase(), passwordHash, role, department]
    );

    const newUser = result.rows[0];
    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

/**
 * User login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userRes = await db.query(
      'SELECT id, name, email, password_hash, role, department, quota_limit, current_active_bookings, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Strip password hash from returned object
    delete user.password_hash;

    return res.json({
      message: 'Login successful',
      user,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

/**
 * Get current user profile and valid certifications
 */
async function getProfile(req, res) {
  try {
    const certsRes = await db.query(
      `SELECT p.id, p.code, p.name, uc.expires_at, uc.is_valid
       FROM user_certifications uc
       JOIN prerequisites p ON uc.prerequisite_id = p.id
       WHERE uc.user_id = $1 AND uc.is_valid = true AND uc.expires_at > NOW()`,
      [req.user.id]
    );

    return res.json({
      user: req.user,
      certifications: certsRes.rows,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error fetching profile.' });
  }
}

module.exports = {
  register,
  login,
  getProfile,
};
