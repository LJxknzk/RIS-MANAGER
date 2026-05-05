const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/client');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ris_secret_key_2026';
const TOKEN_EXPIRY = '7d';

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/logout (optional—JWT is stateless)
router.post('/logout', (req, res) => {
  // With JWT, logout happens on the client side (delete token)
  res.json({ message: 'Logged out' });
});

// POST /auth/refresh-token (refresh expired token)
router.post('/refresh-token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role, email: decoded.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
