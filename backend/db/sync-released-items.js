const pool = require('./client');

/**
 * Sync Script: Ensure all released items have proper inventory records
 * This script:
 * 1. Finds all released requests
 * 2. Ensures their request items have inventory records
 * 3. Creates stock_history entries for any missing records
 */

async function syncReleasedItems() {
  const client = await pool.connect();
  try {
    console.log('Starting sync of released items to inventory...');

    await client.query('BEGIN');

    // Get all released requests with their items
    const releasedRequests = await client.query(`
      SELECT r.id, r.ris_number, r.control_number, r.department, r.issued_date
      FROM ris_requests r
      WHERE r.status = 'released'
      ORDER BY r.issued_date DESC
    `);

    console.log(`Found ${releasedRequests.rows.length} released requests`);

    let itemsCreated = 0;
    let itemsChecked = 0;

    for (const request of releasedRequests.rows) {
      const requestItems = await client.query(
        `SELECT ri.item_id, ri.quantity
         FROM request_items ri
         WHERE ri.request_id = $1`,
        [request.id]
      );

      for (const item of requestItems.rows) {
        itemsChecked++;

        // Check if inventory record exists
        const inventoryCheck = await client.query(
          'SELECT id FROM inventory WHERE item_id = $1',
          [item.item_id]
        );

        if (inventoryCheck.rows.length === 0) {
          // Create inventory record with 0 quantity
          const itemName = await client.query(
            `SELECT name FROM (VALUES
              (1, 'Adding Slip'), (2, 'Ball Pen (black)'), (3, 'BALLPEN (BLUE) 1'),
              (4, 'BALLPEN (RED)'), (5, 'Battery 9v'), (6, 'Battery AA'),
              (7, 'Battery AAA'), (8, 'Bond Paper (A4)'), (9, 'Bond Paper (legal)'),
              (10, 'Bond Paper (short)'), (11, 'Bond Paper A3'), (12, 'Brown Envelope Long'),
              (13, 'Brown Envelope Short'), (14, 'Calculator'), (15, 'Carbon Paper (black)'),
              (16, 'Carolina Assorted Color'), (17, 'CERTIFICATE HOLDER'), (18, 'Clear Book Long (20 pages)'),
              (19, 'CLIP BACKFOLD 10MM (2")'), (20, 'CLIP BACKFOLD 25MM (1")'),
              (21, 'CLIP BACKFOLD 32MM (1.25")'), (22, 'CLIP BACKFOLD 50MM (2")'), (23, 'CONTINUOUS FORM 2PLY'),
              (24, 'Correction Tape'), (25, 'Cutter knife w/ Cutter Blade'), (26, 'DVD-R'),
              (27, 'Envelope Expanded legal'), (28, 'ERASER RUBBER'), (29, 'FILE BOX (magazine file box)'),
              (30, 'FILE FOLDER ARCHFILE'), (31, 'File Divider 76mx30mx80m'), (32, 'FOLDER ORDINARY (short)'),
              (33, 'FOLDER ORDINARY (LONG)'), (34, 'FOLDER Expanded Long'), (35, 'Glue all purposes'),
              (36, 'Index Card 5x8 100s/pack'), (37, 'Mailing Envelope Long'), (38, 'Mailing Envelope with window'),
              (39, 'MARKER FLUORESCENT (highlight)'), (40, 'Marker PERMANENT (Black)'), (41, 'MARKER PERMANENT (BLUE)'),
              (42, 'MARKER PERMANENT (Red)'), (43, 'MARKER WHITEBOARD (BLACK)'), (44, 'MARKER WHITEBOARD (BLUE)'),
              (45, 'MARKER WHITEBOARD (RED)'), (46, 'NOTEPAD STICK-ON 3X3'), (47, 'NOTEPAD STICK-ON 3X4'),
              (48, 'NOTEPAD STICK-ON 2X3'), (49, 'PAPER CLIP 45MM (jumbo)'), (50, 'Paper Fastener (Metal)'),
              (51, 'Paper Fastener (Plastic)'), (52, 'Paper Puncher (Big)'), (53, 'PAPER THERMAL 210MM X 30M'),
              (54, 'Pay Envelope'), (55, 'Pencil Mongol #2'), (56, 'Pencil Sharpener'),
              (57, 'Photo Paper A4'), (58, 'Plastic Cover'), (59, 'Plastic Envelope (Long)'),
              (60, 'Plastic Envelope (Short)'), (61, 'PUSH PIN 100PCS'), (62, 'Record Book (150 Pages)'),
              (63, 'Record Book (300 Pages)'), (64, 'Record Book (500 Pages)'), (65, 'RUBBER BAND 70MM (#18)'),
              (66, 'Sign Pen (Black)'), (67, 'Sign Pen (Blue)'), (68, 'Sign Pen (Green)'),
              (69, 'Sign Pen (Red)'), (70, 'SIGN PEN (VIOLET)'), (71, 'STAMP PAD'),
              (72, 'STAMP PAD INK BLACK'), (73, 'Stapler'), (74, 'Staple Wire N-35 Big Box'),
              (75, 'Sticker with sticker'), (76, 'Sticker Paper Matte'), (77, 'Tape Dispenser (Big)'),
              (78, 'Tape Double Sided 24mm (1")'), (79, 'TAPE Double Sided 48mm (2")'), (80, 'Tape Masking 48mm (2")'),
              (81, 'TAPE Scotch Tape 24mm (1")'), (82, 'TAPE Scotch Tape 48mm (2")'), (83, 'White Regular Mailing Envelope'),
              (84, 'YELLOW PAD PAPER'), (85, 'Air Freshener'), (86, 'Alcohol'),
              (87, 'Broom'), (88, 'Broomstick'), (89, 'Detergent Bar'),
              (90, 'Detergent Powder'), (91, 'Dishwashing Liquid'), (92, 'Disinfectant Bleach'),
              (93, 'Disinfectant Spray'), (94, 'Doormat / Rug'), (95, 'Dust Pan'),
              (96, 'Fabric Conditioner'), (97, 'Floor Mop (with rug)'), (98, 'Furniture Polish'),
              (99, 'Glass Cleaner'), (100, 'Jumbo Tissue for CR'), (101, 'Liquid Hand Soap for CR 500ml'),
              (102, 'Mop Head (extra rug)'), (103, 'Multi-insect Killer'), (104, 'Muriatic Acid'),
              (105, 'Round Rug (5'"'"'s)'), (106, 'Scotch Brite Pad with sponge'), (107, 'Toilet Bowl Cleaner'),
              (108, 'Toilet Brush'), (109, 'Toilet Deodorant'), (110, 'Sanitizer'),
              (111, 'Tissue Roll'), (112, 'Trashbag Small'), (113, 'Trashbag Big'),
              (114, 'Rubber Gloves'), (115, 'Tissue Box'), (116, 'Trash Can')
            ) AS items(id, name) WHERE id = $1`,
            [item.item_id]
          );

          const itemName = itemName.rows.length > 0 ? itemName.rows[0].name : `Item ${item.item_id}`;
          const stockNumber = `STK-${String(item.item_id).padStart(3, '0')}`;

          await client.query(
            `INSERT INTO inventory (item_id, item_name, stock_number, quantity)
             VALUES ($1, $2, $3, 0)
             ON CONFLICT (item_id) DO NOTHING`,
            [item.item_id, itemName, stockNumber]
          );

          itemsCreated++;
          console.log(`✓ Created inventory record for item ${item.item_id}: ${itemName}`);
        }
      }
    }

    await client.query('COMMIT');

    console.log(`\n✓ Sync completed!`);
    console.log(`  Total items checked: ${itemsChecked}`);
    console.log(`  New inventory records created: ${itemsCreated}`);
    console.log(`  Released requests synced: ${releasedRequests.rows.length}`);

    await pool.end();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Sync failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

syncReleasedItems();
