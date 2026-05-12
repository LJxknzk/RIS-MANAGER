const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function testMarkReleasedFlow() {
  console.log('=== COMPREHENSIVE MARK-RELEASED TEST ===\n');

  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'ris-manager', 'data.db');
  
  // Delete old database to start fresh
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✓ Deleted existing database\n');
  }

  // Create new database
  let db = new SQL.Database();
  
  // Create schema
  const schema = `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      department TEXT NOT NULL,
      designation TEXT
    );
    CREATE TABLE ris_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      control_number INTEGER NOT NULL,
      ris_number INTEGER,
      department TEXT NOT NULL,
      request_type TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      stocks_available INTEGER,
      request_date DATE NOT NULL,
      request_year INTEGER NOT NULL,
      requester_name TEXT,
      requester_designation TEXT,
      requester_date DATE,
      approver_name TEXT,
      approver_designation TEXT,
      approver_date DATE,
      issued_date DATE,
      user_id_approver INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE request_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(request_id) REFERENCES ris_requests(id) ON DELETE CASCADE
    );
    CREATE TABLE issued_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(request_id) REFERENCES ris_requests(id) ON DELETE CASCADE
    );
    CREATE TABLE inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER UNIQUE,
      item_name TEXT NOT NULL,
      stock_number TEXT UNIQUE NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      item_name TEXT,
      quantity INTEGER NOT NULL,
      action TEXT NOT NULL,
      previous_stock INTEGER,
      new_stock INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      acronym TEXT
    );
    CREATE TABLE department_received_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      department TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity_received INTEGER NOT NULL,
      ris_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(request_id) REFERENCES ris_requests(id) ON DELETE CASCADE
    );
  `;
  
  db.run(schema);
  console.log('✓ Schema created\n');

  // Helper to execute queries
  function execToObjects(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  // 1. Create test data
  console.log('STEP 1: Creating test data...');
  
  // Create admin user
  const adminHash = crypto.createHash('sha256').update('admin123').digest('hex');
  db.run('INSERT INTO users (name, email, password_hash, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)',
    ['Admin User', 'admin@test.com', adminHash, 'admin', 'Admin', 'Administrator']
  );
  console.log('  ✓ Created admin user');

  // Create regular user
  const userHash = crypto.createHash('sha256').update('user123').digest('hex');
  db.run('INSERT INTO users (name, email, password_hash, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)',
    ['Test User', 'user@test.com', userHash, 'user', 'Finance', 'Manager']
  );
  console.log('  ✓ Created regular user');

  // Create department
  db.run('INSERT INTO departments (name, acronym) VALUES (?, ?)', ['Finance', 'FIN']);
  console.log('  ✓ Created department');

  // Create inventory items
  db.run('INSERT INTO inventory (item_id, item_name, stock_number, quantity) VALUES (?, ?, ?, ?)', [1, 'Pencil Box', 'PB-001', 200]);
  db.run('INSERT INTO inventory (item_id, item_name, stock_number, quantity) VALUES (?, ?, ?, ?)', [2, 'Ball Pen', 'BP-001', 50]);
  db.run('INSERT INTO inventory (item_id, item_name, stock_number, quantity) VALUES (?, ?, ?, ?)', [3, 'Notebook', 'NB-001', 100]);
  console.log('  ✓ Created inventory items\n');

  // Display initial inventory
  console.log('Initial Inventory:');
  const initialInventory = execToObjects('SELECT item_id, item_name, quantity FROM inventory');
  console.table(initialInventory);
  console.log();

  // 2. Create a RIS request
  console.log('STEP 2: Creating RIS request...');
  db.run('INSERT INTO ris_requests (user_id, control_number, ris_number, department, request_type, description, status, request_date, request_year, requester_name, requester_designation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [1, 1, 100001, 'Finance', 'office_supplies', 'Test request', 'pending', new Date().toISOString().split('T')[0], 2026, 'Test Requester', 'Manager']
  );
  console.log('  ✓ Created request\n');

  // 3. Create request items
  console.log('STEP 3: Adding request items...');
  db.run('INSERT INTO request_items (request_id, item_id, quantity) VALUES (?, ?, ?)', [1, 1, 10]); // Request 10 Pencil Boxes
  db.run('INSERT INTO request_items (request_id, item_id, quantity) VALUES (?, ?, ?)', [1, 2, 5]);  // Request 5 Ball Pens
  console.log('  ✓ Added request items\n');

  // 4. Create issued items (admin issues different quantities)
  console.log('STEP 4: Issuing items (admin quantities)...');
  db.run('INSERT INTO issued_items (request_id, item_id, quantity) VALUES (?, ?, ?)', [1, 1, 15]); // Issue 15 Pencil Boxes (more than requested)
  db.run('INSERT INTO issued_items (request_id, item_id, quantity) VALUES (?, ?, ?)', [1, 2, 5]);  // Issue 5 Ball Pens
  console.log('  ✓ Added issued items\n');

  // Display request details
  const requests = execToObjects('SELECT * FROM ris_requests WHERE id = 1');
  const requestItems = execToObjects('SELECT * FROM request_items WHERE request_id = 1');
  const issuedItems = execToObjects('SELECT * FROM issued_items WHERE request_id = 1');
  
  console.log('Request Details (ID: 1):');
  console.table(requests);
  console.log('\nRequest Items:');
  console.table(requestItems);
  console.log('\nIssued Items:');
  console.table(issuedItems);
  console.log();

  // 5. Simulate MARK-RELEASED flow
  console.log('STEP 5: Simulating MARK-RELEASED...\n');
  
  for (const issued of issuedItems) {
    const inventoryItem = execToObjects('SELECT * FROM inventory WHERE item_id = ?', [issued.item_id]);
    if (inventoryItem.length > 0) {
      const inventory = inventoryItem[0];
      const previousStock = inventory.quantity;
      const newStock = Math.max(0, previousStock - issued.quantity);
      
      console.log(`  Item ${issued.item_id}: ${inventory.item_name}`);
      console.log(`    - Current stock: ${previousStock}`);
      console.log(`    - Deducting: ${issued.quantity}`);
      console.log(`    - New stock will be: ${newStock}`);
      
      // Execute UPDATE
      db.run('UPDATE inventory SET quantity = ?, updated_at = ? WHERE item_id = ?', 
        [newStock, new Date().toISOString(), issued.item_id]
      );
      
      // Verify immediately
      const verify = execToObjects('SELECT quantity FROM inventory WHERE item_id = ?', [issued.item_id]);
      console.log(`    - After UPDATE: ${verify[0].quantity}`);
      console.log();
    }
  }

  // Mark request as released
  db.run('UPDATE ris_requests SET status = ?, issued_date = ? WHERE id = ?',
    ['released', new Date().toISOString().split('T')[0], 1]
  );
  console.log('  ✓ Marked request as released\n');

  // 6. Display final inventory
  console.log('STEP 6: Final Inventory After Release:');
  const finalInventory = execToObjects('SELECT item_id, item_name, quantity FROM inventory');
  console.table(finalInventory);

  // 7. Verify changes
  console.log('\nSTEP 7: Verification:');
  for (const initial of initialInventory) {
    const final = finalInventory.find(f => f.item_id === initial.item_id);
    const change = initial.quantity - final.quantity;
    console.log(`  ${initial.item_name}: ${initial.quantity} → ${final.quantity} (change: -${change})`);
  }

  // 8. Check stock history
  console.log('\nSTEP 8: Stock History:');
  const history = execToObjects('SELECT * FROM stock_history');
  if (history.length > 0) {
    console.table(history);
  } else {
    console.log('  (No stock history recorded)');
  }

  // 9. Check department received items
  console.log('\nSTEP 9: Department Received Items:');
  const deptReceived = execToObjects('SELECT * FROM department_received_items');
  if (deptReceived.length > 0) {
    console.table(deptReceived);
  } else {
    console.log('  (No department received items recorded)');
  }

  // Save database
  console.log('\nSTEP 10: Saving database...');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  const stats = fs.statSync(dbPath);
  console.log(`  ✓ Database saved to ${dbPath} (${stats.size} bytes)\n`);

  console.log('=== TEST COMPLETE ===\n');
  console.log('Now run: node test-inventory-flow.js');
  console.log('This will verify the database persisted correctly.');

  db.close();
}

testMarkReleasedFlow().catch(console.error);
