const pool = require('./client');
const bcrypt = require('bcryptjs');

const DEPARTMENTS = [
  'ACCOUNTING OFFICE',
  'ADMINISTRATOR\'S OFFICE',
  'AGRICULTURE OFFICE',
  'ASSESSOR\'S OFFICE',
  'BAC',
  'BIR',
  'BJMP',
  'BPLO',
  'BUDGET OFFICE',
  'CDRRMO',
  'CENRO',
  'CGTECC (COOP)',
  'CITY PLANNING AND DEVELOPMENT COUNCIL',
  'CIVIL REGISTRAR\'S OFFICE',
  'COMMISSION ON AUDIT',
  'COMELEC',
  'COMMUNITY AFFAIRS OFFICE',
  'COMPUTER TRAINING CENTER/PDAO',
  'CSWD',
  'DILG',
  'ENGINEERING OFFICE',
  'FIRE STATION (Main)',
  'GSO GENERAL SERVICES OFFICE',
  'GSO-AMBULANCE SERVICE',
  'HUMAN RESOURCE MANAGEMENT OFFICE',
  'ICT',
  'INFORMATION OFFICE',
  'INVESTMENT PROMOTION OFFICE',
  'MAYOR\'S OFFICE',
  'OFFICE OF THE SENIOR CITIZENS AFFAIRS',
  'PESO',
  'POLICE MAIN STATION',
  'POLICE MAIN STATION (INVESTIGATION)',
  'POLICE PANLUNGSOD OFFICE',
  'SANGGUNIANG PANLUNGSOD',
  'TRAFFIC MANAGEMENT OFFICE',
  'TREASURER\'S OFFICE',
  'TRIAL COURT',
  'VICE MAYOR\'S OFFICE',
  'WOMEN DEVELOPMENT COUNCIL',
];

