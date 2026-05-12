const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function testInventoryFlow() {
  console.log('=== INVENTORY DEDUCTION TEST ===\n');

  // Load sql.js
  const SQL = await initSqlJs();
  
  // Load database
  const dbPath = path.join(process.env.APPDATA, 'ris-manager', 'data.db');
  console.log(`Loading database from: ${dbPath}\n`);
  
  if (!fs.existsSync(dbPath)) {
    console.error('Database file not found!');
    return;
  }

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

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

  // 1. Check current inventory
  console.log('1. CURRENT INVENTORY STATUS:');
  const inventory = execToObjects('SELECT item_id, item_name, quantity FROM inventory LIMIT 5');
  console.table(inventory);

  // 2. Check requests with status = 'released'
  console.log('\n2. RELEASED REQUESTS:');
  const released = execToObjects('SELECT id, ris_number, status, issued_date FROM ris_requests WHERE status = "released" ORDER BY id DESC LIMIT 5');
  console.table(released);

  if (released.length === 0) {
    console.log('   (No released requests yet)');
  } else {
    // 3. For the most recent released request, show issued items and stock history
    const latestReleased = released[0];
    console.log(`\n3. DETAILS FOR MOST RECENT RELEASE (Request ID: ${latestReleased.id}):`);
    
    const issuedItems = execToObjects('SELECT item_id, quantity FROM issued_items WHERE request_id = ?', [latestReleased.id]);
    console.log('   Issued Items:');
    console.table(issuedItems);

    console.log('\n4. STOCK HISTORY FOR THIS REQUEST:');
    const stockHistory = execToObjects(
      'SELECT item_id, item_name, quantity_change, action, before_quantity, after_quantity, created_at FROM stock_history WHERE notes LIKE ? ORDER BY created_at DESC LIMIT 10',
      [`%Request ID: ${latestReleased.id}%`]
    );
    if (stockHistory.length > 0) {
      console.table(stockHistory);
    } else {
      console.log('   (No stock history found for this request)');
    }
  }

  // 5. Show all tables with row counts
  console.log('\n5. DATABASE TABLE SUMMARY:');
  const tables = [
    'inventory',
    'ris_requests',
    'issued_items',
    'request_items',
    'stock_history',
    'department_received_items'
  ];

  for (const table of tables) {
    const count = execToObjects(`SELECT COUNT(*) as cnt FROM ${table}`);
    console.log(`   ${table}: ${count[0].cnt} rows`);
  }

  console.log('\n=== END OF TEST ===');
  db.close();
}

testInventoryFlow().catch(console.error);
