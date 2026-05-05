const express = require('express');
const pool = require('../db/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users (admin only—get all users)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, department, designation, created_at FROM users ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/me (get current user info)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, department, designation FROM users WHERE id = $1', [
      req.userId,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users/:id (get user by ID)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, name, email, role, department, designation FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
