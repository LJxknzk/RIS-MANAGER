const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function testGetInventory() {
  console.log('=== TESTING getInventory() ENDPOINT ===\n');

  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'ris-manager', 'data.db');
  
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  // Helper to execute queries (same as in main.js)
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

  // Simulate the getInventory() endpoint
  console.log('Simulating: GET /api/inventory\n');
  
  const rows = execToObjects('SELECT * FROM inventory');
  
  console.log('Raw response from execToObjects():');
  console.table(rows);
  
  // This is what the API returns
  console.log('\nThis data would be sent back to frontend:\n');
  console.log(JSON.stringify(rows, null, 2));

  // Now simulate what apiStorageManager.getInventory() does
  // It normalizes the response to {item_id: quantity}
  console.log('\n\nAfter normalization in apiStorageManager.getInventory():\n');
  
  const normalized = {};
  for (const item of rows) {
    normalized[item.item_id] = item.quantity;
  }
  
  console.log('Normalized inventory object:');
  console.log(JSON.stringify(normalized, null, 2));

  console.log('\n✓ If app calls getInventory() now, it should receive:', normalized);
  console.log('✓ Stock Management component should update to show: Pencil Box: 185, Ball Pen: 45');

  db.close();
}

testGetInventory().catch(console.error);
