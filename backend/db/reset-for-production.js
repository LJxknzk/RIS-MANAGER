const pool = require('./client');

async function resetForProduction() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting production reset...\n');
    
    await client.query('BEGIN');
    
    // 1. Delete all requests (this will cascade to related data)
    console.log('📋 Deleting all requests...');
    await client.query('DELETE FROM ris_requests');
    console.log('✅ Requests deleted\n');
    
    // 2. Reset inventory quantities to 0
    console.log('📦 Resetting inventory quantities to 0...');
    await client.query('UPDATE inventory SET quantity = 0, updated_at = NOW()');
    console.log('✅ Inventory quantities reset\n');
    
    // 3. Delete all stock history (audit trail)
    console.log('📜 Clearing stock history...');
    await client.query('DELETE FROM stock_history');
    console.log('✅ Stock history cleared\n');
    
    // 4. Verify users are intact
    const userCheck = await client.query('SELECT id, email, role FROM users');
    console.log('👤 Users preserved:', userCheck.rows.length);
    userCheck.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
    console.log();
    
    // 5. Verify departments are intact
    const deptCheck = await client.query('SELECT id, name FROM departments');
    console.log('🏢 Departments preserved:', deptCheck.rows.length);
    deptCheck.rows.forEach(dept => {
      console.log(`   - ${dept.name}`);
    });
    console.log();
    
    // 6. Verify inventory items are intact with 0 quantities
    const invCheck = await client.query('SELECT id, item_name, quantity FROM inventory LIMIT 5');
    console.log('📦 Sample inventory items (first 5):');
    invCheck.rows.forEach(item => {
      console.log(`   - ${item.item_name}: ${item.quantity} units`);
    });
    const totalItems = await client.query('SELECT COUNT(*) FROM inventory');
    console.log(`   ... (${totalItems.rows[0].count} total items)\n`);
    
    await client.query('COMMIT');
    
    console.log('✅ PRODUCTION RESET COMPLETE!');
    console.log('\n📊 System Status:');
    console.log('   ✅ All requests deleted');
    console.log('   ✅ All inventory quantities: 0');
    console.log('   ✅ Stock history cleared');
    console.log('   ✅ Users preserved');
    console.log('   ✅ Departments preserved');
    console.log('   ✅ Inventory items preserved');
    console.log('\n🚀 Ready for production deployment!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during reset:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetForProduction();
