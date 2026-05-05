const express = require('express');
const pool = require('../db/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/inventory (get all inventory items)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, item_id, item_name, stock_number, quantity, updated_at
      FROM inventory
      ORDER BY stock_number
    `);

    // Convert to object format { itemId: quantity, ... }
    const inventory = {};
    result.rows.forEach(row => {
      inventory[row.item_id] = row.quantity;
    });

    res.json(inventory);
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/items (get inventory with item details)
router.get('/items', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, item_id, item_name, stock_number, quantity, updated_at
      FROM inventory
      ORDER BY stock_number
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get inventory items error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST /api/inventory/restock (admin only—add stock)
router.post('/restock', verifyToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { itemId, quantity, notes } = req.body;

    if (!itemId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid itemId and positive quantity required' });
    }

    await client.query('BEGIN');

    // Get current stock
    const currentResult = await client.query('SELECT quantity, item_name FROM inventory WHERE item_id = $1', [itemId]);
    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentStock = currentResult.rows[0].quantity;
    const itemName = currentResult.rows[0].item_name;
    const newStock = currentStock + quantity;

    // Update inventory
    await client.query('UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE item_id = $2', [newStock, itemId]);

    // Record in stock history
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    await client.query(
      `INSERT INTO stock_history (item_id, item_name, quantity, action, previous_stock, new_stock, notes, date, time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [itemId, itemName, quantity, 'restock', currentStock, newStock, notes || '', today, time]
    );

    await client.query('COMMIT');

    res.json({
      itemId,
      previousStock: currentStock,
      newStock,
      quantityAdded: quantity,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Restock error:', err);
    res.status(500).json({ error: 'Failed to restock item' });
  } finally {
    client.release();
  }
});

// GET /api/inventory/history (admin only—get stock history)
router.get('/history', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, item_id, item_name, quantity, action, previous_stock, new_stock, notes, date, time
      FROM stock_history
      ORDER BY date DESC, time DESC
      LIMIT 1000
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get stock history error:', err);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
});

// GET /api/inventory/released-items (admin only—get all released items with stock records)
router.get('/released-items', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sh.id,
        sh.item_id,
        sh.item_name,
        sh.quantity,
        sh.action,
        sh.previous_stock,
        sh.new_stock,
        sh.notes,
        sh.date,
        sh.time,
        inv.quantity as current_stock
      FROM stock_history sh
      LEFT JOIN inventory inv ON sh.item_id = inv.item_id
      WHERE sh.action = 'release' OR sh.action = 'release_failed'
      ORDER BY sh.date DESC, sh.time DESC
      LIMIT 1000
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get released items error:', err);
    res.status(500).json({ error: 'Failed to fetch released items' });
  }
});

module.exports = router;
