const express = require('express');
const pool = require('../db/client');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments (get all departments)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json(result.rows.map(r => r.name));
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
