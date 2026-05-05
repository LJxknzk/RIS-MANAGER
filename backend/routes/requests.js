const express = require('express');
const pool = require('../db/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper: Get next control number for a department
const getNextControlNumber = async (department, requestYear) => {
  const query = `
    SELECT COALESCE(MAX(control_number), 0) + 1 as next_number
    FROM ris_requests
    WHERE department = $1 AND request_year = $2
  `;
  const result = await pool.query(query, [department, requestYear]);
  return result.rows[0].next_number;
};

// Helper: Get next RIS number (global)
const getNextRISNumber = async () => {
  const query = `
    SELECT COALESCE(MAX(ris_number), 0) + 1 as next_number
    FROM ris_requests
    WHERE ris_number IS NOT NULL
  `;
  const result = await pool.query(query);
  return result.rows[0].next_number;
};

// POST /api/requests (create new request)
router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      requestType,
      items, // array of { itemId, quantity }
      requesterName,
      requesterDesignation,
      approverName,
      approverDesignation,
    } = req.body;

    const user = await client.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = user.rows[0];
    const requestYear = new Date().getFullYear();
    const requestDate = new Date().toISOString().split('T')[0];
    const controlNumber = await getNextControlNumber(userData.department, requestYear);

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item required' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Insert request
    const insertRequest = await client.query(
      `INSERT INTO ris_requests (
        user_id, control_number, department, request_type, status, request_date, request_year,
        requester_name, requester_designation, approver_name, approver_designation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        req.userId,
        controlNumber,
        userData.department,
        requestType,
        'pending',
        requestDate,
        requestYear,
        requesterName,
        requesterDesignation,
        approverName,
        approverDesignation,
      ]
    );

    const requestId = insertRequest.rows[0].id;

    // Insert request items
    for (const item of items) {
      await client.query(
        'INSERT INTO request_items (request_id, item_id, quantity) VALUES ($1, $2, $3)',
        [requestId, item.itemId, item.quantity]
      );
    }

    await client.query('COMMIT');

    const newRequest = insertRequest.rows[0];
    const itemsResult = await pool.query('SELECT * FROM request_items WHERE request_id = $1', [requestId]);

    res.status(201).json({
      ...newRequest,
      items: itemsResult.rows,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  } finally {
    client.release();
  }
});

// GET /api/requests (get all requests or filter by department)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { department } = req.query;

    let query = `
      SELECT r.*, 
        json_agg(json_build_object('id', ri.id, 'itemId', ri.item_id, 'quantity', ri.quantity)) as items,
        json_agg(json_build_object('id', ii.id, 'itemId', ii.item_id, 'quantity', ii.quantity)) FILTER (WHERE ii.id IS NOT NULL) as issued_items
      FROM ris_requests r
      LEFT JOIN request_items ri ON r.id = ri.request_id
      LEFT JOIN issued_items ii ON r.id = ii.request_id
    `;

    const params = [];

    if (req.userRole !== 'admin' && !department) {
      // Non-admin users only see their own department's requests
      query += ' WHERE r.department = $1';
      const user = await pool.query('SELECT department FROM users WHERE id = $1', [req.userId]);
      params.push(user.rows[0].department);
    } else if (department) {
      query += ' WHERE r.department = $1';
      params.push(department);
    }

    query += ' GROUP BY r.id ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows.map(r => ({
      ...r,
      items: (r.items && r.items[0]?.itemId) ? r.items : [],
      issuedItems: (r.issued_items && r.issued_items[0]?.itemId) ? r.issued_items : [],
    })));
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/requests/:id (get single request)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const requestResult = await pool.query(
      `SELECT r.*, 
        json_agg(json_build_object('id', ri.id, 'itemId', ri.item_id, 'quantity', ri.quantity)) as items
      FROM ris_requests r
      LEFT JOIN request_items ri ON r.id = ri.request_id
      WHERE r.id = $1
      GROUP BY r.id`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const issuedResult = await pool.query('SELECT * FROM issued_items WHERE request_id = $1', [id]);

    res.json({
      ...requestResult.rows[0],
      items: requestResult.rows[0].items && requestResult.rows[0].items[0]?.itemId ? requestResult.rows[0].items : [],
      issuedItems: issuedResult.rows.map(i => ({ id: i.id, itemId: i.item_id, quantity: i.quantity })),
    });
  } catch (err) {
    console.error('Get request error:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// PUT /api/requests/:id (admin only—update request)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { items } = req.body;

    const requestResult = await client.query('SELECT * FROM ris_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await client.query('BEGIN');

    // Delete old items
    await client.query('DELETE FROM request_items WHERE request_id = $1', [id]);

    // Insert new items
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          'INSERT INTO request_items (request_id, item_id, quantity) VALUES ($1, $2, $3)',
          [id, item.itemId, item.quantity]
        );
      }
    }

    await client.query('COMMIT');

    const updatedRequest = await pool.query('SELECT * FROM ris_requests WHERE id = $1', [id]);
    const itemsResult = await pool.query('SELECT * FROM request_items WHERE request_id = $1', [id]);

    res.json({
      ...updatedRequest.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update request error:', err);
    res.status(500).json({ error: 'Failed to update request' });
  } finally {
    client.release();
  }
});

// POST /api/requests/:id/approve (admin only—approve and assign RIS number)
router.post('/:id/approve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const requestResult = await pool.query('SELECT * FROM ris_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const risNumber = await getNextRISNumber();
    const approverDate = new Date().toISOString().split('T')[0];

    const updatedRequest = await pool.query(
      `UPDATE ris_requests SET status = $1, ris_number = $2, approver_date = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      ['approved', risNumber, approverDate, id]
    );

    res.json(updatedRequest.rows[0]);
  } catch (err) {
    console.error('Approve request error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// POST /api/requests/:id/reject (admin only)
router.post('/:id/reject', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedRequest = await pool.query(
      'UPDATE ris_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['rejected', id]
    );

    if (updatedRequest.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(updatedRequest.rows[0]);
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// POST /api/requests/:id/mark-released (admin only)
// Checks stock availability and deducts from inventory
router.post('/:id/mark-released', verifyToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const issuedDate = new Date().toISOString().split('T')[0];

    // Get the request and its items
    const requestResult = await client.query('SELECT * FROM ris_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const requestItems = await client.query('SELECT * FROM request_items WHERE request_id = $1', [id]);
    
    await client.query('BEGIN');

    // Ensure all requested items have inventory records
    for (const item of requestItems.rows) {
      const inventoryCheck = await client.query(
        'SELECT id FROM inventory WHERE item_id = $1',
        [item.item_id]
      );

      // If no record exists, create one with 0 quantity
      if (inventoryCheck.rows.length === 0) {
        // Get item name from app.js AVAILABLE_ITEMS (we'll use a placeholder)
        await client.query(
          `INSERT INTO inventory (item_id, item_name, stock_number, quantity)
           VALUES ($1, $2, $3, 0)`,
          [item.item_id, `Item ${item.item_id}`, `STK-${String(item.item_id).padStart(3, '0')}`]
        );
      }
    }

    // Now check stock availability for all items
    let stocksAvailable = true;
    const stockCheckResults = [];

    for (const item of requestItems.rows) {
      const inventoryResult = await client.query(
        'SELECT id, item_name, quantity FROM inventory WHERE item_id = $1',
        [item.item_id]
      );

      if (inventoryResult.rows.length === 0 || inventoryResult.rows[0].quantity < item.quantity) {
        stocksAvailable = false;
      }

      stockCheckResults.push({
        itemId: item.item_id,
        requestedQuantity: item.quantity,
        availableQuantity: inventoryResult.rows.length > 0 ? inventoryResult.rows[0].quantity : 0,
        itemName: inventoryResult.rows.length > 0 ? inventoryResult.rows[0].item_name : 'Unknown Item',
        sufficient: inventoryResult.rows.length > 0 && inventoryResult.rows[0].quantity >= item.quantity,
      });
    }

    // Deduct from inventory if stocks are available
    if (stocksAvailable) {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });

      for (const item of requestItems.rows) {
        const inventoryResult = await client.query(
          'SELECT quantity, item_name FROM inventory WHERE item_id = $1',
          [item.item_id]
        );

        const currentStock = inventoryResult.rows[0].quantity;
        const itemName = inventoryResult.rows[0].item_name;
        const newStock = currentStock - item.quantity;

        // Update inventory
        await client.query(
          'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE item_id = $2',
          [newStock, item.item_id]
        );

        // Record in stock history
        await client.query(
          `INSERT INTO stock_history (item_id, item_name, quantity, action, previous_stock, new_stock, notes, date, time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [item.item_id, itemName, item.quantity, 'release', currentStock, newStock, `Request ID: ${id}`, today, time]
        );
      }
    } else {
      // Even if insufficient, record the release attempt in history for audit trail
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });

      for (const item of requestItems.rows) {
        const inventoryResult = await client.query(
          'SELECT quantity, item_name FROM inventory WHERE item_id = $1',
          [item.item_id]
        );

        if (inventoryResult.rows.length > 0) {
          const currentStock = inventoryResult.rows[0].quantity;
          const itemName = inventoryResult.rows[0].item_name;

          // Record failed release attempt
          await client.query(
            `INSERT INTO stock_history (item_id, item_name, quantity, action, previous_stock, new_stock, notes, date, time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [item.item_id, itemName, item.quantity, 'release_failed', currentStock, currentStock, `Request ID: ${id} - Insufficient stock`, today, time]
          );
        }
      }
    }

    // Update request with status and stocks_available flag
    const updatedRequest = await client.query(
      'UPDATE ris_requests SET status = $1, issued_date = $2, stocks_available = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      ['released', issuedDate, stocksAvailable, id]
    );

    await client.query('COMMIT');

    res.json({
      ...updatedRequest.rows[0],
      stocksAvailable,
      stockCheckResults,
      message: stocksAvailable 
        ? 'Request marked as released and inventory deducted successfully'
        : 'Request marked as released but insufficient stocks available - no inventory deduction made',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Mark released error:', err);
    res.status(500).json({ error: 'Failed to mark released' });
  } finally {
    client.release();
  }
});

// POST /api/requests/:id/issued-items (admin only—record what was issued)
router.post('/:id/issued-items', verifyToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { issuedItems } = req.body; // array of { itemId, quantity }

    const requestResult = await client.query('SELECT * FROM ris_requests WHERE id = $1', [id]);
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await client.query('BEGIN');

    // Delete old issued items
    await client.query('DELETE FROM issued_items WHERE request_id = $1', [id]);

    // Insert new issued items
    if (issuedItems && issuedItems.length > 0) {
      for (const item of issuedItems) {
        await client.query(
          'INSERT INTO issued_items (request_id, item_id, quantity) VALUES ($1, $2, $3)',
          [id, item.itemId, item.quantity]
        );
      }
    }

    await client.query('COMMIT');

    const updatedRequest = await pool.query('SELECT * FROM ris_requests WHERE id = $1', [id]);
    const issuedResult = await pool.query('SELECT * FROM issued_items WHERE request_id = $1', [id]);

    res.json({
      ...updatedRequest.rows[0],
      issuedItems: issuedResult.rows.map(i => ({ id: i.id, itemId: i.item_id, quantity: i.quantity })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update issued items error:', err);
    res.status(500).json({ error: 'Failed to update issued items' });
  } finally {
    client.release();
  }
});

module.exports = router;