const AVAILABLE_ITEMS = [
  // Office items (keeping first 84 from original app)
  { id: 1, name: 'Adding Slip', category: 'Office Supplies', type: 'Office', stock: 'OFF-001' },
  { id: 2, name: 'Ball Pen (black)', category: 'Writing', type: 'Office', stock: 'OFF-002' },
  { id: 3, name: 'BALLPEN (BLUE) 1', category: 'Writing', type: 'Office', stock: 'OFF-003' },
  { id: 4, name: 'BALLPEN (RED)', category: 'Writing', type: 'Office', stock: 'OFF-004' },
  { id: 5, name: 'Battery 9v', category: 'Batteries', type: 'Office', stock: 'OFF-005' },
  { id: 6, name: 'Battery AA', category: 'Batteries', type: 'Office', stock: 'OFF-006' },
  { id: 7, name: 'Battery AAA', category: 'Batteries', type: 'Office', stock: 'OFF-007' },
  { id: 8, name: 'Bond Paper (A4)', category: 'Paper', type: 'Office', stock: 'OFF-008' },
  { id: 9, name: 'Bond Paper (legal)', category: 'Paper', type: 'Office', stock: 'OFF-009' },
  { id: 10, name: 'Bond Paper (short)', category: 'Paper', type: 'Office', stock: 'OFF-010' },
  { id: 11, name: 'Bond Paper A3', category: 'Paper', type: 'Office', stock: 'OFF-011' },
  { id: 12, name: 'Brown Envelope Long', category: 'Envelopes', type: 'Office', stock: 'OFF-012' },
  { id: 13, name: 'Brown Envelope Short', category: 'Envelopes', type: 'Office', stock: 'OFF-013' },
  { id: 14, name: 'Calculator', category: 'Equipment', type: 'Office', stock: 'OFF-014' },
  { id: 15, name: 'Carbon Paper (black)', category: 'Paper', type: 'Office', stock: 'OFF-015' },
  { id: 16, name: 'Carolina Assorted Color', category: 'Art Supplies', type: 'Office', stock: 'OFF-016' },
  { id: 17, name: 'CERTIFICATE HOLDER', category: 'Filing', type: 'Office', stock: 'OFF-017' },
  { id: 18, name: 'Clear Book Long (20 pages)', category: 'Filing', type: 'Office', stock: 'OFF-018' },
  { id: 19, name: 'CLIP BACKFOLD 10MM (2")', category: 'Fasteners', type: 'Office', stock: 'OFF-019' },
  { id: 20, name: 'CLIP BACKFOLD 25MM (1")', category: 'Fasteners', type: 'Office', stock: 'OFF-020' },
  { id: 21, name: 'CLIP BACKFOLD 32MM (1.25")', category: 'Fasteners', type: 'Office', stock: 'OFF-021' },
  { id: 22, name: 'CLIP BACKFOLD 50MM (2")', category: 'Fasteners', type: 'Office', stock: 'OFF-022' },
  { id: 23, name: 'CONTINUOUS FORM 2PLY', category: 'Paper', type: 'Office', stock: 'OFF-023' },
  { id: 24, name: 'Correction Tape', category: 'Writing Supplies', type: 'Office', stock: 'OFF-024' },
  { id: 25, name: 'Cutter knife w/ Cutter Blade', category: 'Tools', type: 'Office', stock: 'OFF-025' },
  { id: 26, name: 'DVD-R', category: 'Media', type: 'Office', stock: 'OFF-026' },
  { id: 27, name: 'Envelope Expanded legal', category: 'Envelopes', type: 'Office', stock: 'OFF-027' },
  { id: 28, name: 'ERASER RUBBER', category: 'Writing Supplies', type: 'Office', stock: 'OFF-028' },
  { id: 29, name: 'FILE BOX (magazine file box)', category: 'Filing', type: 'Office', stock: 'OFF-029' },
  { id: 30, name: 'FILE FOLDER ARCHFILE', category: 'Filing', type: 'Office', stock: 'OFF-030' },
  { id: 31, name: 'File Divider 76mx30mx80m', category: 'Filing', type: 'Office', stock: 'OFF-031' },
  { id: 32, name: 'FOLDER ORDINARY (short)', category: 'Filing', type: 'Office', stock: 'OFF-032' },
  { id: 33, name: 'FOLDER ORDINARY (LONG)', category: 'Filing', type: 'Office', stock: 'OFF-033' },
  { id: 34, name: 'FOLDER Expanded Long', category: 'Filing', type: 'Office', stock: 'OFF-034' },
  { id: 35, name: 'Glue all purposes', category: 'Adhesives', type: 'Office', stock: 'OFF-035' },
  { id: 36, name: 'Index Card 5x8 100s/pack', category: 'Office Supplies', type: 'Office', stock: 'OFF-036' },
  { id: 37, name: 'Mailing Envelope Long', category: 'Envelopes', type: 'Office', stock: 'OFF-037' },
  { id: 38, name: 'Mailing Envelope with window', category: 'Envelopes', type: 'Office', stock: 'OFF-038' },
  { id: 39, name: 'MARKER FLUORESCENT (highlight)', category: 'Markers', type: 'Office', stock: 'OFF-039' },
  { id: 40, name: 'Marker PERMANENT (Black)', category: 'Markers', type: 'Office', stock: 'OFF-040' },
  { id: 41, name: 'MARKER PERMANENT (BLUE)', category: 'Markers', type: 'Office', stock: 'OFF-041' },
  { id: 42, name: 'MARKER PERMANENT (Red)', category: 'Markers', type: 'Office', stock: 'OFF-042' },
  { id: 43, name: 'MARKER WHITEBOARD (BLACK)', category: 'Markers', type: 'Office', stock: 'OFF-043' },
  { id: 44, name: 'MARKER WHITEBOARD (BLUE)', category: 'Markers', type: 'Office', stock: 'OFF-044' },
  { id: 45, name: 'MARKER WHITEBOARD (RED)', category: 'Markers', type: 'Office', stock: 'OFF-045' },
  { id: 46, name: 'NOTEPAD STICK-ON 3X3', category: 'Office Supplies', type: 'Office', stock: 'OFF-046' },
  { id: 47, name: 'NOTEPAD STICK-ON 3X4', category: 'Office Supplies', type: 'Office', stock: 'OFF-047' },
  { id: 48, name: 'NOTEPAD STICK-ON 2X3', category: 'Office Supplies', type: 'Office', stock: 'OFF-048' },
  { id: 49, name: 'PAPER CLIP 45MM (jumbo)', category: 'Fasteners', type: 'Office', stock: 'OFF-049' },
  { id: 50, name: 'Paper Fastener (Metal)', category: 'Fasteners', type: 'Office', stock: 'OFF-050' },
  { id: 51, name: 'Paper Fastener (Plastic)', category: 'Fasteners', type: 'Office', stock: 'OFF-051' },
  { id: 52, name: 'Paper Puncher (Big)', category: 'Tools', type: 'Office', stock: 'OFF-052' },
  { id: 53, name: 'PAPER THERMAL 210MM X 30M', category: 'Paper', type: 'Office', stock: 'OFF-053' },
  { id: 54, name: 'Pay Envelope', category: 'Envelopes', type: 'Office', stock: 'OFF-054' },
  { id: 55, name: 'Pencil Mongol #2', category: 'Writing', type: 'Office', stock: 'OFF-055' },
  { id: 56, name: 'Pencil Sharpener', category: 'Tools', type: 'Office', stock: 'OFF-056' },
  { id: 57, name: 'Photo Paper A4', category: 'Paper', type: 'Office', stock: 'OFF-057' },
  { id: 58, name: 'Plastic Cover', category: 'Office Supplies', type: 'Office', stock: 'OFF-058' },
  { id: 59, name: 'Plastic Envelope (Long)', category: 'Envelopes', type: 'Office', stock: 'OFF-059' },
  { id: 60, name: 'Plastic Envelope (Short)', category: 'Envelopes', type: 'Office', stock: 'OFF-060' },
  { id: 61, name: 'PUSH PIN 100PCS', category: 'Office Supplies', type: 'Office', stock: 'OFF-061' },
  { id: 62, name: 'Record Book (150 Pages)', category: 'Books', type: 'Office', stock: 'OFF-062' },
  { id: 63, name: 'Record Book (300 Pages)', category: 'Books', type: 'Office', stock: 'OFF-063' },
  { id: 64, name: 'Record Book (500 Pages)', category: 'Books', type: 'Office', stock: 'OFF-064' },
  { id: 65, name: 'RUBBER BAND 70MM (#18)', category: 'Office Supplies', type: 'Office', stock: 'OFF-065' },
  { id: 66, name: 'Sign Pen (Black)', category: 'Writing', type: 'Office', stock: 'OFF-066' },
  { id: 67, name: 'Sign Pen (Blue)', category: 'Writing', type: 'Office', stock: 'OFF-067' },
  { id: 68, name: 'Sign Pen (Green)', category: 'Writing', type: 'Office', stock: 'OFF-068' },
  { id: 69, name: 'Sign Pen (Red)', category: 'Writing', type: 'Office', stock: 'OFF-069' },
  { id: 70, name: 'SIGN PEN (VIOLET)', category: 'Writing', type: 'Office', stock: 'OFF-070' },
  { id: 71, name: 'STAMP PAD', category: 'Office Supplies', type: 'Office', stock: 'OFF-071' },
  { id: 72, name: 'STAMP PAD INK BLACK', category: 'Office Supplies', type: 'Office', stock: 'OFF-072' },
  { id: 73, name: 'Stapler', category: 'Equipment', type: 'Office', stock: 'OFF-073' },
  { id: 74, name: 'Staple Wire N-35 Big Box', category: 'Office Supplies', type: 'Office', stock: 'OFF-074' },
  { id: 75, name: 'Sticker with sticker', category: 'Office Supplies', type: 'Office', stock: 'OFF-075' },
  { id: 76, name: 'Sticker Paper Matte', category: 'Paper', type: 'Office', stock: 'OFF-076' },
  { id: 77, name: 'Tape Dispenser (Big)', category: 'Equipment', type: 'Office', stock: 'OFF-077' },
  { id: 78, name: 'Tape Double Sided 24mm (1")', category: 'Tape', type: 'Office', stock: 'OFF-078' },
  { id: 79, name: 'TAPE Double Sided 48mm (2")', category: 'Tape', type: 'Office', stock: 'OFF-079' },
  { id: 80, name: 'Tape Masking 48mm (2")', category: 'Tape', type: 'Office', stock: 'OFF-080' },
  { id: 81, name: 'TAPE Scotch Tape 24mm (1")', category: 'Tape', type: 'Office', stock: 'OFF-081' },
  { id: 82, name: 'TAPE Scotch Tape 48mm (2")', category: 'Tape', type: 'Office', stock: 'OFF-082' },
  { id: 83, name: 'White Regular Mailing Envelope', category: 'Envelopes', type: 'Office', stock: 'OFF-083' },
  { id: 84, name: 'YELLOW PAD PAPER', category: 'Paper', type: 'Office', stock: 'OFF-084' },
  // Janitorial items
  { id: 85, name: 'Air Freshener', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-001' },
  { id: 86, name: 'Alcohol', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-002' },
  { id: 87, name: 'Broom', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-003' },
  { id: 88, name: 'Broomstick', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-004' },
  { id: 89, name: 'Detergent Bar', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-005' },
  { id: 90, name: 'Detergent Powder', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-006' },
  { id: 91, name: 'Dishwashing Liquid', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-007' },
  { id: 92, name: 'Disinfectant Bleach', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-008' },
  { id: 93, name: 'Disinfectant Spray', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-009' },
  { id: 94, name: 'Doormat / Rug', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-010' },
  { id: 95, name: 'Dust Pan', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-011' },
  { id: 96, name: 'Fabric Conditioner', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-012' },
  { id: 97, name: 'Floor Mop (with rug)', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-013' },
  { id: 98, name: 'Furniture Polish', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-014' },
  { id: 99, name: 'Glass Cleaner', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-015' },
  { id: 100, name: 'Jumbo Tissue for CR', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-016' },
  { id: 101, name: 'Liquid Hand Soap for CR 500ml', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-017' },
  { id: 102, name: 'Mop Head (extra rug)', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-018' },
  { id: 103, name: 'Multi-insect Killer', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-019' },
  { id: 104, name: 'Muriatic Acid', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-020' },
  { id: 105, name: 'Round Rug (5\'s)', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-021' },
  { id: 106, name: 'Scotch Brite Pad with sponge', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-022' },
  { id: 107, name: 'Toilet Bowl Cleaner', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-023' },
  { id: 108, name: 'Toilet Brush', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-024' },
  { id: 109, name: 'Toilet Deodorant', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-025' },
  { id: 110, name: 'Sanitizer', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-026' },
  { id: 111, name: 'Tissue Roll', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-027' },
  { id: 112, name: 'Trashbag Small', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-028' },
  { id: 113, name: 'Trashbag Big', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-029' },
  { id: 114, name: 'Rubber Gloves', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-030' },
  { id: 115, name: 'Tissue Box', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-031' },
  { id: 116, name: 'Trash Can', category: 'Janitorial', type: 'Janitorial', stock: 'JAN-032' },
];

async function seed() {
  try {
    console.log('Starting database seeding...');

    // Seed departments
    console.log('Seeding departments...');
    for (const dept of DEPARTMENTS) {
      await pool.query(
        'INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [dept]
      );
    }
    console.log(`✓ Seeded ${DEPARTMENTS.length} departments`);

    // Seed admin user
    console.log('Seeding admin user...');
    const adminPasswordHash = await bcrypt.hash('BAC2026', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department, designation)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      ['Bryan De Guzman Fortuno', 'bryanfortuno@bac.gov', adminPasswordHash, 'admin', 'BAC', 'Admin IV']
    );
    console.log('✓ Seeded admin user');

    // Seed department users
    console.log('Seeding department users...');
    for (const dept of DEPARTMENTS) {
      const deptEmail = `${dept.toLowerCase().replace(/[^a-z0-9]+/g, '_')}@bac.gov`;
      const deptAcronym = dept
        .replace(/[^a-z0-9]+/gi, ' ')
        .trim()
        .split(/\s+/)
        .join('')
        .slice(0, 3)
        .toUpperCase()
        .padEnd(3, 'X');
      const initialPassword = `${deptAcronym}2026`;
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, department, designation)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
        [dept, deptEmail, passwordHash, 'user', dept, dept]
      );
    }
    console.log(`✓ Seeded ${DEPARTMENTS.length} department users`);

    // Seed inventory items
    console.log('Seeding inventory items...');
    for (const item of AVAILABLE_ITEMS) {
      await pool.query(
        `INSERT INTO inventory (item_id, item_name, stock_number, quantity)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (item_id) DO NOTHING`,
        [item.id, item.name, item.stock]
      );
    }
    console.log(`✓ Seeded ${AVAILABLE_ITEMS.length} inventory items`);

    console.log('✓ Database seeding completed successfully');
    await pool.end();
  } catch (err) {
    console.error('✗ Database seeding failed:', err);
    process.exit(1);
  }
}

seed();
