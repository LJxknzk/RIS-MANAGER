const { useState, useEffect } = React;

// Color Scheme
const colors = {
  navy: '#0D1B2A',
  darkNavy: '#0A111F',
  forestGreen: '#2D6E4F',
  lightGreen: '#4CAF50',
  amber: '#FFC107',
  red: '#D32F2F',
  lightGray: '#F5F5F5',
  white: '#FFFFFF',
  darkGray: '#424242',
  borderGray: '#E0E0E0',
};

// Password Hashing Utility with SubtleCrypto fallback
function sha256FallbackHex(message) {
  // Minimal SHA-256 implementation (adapted for small footprint)
  function rightRotate(n, x) { return (x >>> n) | (x << (32 - n)); }
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];

  const msg = unescape(encodeURIComponent(message));
  const msgLen = msg.length;
  const words = [];
  for (let i = 0; i < msgLen; i++) {
    words[i >> 2] |= (msg.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  words[msgLen >> 2] |= 0x80 << (24 - (msgLen % 4) * 8);
  words[((msgLen + 8) >> 6) * 16 + 15] = msgLen * 8;

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  for (let i = 0; i < words.length; i += 16) {
    const W = new Array(64);
    for (let t = 0; t < 16; t++) W[t] = words[i + t] | 0;
    for (let t = 16; t < 64; t++) {
      const s0 = (rightRotate(7, W[t - 15]) ^ rightRotate(18, W[t - 15]) ^ (W[t - 15] >>> 3)) >>> 0;
      const s1 = (rightRotate(17, W[t - 2]) ^ rightRotate(19, W[t - 2]) ^ (W[t - 2] >>> 10)) >>> 0;
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;
    for (let t = 0; t < 64; t++) {
      const S1 = (rightRotate(6, e) ^ rightRotate(11, e) ^ rightRotate(25, e)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = (rightRotate(2, a) ^ rightRotate(13, a) ^ rightRotate(22, a)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0; H1 = (H1 + b) >>> 0; H2 = (H2 + c) >>> 0; H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0; H5 = (H5 + f) >>> 0; H6 = (H6 + g) >>> 0; H7 = (H7 + h) >>> 0;
  }

  const toHex = n => ('00000000' + n.toString(16)).slice(-8);
  return toHex(H0) + toHex(H1) + toHex(H2) + toHex(H3) + toHex(H4) + toHex(H5) + toHex(H6) + toHex(H7);
}

const PasswordHash = {
  hash: async (password) => {
    const salt = 'ris_salt_2026';
    const input = String(password || '') + salt;
    // Prefer SubtleCrypto when available
    try {
      if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      // fallthrough to fallback
      console.warn('SubtleCrypto failed, using JS fallback for SHA-256', e);
    }

    // Fallback: synchronous JS SHA-256
    return sha256FallbackHex(input);
  },

  compare: async (password, hash) => {
    const passwordHash = await PasswordHash.hash(password);
    return passwordHash === hash;
  },
};

// Departments - Government Offices
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

// Available Items with Stock Numbers
const AVAILABLE_ITEMS = [
  // Office Items (Stock 001-084)
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
  // Janitorial Items (Stock JAN-001 to JAN-032)
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

const REQUEST_TYPES = ['Office', 'Janitorial'];

// LocalStorage Manager
const StorageManager = {
  getUsers: () => JSON.parse(localStorage.getItem('ris_users')) || [],
  setUsers: (users) => localStorage.setItem('ris_users', JSON.stringify(users)),

  getRememberedUserId: () => {
    const stored = localStorage.getItem('ris_remembered_user_id');
    return stored ? parseInt(stored) : null;
  },

  setRememberedUserId: (userId) => localStorage.setItem('ris_remembered_user_id', String(userId)),

  clearRememberedUserId: () => localStorage.removeItem('ris_remembered_user_id'),
  
  getRequests: () => JSON.parse(localStorage.getItem('ris_requests')) || [],
  setRequests: (requests) => localStorage.setItem('ris_requests', JSON.stringify(requests)),
  
  getInventory: () => JSON.parse(localStorage.getItem('ris_inventory')) || {},
  setInventory: (inventory) => localStorage.setItem('ris_inventory', JSON.stringify(inventory)),

  getCurrentYear: () => new Date().getFullYear(),

  getControlNumberKey: (department) => {
    const normalizedDepartment = String(department || 'general').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `control_number_${new Date().getFullYear()}_${normalizedDepartment}`;
  },

  getNextRISNumber: () => {
    const num = parseInt(localStorage.getItem('ris_next_number')) || 0;
    localStorage.setItem('ris_next_number', String(num + 1));
    return num + 1;
  },

  getNextControlNumber: (department, requests = []) => {
    const currentYear = StorageManager.getCurrentYear();
    const normalizedDepartment = String(department || 'general').trim().toLowerCase();

    // Count all requests for this department in the current year
    const departmentRequestCount = requests.filter(request => {
      const requestDepartment = String(request.department || '').trim().toLowerCase();
      const requestYear = request.requestYear || (request.requestDate ? new Date(request.requestDate).getFullYear() : null);
      return requestDepartment === normalizedDepartment && requestYear === currentYear;
    }).length;

    // Control number is the count + 1
    return departmentRequestCount + 1;
  },

  initializeDefaults: async (force = false) => {
    const publicationCleanupKey = 'ris_publication_cleanup_v1';

    // If force is requested, clear seeding-related keys and re-seed.
    if (force || !localStorage.getItem(publicationCleanupKey)) {
      const keysToRemove = [];

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (
          key === 'ris_users' ||
          key === 'ris_requests' ||
          key === 'ris_inventory' ||
          key === 'ris_next_number' ||
          key === 'control_number' ||
          key?.startsWith('control_number_')
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      localStorage.setItem(publicationCleanupKey, 'done');
    }

    const users = StorageManager.getUsers();
    const adminEmail = 'bryanfortuno@bac.gov';
    const adminPassword = 'BAC2026';
    const adminPasswordHash = await PasswordHash.hash(adminPassword);
    const removedAccountName = 'lehm jasper moneda';
    const defaultAdmin = {
      name: 'Bryan De Guzman Fortuno',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
      department: 'BAC',
      designation: 'Admin IV',
    };

    const normalizeDepartmentAcronym = (departmentName) => {
      const normalized = String(departmentName || '')
        .replace(/[^a-z0-9]+/gi, ' ')
        .trim()
        .split(/\s+/)
        .join('');
      return normalized.slice(0, 3).toUpperCase().padEnd(3, 'X');
    };

    const normalizedUserName = (user) => String(user?.name || user?.designation || '').trim().toLowerCase();
    const normalizedUserEmail = (user) => String(user?.email || '').trim().toLowerCase();

    const filteredUsers = (Array.isArray(users) ? users : []).filter(user => {
      return normalizedUserName(user) !== removedAccountName && normalizedUserEmail(user) !== removedAccountName;
    });

    if (filteredUsers.length !== users.length) {
      StorageManager.setUsers(filteredUsers);
      const rememberedUserId = StorageManager.getRememberedUserId();
      if (rememberedUserId && !filteredUsers.some(user => user.id === rememberedUserId)) {
        StorageManager.clearRememberedUserId();
      }
    }

    // If no users exist or force is passed, seed users and assign stable ids.
    if (force || !filteredUsers || filteredUsers.length === 0) {
      const seededUsers = [];
      let nextId = 1;

      // Admin first
      seededUsers.push({ id: nextId++, ...defaultAdmin });

      for (const department of DEPARTMENTS) {
        const departmentAcronym = normalizeDepartmentAcronym(department);
        const initialPassword = `${departmentAcronym}2026`;
        seededUsers.push({
          id: nextId++,
          name: department,
          email: `${department.toLowerCase().replace(/[^a-z0-9]+/g, '_')}@bac.gov`,
          passwordHash: await PasswordHash.hash(initialPassword),
          role: 'user',
          department,
          designation: department,
        });
      }

      StorageManager.setUsers(seededUsers);
    } else {
      // Ensure admin and departments exist even if previous seed didn't run in this origin (Electron vs file URL)
      const existing = Array.isArray(filteredUsers) ? filteredUsers.slice() : [];
      const lowerEmails = new Set(existing.map(u => String(u.email || '').trim().toLowerCase()));
      let maxId = existing.reduce((m, u) => Math.max(m, u.id || 0), 0);
      let shouldPersistUsers = false;

      // Ensure admin exists
      if (!lowerEmails.has(adminEmail.toLowerCase())) {
        maxId += 1;
        existing.push({ id: maxId, ...defaultAdmin });
        lowerEmails.add(adminEmail.toLowerCase());
        shouldPersistUsers = true;
      } else {
        const adminRecord = existing.find(user => String(user.email || '').trim().toLowerCase() === adminEmail.toLowerCase());
        if (adminRecord && adminRecord.passwordHash !== adminPasswordHash) {
          adminRecord.passwordHash = adminPasswordHash;
          shouldPersistUsers = true;
        }
      }

      // Ensure each department account exists
      for (const department of DEPARTMENTS) {
        const deptEmail = `${department.toLowerCase().replace(/[^a-z0-9]+/g, '_')}@bac.gov`;
        if (!lowerEmails.has(deptEmail)) {
          maxId += 1;
          const departmentAcronym = normalizeDepartmentAcronym(department);
          const initialPassword = `${departmentAcronym}2026`;
          existing.push({
            id: maxId,
            name: department,
            email: deptEmail,
            passwordHash: await PasswordHash.hash(initialPassword),
            role: 'user',
            department,
            designation: department,
          });
          lowerEmails.add(deptEmail);
          shouldPersistUsers = true;
        }
      }

      // If we added any users, persist
      if (shouldPersistUsers) {
        StorageManager.setUsers(existing);
      }
    }

    if (!localStorage.getItem('ris_requests')) {
      StorageManager.setRequests([]);
    }

    if (!localStorage.getItem('ris_inventory')) {
      StorageManager.setInventory({});
    }

    if (!localStorage.getItem('ris_next_number')) {
      localStorage.setItem('ris_next_number', '0');
    }
  },
};

// Admin Dashboard
const AdminDashboard = ({ requests, onStatusCardClick }) => {
  const approved = requests.filter(r => r.status === 'approved').length;
  const pending = requests.filter(r => r.status === 'pending').length;
  const released = requests.filter(r => r.status === 'released').length;
  const total = requests.length;

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>📊 Admin Dashboard</h1>
      
      <div style={styles.statsGrid}>
        <div 
          style={{ ...styles.statCard, borderTop: `4px solid ${colors.navy}`, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onClick={() => onStatusCardClick('all')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
        >
          <div style={styles.statLabel}>Total RIS Requests</div>
          <div style={styles.statValue}>{total}</div>
        </div>
        <div 
          style={{ ...styles.statCard, borderTop: `4px solid ${colors.lightGreen}`, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onClick={() => onStatusCardClick('approved')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
        >
          <div style={styles.statLabel}>Approved</div>
          <div style={styles.statValue}>{approved}</div>
        </div>
        <div 
          style={{ ...styles.statCard, borderTop: `4px solid ${colors.amber}`, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onClick={() => onStatusCardClick('pending')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
        >
          <div style={styles.statLabel}>Pending</div>
          <div style={styles.statValue}>{pending}</div>
        </div>
        <div 
          style={{ ...styles.statCard, borderTop: `4px solid ${colors.forestGreen}`, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onClick={() => onStatusCardClick('released')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
        >
          <div style={styles.statLabel}>Released</div>
          <div style={styles.statValue}>{released}</div>
        </div>
      </div>
    </div>
  );
};

// Login Page Component (top-level)
const LoginPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiURL, setApiURL] = useState('http://localhost:5000');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Initialize API manager with URL
      if (typeof APIStorageManager !== 'undefined') {
        APIStorageManager.setBaseURL(apiURL);
        const user = await APIStorageManager.login(formData.email, formData.password);
        onLogin(user);
      } else {
        // Fallback for local-only mode (if API not available)
        const users = StorageManager.getUsers();
        const user = users.find(u => u.email.toLowerCase() === (formData.email || '').trim().toLowerCase());
        if (!user) {
          setError('Invalid email or password');
          setIsLoading(false);
          return;
        }
        const ok = await PasswordHash.compare(formData.password, user.passwordHash);
        if (!ok) {
          setError('Invalid email or password');
          setIsLoading(false);
          return;
        }
        onLogin(user);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Login failed');
    }
    setIsLoading(false);
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <div style={styles.loginHeader}>
          {/* City of General Trias Official Seal */}
          <div style={{
            width: '140px',
            height: '140px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            borderRadius: '50%',
            overflow: 'hidden'
          }}>
            <img 
              src="assets/logo/General_Trias_Logo.jpg" 
              alt="City of General Trias Official Seal"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%'
              }}
              onError={(e) => {
                // Fallback if image not found
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1 style={{...styles.loginTitle, textAlign: 'center', marginTop: '10px'}}>City of General Trias</h1>
          <p style={{...styles.loginSubtitle, textAlign: 'center', fontSize: '14px'}}>Requisition & Issue System</p>
        </div>

        <div style={styles.loginForm}>
          <h2 style={styles.formTitle}>Sign In</h2>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Email:</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={styles.formInput}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Password:</label>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={styles.formInput}
            />
          </div>

          {/* Advanced Settings */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{...styles.linkButton, marginBottom: '12px', fontSize: '12px'}}
          >
            {showAdvanced ? '▼' : '▶'} Advanced Settings
          </button>

          {showAdvanced && (
            <div style={{...styles.formGroup, backgroundColor: colors.lightGray, padding: '10px', borderRadius: '4px', marginBottom: '12px'}}>
              <label style={styles.formLabel}>API Server URL:</label>
              <input
                type="text"
                placeholder="http://localhost:5000"
                value={apiURL}
                onChange={(e) => setApiURL(e.target.value)}
                style={styles.formInput}
              />
              <div style={{fontSize: '11px', color: colors.darkGray, marginTop: '6px'}}>
                Enter your backend server URL. Default: http://localhost:5000
              </div>
            </div>
          )}

          {error && <div style={styles.errorBox}>{error}</div>}
          <button onClick={handleSubmit} style={styles.loginButton} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          
          <div style={styles.signUpLink}>
            Pre-seeded department and admin accounts only. Check Admin panel for complete user list.
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin RIS Requests Manager
const AdminRISRequests = ({ requests, onApprove, onReject, onMarkReleased, onUpdateIssued, onUpdateRequest, initialFilterStatus = 'all' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [issuedQuantities, setIssuedQuantities] = useState({});
  const [editingRequest, setEditingRequest] = useState(null);
  const [editData, setEditData] = useState({ description: '', items: {} });
  const [hasChanges, setHasChanges] = useState(false);

  // Update filter status when coming from dashboard
  useEffect(() => {
    setFilterStatus(initialFilterStatus);
  }, [initialFilterStatus]);

  useEffect(() => {
    if (selectedRequest?.issuedItems) {
      const issued = {};
      selectedRequest.issuedItems.forEach(item => {
        issued[item.itemId] = item.quantity;
      });
      setIssuedQuantities(issued);
    } else {
      setIssuedQuantities({});
    }
    
    // Initialize edit data
    if (selectedRequest) {
      const items = {};
      selectedRequest.items.forEach(item => {
        items[item.itemId] = item.quantity;
      });
      setEditData({
        description: selectedRequest.description,
        items: items
      });
    }
  }, [selectedRequest]);

  const handleIssuedQtyChange = (itemId, qty) => {
    setIssuedQuantities(prev => ({
      ...prev,
      [itemId]: parseInt(qty) || 0
    }));
  };

  const handleSaveIssued = () => {
    const issuedItems = Object.entries(issuedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId: parseInt(itemId), quantity: qty }));
    
    onUpdateIssued(selectedRequest.id, issuedItems);
    alert('✓ Issued quantities recorded');
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleItemQtyChange = (itemId, qty) => {
    setEditData(prev => ({
      ...prev,
      items: { ...prev.items, [itemId]: parseInt(qty) || 0 }
    }));
    setHasChanges(true);
  };

  const handleOpenEditModal = (request) => {
    const items = {};
    request.items.forEach(item => {
      items[item.itemId] = item.quantity;
    });
    setEditData({
      description: request.description,
      items: items
    });
    setEditingRequest(request);
    setHasChanges(false);
  };

  const handleSaveEdit = () => {
    if (!editData.description.trim()) {
      alert('⚠️ Description cannot be empty');
      return;
    }

    const updatedItems = Object.entries(editData.items)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId: parseInt(itemId), quantity: qty }));

    if (onUpdateRequest) {
      onUpdateRequest(editingRequest.id, {
        description: editData.description,
        items: updatedItems
      });
      setEditingRequest(null);
      setHasChanges(false);
      alert('✓ Request updated successfully');
    }
  };

  const handleCloseEditModal = () => {
    if (hasChanges) {
      const confirm = window.confirm('⚠️ You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    setEditingRequest(null);
    setEditData({ description: '', items: {} });
    setHasChanges(false);
  };

  const filtered = requests.filter(r => {
    const matchSearch = r.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return colors.lightGreen;
      case 'pending': return colors.amber;
      case 'rejected': return colors.red;
      case 'released': return colors.navy;
      default: return colors.darkGray;
    }
  };

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>📋 RIS Requests</h1>
      
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="released">Released</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div style={styles.twoColumnLayout}>
        <div style={styles.tableColumn}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th>Control #</th>
                <th>RIS #</th>
                <th>Type</th>
                <th>Department</th>
                <th>Date</th>
                <th>Status</th>
                <th>Stocks Available</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(request => (
                <tr 
                  key={request.id} 
                  onClick={() => setSelectedRequest(request)}
                  style={{
                    ...styles.tableRow,
                    backgroundColor: selectedRequest?.id === request.id ? colors.lightGray : colors.white,
                    cursor: 'pointer',
                  }}
                >
                  <td style={{...styles.tableCell, fontWeight: 'bold', color: colors.forestGreen}}>
                    {String(request.controlNumber).padStart(3, '0')}
                  </td>
                  <td style={styles.tableCell}>{request.risNumber ? `RIS-${String(request.risNumber).padStart(3, '0')}` : '—'}</td>
                  <td style={{ ...styles.tableCell, fontWeight: 'bold', color: request.requestType === 'Janitorial' ? colors.forestGreen : colors.navy }}>
                    {request.requestType || 'Office'}
                  </td>
                  <td style={styles.tableCell}>{request.department}</td>
                  <td style={styles.tableCell}>{request.requestDate}</td>
                  <td style={{ ...styles.tableCell, color: getStatusColor(request.status), fontWeight: 'bold' }}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </td>
                  <td style={{ 
                    ...styles.tableCell, 
                    fontWeight: 'bold',
                    color: request.stocksAvailable === true ? colors.lightGreen : request.stocksAvailable === false ? colors.red : colors.darkGray
                  }}>
                    {request.stocksAvailable === true ? '✓ Yes' : request.stocksAvailable === false ? '✕ No' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedRequest && (
          <div style={styles.detailPanel}>
            <h3 style={{ marginTop: 0, color: colors.navy }}>
              Control #: {String(selectedRequest.controlNumber).padStart(3, '0')}
            </h3>
            <h4 style={{ color: colors.forestGreen, margin: '8px 0' }}>
              {selectedRequest.risNumber ? `RIS-${String(selectedRequest.risNumber).padStart(3, '0')}` : 'Pending RIS Assignment'}
            </h4>
            <div style={styles.detailRow}>
              <strong>Status:</strong>
              <span style={{ color: getStatusColor(selectedRequest.status) }}>
                {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
              </span>
            </div>
            <div style={styles.detailRow}>
              <strong>Stocks Available:</strong>
              <span style={{ 
                color: selectedRequest.stocksAvailable === true ? colors.lightGreen : selectedRequest.stocksAvailable === false ? colors.red : colors.darkGray,
                fontWeight: 'bold',
                marginLeft: '8px'
              }}>
                {selectedRequest.stocksAvailable === true ? '✓ Yes' : selectedRequest.stocksAvailable === false ? '✕ No' : 'Not Released'}
              </span>
            </div>
            <div style={styles.detailRow}>
              <strong>Type:</strong> 
              <span style={{ color: selectedRequest.requestType === 'Janitorial' ? colors.forestGreen : colors.navy, fontWeight: 'bold', marginLeft: '8px' }}>
                {selectedRequest.requestType === 'Janitorial' ? '🧹' : '🏢'} {selectedRequest.requestType || 'Office'}
              </span>
            </div>
            <div style={styles.detailRow}>
              <strong>Department:</strong> {selectedRequest.department}
            </div>
            <div style={styles.detailRow}>
              <strong>Request Date:</strong> {selectedRequest.requestDate}
            </div>
            
            {selectedRequest.status === 'approved' && (
              <div style={{...styles.detailRow, marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${colors.borderGray}`}}>
                <strong style={{display: 'block', marginBottom: '8px'}}>Issued Quantities:</strong>
                <div style={{backgroundColor: colors.lightGray, padding: '10px', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto'}}>
                  {selectedRequest.items.map(item => {
                    const itemData = AVAILABLE_ITEMS.find(i => i.id === item.itemId);
                    return (
                      <div key={item.itemId} style={{marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center'}}>
                        <div style={{flex: 1, fontSize: '13px'}}>
                          <div><strong>{itemData?.stock}</strong></div>
                          <div style={{color: colors.darkGray}}>{itemData?.name}</div>
                          <div style={{color: colors.forestGreen}}>Requested: {item.quantity}</div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={issuedQuantities[item.itemId] || 0}
                          onChange={(e) => handleIssuedQtyChange(item.itemId, e.target.value)}
                          placeholder="Issued"
                          style={{width: '70px', padding: '6px', border: `1px solid ${colors.borderGray}`, borderRadius: '4px'}}
                        />
                      </div>
                    );
                  })}
                </div>
                <button 
                  onClick={handleSaveIssued}
                  style={{...styles.button, backgroundColor: colors.forestGreen, marginTop: '10px', width: '100%'}}
                >
                  💾 Save Issued Quantities
                </button>
              </div>
            )}
            
            {selectedRequest.status === 'pending' && (
              <div style={styles.actionButtons}>
                <button
                  onClick={() => handleOpenEditModal(selectedRequest)}
                  style={{ ...styles.button, backgroundColor: colors.navy }}
                >
                  ✏️ Edit Request
                </button>
                <button
                  onClick={() => onApprove(selectedRequest.id)}
                  style={{ ...styles.button, backgroundColor: colors.lightGreen }}
                >
                  ✓ Approve & Assign RIS
                </button>
                <button
                  onClick={() => onReject(selectedRequest.id)}
                  style={{ ...styles.button, backgroundColor: colors.red }}
                >
                  ✕ Reject
                </button>
              </div>
            )}
            
            {selectedRequest.status === 'approved' && (
              <div style={styles.actionButtons}>
                <button
                  onClick={() => onMarkReleased(selectedRequest.id)}
                  style={{ ...styles.button, backgroundColor: colors.navy }}
                >
                  ✓ Mark as Released
                </button>
              </div>
            )}
          </div>
        )}

        {/* EDIT MODAL */}
        {editingRequest && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}>
            <div style={{
              backgroundColor: colors.white,
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '95vh',
              overflowY: 'auto',
              position: 'relative',
            }}>
              {/* MODAL HEADER */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 20px',
                borderBottom: `2px solid ${colors.navy}`,
                backgroundColor: colors.navy,
                color: colors.white,
                position: 'sticky',
                top: 0,
                zIndex: 1001,
              }}>
                  <h2 style={{margin: 0}}>Edit Request - Ctrl: {String(editingRequest.controlNumber).padStart(3, '0')}</h2>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  {hasChanges && <span style={{color: colors.amber, fontWeight: 'bold'}}>● Unsaved Changes</span>}
                  <button 
                    onClick={handleCloseEditModal}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: colors.red,
                      color: colors.white,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* MODAL CONTENT */}
              <div style={{padding: '20px'}}>


                {/* ITEMS */}
                <div style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px', color: colors.navy}}>
                    📦 Requested Items:
                  </label>
                  <div style={{
                    backgroundColor: colors.lightGray,
                    padding: '12px',
                    borderRadius: '4px',
                    border: `1px solid ${colors.borderGray}`,
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {editingRequest.items.length > 0 ? (
                      editingRequest.items.map(item => {
                        const itemData = AVAILABLE_ITEMS.find(i => i.id === item.itemId);
                        return (
                          <div key={item.itemId} style={{
                            marginBottom: '10px',
                            padding: '10px',
                            backgroundColor: colors.white,
                            borderRadius: '4px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            border: `1px solid ${colors.borderGray}`
                          }}>
                            <div style={{flex: 1}}>
                              <div style={{fontWeight: 'bold', color: colors.navy}}>[{itemData?.stock}] {itemData?.name}</div>
                              <div style={{fontSize: '12px', color: colors.darkGray}}>Originally requested: {item.quantity}</div>
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                              <label style={{fontSize: '12px', fontWeight: 'bold'}}>Qty:</label>
                              <input
                                type="number"
                                min="0"
                                value={editData.items[item.itemId] || 0}
                                onChange={(e) => handleItemQtyChange(item.itemId, e.target.value)}
                                style={{
                                  width: '60px',
                                  padding: '6px',
                                  border: `1px solid ${colors.forestGreen}`,
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  textAlign: 'center'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{color: colors.darkGray, textAlign: 'center', padding: '10px'}}>No items in this request</div>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div style={{display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap'}}>
                  <button 
                    onClick={handleSaveEdit}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: colors.forestGreen,
                      color: colors.white,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    💾 Save Changes
                  </button>
                  <button 
                    onClick={handleCloseEditModal}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: colors.darkGray,
                      color: colors.white,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Admin Inventory Report
const AdminInventory = ({ requests }) => {
  const [filterRIS, setFilterRIS] = useState('');

  const approvedRequests = requests.filter(r => r.status === 'approved' || r.status === 'released');
  
  const filteredRequests = filterRIS 
    ? approvedRequests.filter(r => r.risNumber === parseInt(filterRIS))
    : approvedRequests;

  const risNumbers = approvedRequests
    .filter(r => r.risNumber)
    .map(r => r.risNumber)
    .sort((a, b) => a - b);

  // Build inventory matrix
  const matrix = {};
  AVAILABLE_ITEMS.forEach(item => {
    matrix[item.id] = {};
    DEPARTMENTS.forEach(dept => {
      matrix[item.id][dept] = 0;
    });
  });

  filteredRequests.forEach(request => {
    // Use issued items (actual quantities) instead of requested items
    const itemsToUse = request.issuedItems && request.issuedItems.length > 0 ? request.issuedItems : request.items;
    itemsToUse.forEach(item => {
      if (matrix[item.itemId]) {
        matrix[item.itemId][request.department] = (matrix[item.itemId][request.department] || 0) + item.quantity;
      }
    });
  });

  const rowTotals = {};
  const colTotals = {};
  DEPARTMENTS.forEach(d => { colTotals[d] = 0; });

  Object.entries(matrix).forEach(([itemId, depts]) => {
    let itemTotal = 0;
    Object.entries(depts).forEach(([dept, qty]) => {
      itemTotal += qty;
      colTotals[dept] = (colTotals[dept] || 0) + qty;
    });
    rowTotals[itemId] = itemTotal;
  });

  let grandTotal = Object.values(colTotals).reduce((a, b) => a + b, 0);

  const exportToExcel = () => {
    // Build CSV with only items that have quantities > 0
    const rows = [];
    rows.push(['Item', ...DEPARTMENTS, 'Total']);
    
    AVAILABLE_ITEMS.forEach(item => {
      const itemTotal = rowTotals[item.id];
      if (itemTotal > 0) { // Only include items with values
        const row = [item.name];
        DEPARTMENTS.forEach(dept => {
          row.push(matrix[item.id][dept] || 0);
        });
        row.push(itemTotal);
        rows.push(row);
      }
    });
    
    // Add totals row
    const totalsRow = ['Total', ...DEPARTMENTS.map(dept => colTotals[dept] || 0), grandTotal];
    rows.push(totalsRow);
    
    // Create CSV content
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `RIS-Inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>📊 Inventory Report</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
        <div style={styles.filterBar}>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter by RIS No.:</label>
          <select value={filterRIS} onChange={(e) => setFilterRIS(e.target.value)} style={styles.filterSelect}>
            <option value="">All RIS</option>
            {risNumbers.map(num => (
              <option key={num} value={num}>RIS-{String(num).padStart(3, '0')}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={exportToExcel}
          style={{
            ...styles.submitButton,
            padding: '8px 15px',
            fontSize: '14px',
            backgroundColor: colors.forestGreen,
            cursor: 'pointer'
          }}
        >
          Export to Excel
        </button>
      </div>

      <div style={styles.tableOverflow}>
        <table style={styles.inventoryTable}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.itemColumn}>Item</th>
              {DEPARTMENTS.map(dept => (
                <th key={dept} style={styles.deptColumn}>{dept}</th>
              ))}
              <th style={styles.totalColumn}>Total</th>
            </tr>
          </thead>
          <tbody>
            {AVAILABLE_ITEMS.map(item => (
              <tr key={item.id} style={styles.tableRow}>
                <td style={{ ...styles.tableCell, fontWeight: 'bold', backgroundColor: colors.lightGray }}>
                  {item.name}
                </td>
                {DEPARTMENTS.map(dept => (
                  <td key={dept} style={{ ...styles.tableCell, textAlign: 'center' }}>
                    {matrix[item.id][dept] || 0}
                  </td>
                ))}
                <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 'bold', backgroundColor: colors.lightGray }}>
                  {rowTotals[item.id]}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ ...styles.tableRow, backgroundColor: colors.navy, color: colors.white }}>
              <td style={{ ...styles.tableCell, fontWeight: 'bold' }}>Total</td>
              {DEPARTMENTS.map(dept => (
                <td key={dept} style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 'bold' }}>
                  {colTotals[dept] || 0}
                </td>
              ))}
              <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 'bold' }}>
                {grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// Admin RIS Images/Details
const AdminRISImages = ({ requests, onUpdateIssued }) => {
  const [selectedRIS, setSelectedRIS] = useState(null);
  const [formData, setFormData] = useState({
    stockAvailable: {},
    remarks: {},
    issuedQty: {},
  });
  const [hasChanges, setHasChanges] = useState(false);

  const approvedRequests = requests
    .filter(r => (r.status === 'approved' || r.status === 'released') && r.risNumber)
    .sort((a, b) => b.risNumber - a.risNumber);

  const selectedRequest = selectedRIS 
    ? requests.find(r => r.id === selectedRIS)
    : null;

  // Split items into pages: ~12 items per page for A4 paper
  const ITEMS_PER_PAGE = 25;
  
  const getItemPages = (items) => {
    const pages = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      pages.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
  };

  const handleFieldChange = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...prev[field], [itemId]: value }
    }));
    setHasChanges(true);
  };

  const handleSaveDocument = () => {
    if (selectedRequest) {
      const issuedItems = Object.entries(formData.issuedQty)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => ({ itemId: parseInt(itemId), quantity: parseInt(qty) }));
      
      onUpdateIssued(selectedRequest.id, issuedItems);
      setHasChanges(false);
      alert('✓ RIS Document saved successfully');
    }
  };

  const handleCloseModal = () => {
    if (hasChanges) {
      const confirm = window.confirm('⚠️ You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    setSelectedRIS(null);
    setFormData({ stockAvailable: {}, remarks: {}, issuedQty: {} });
    setHasChanges(false);
  };

  const handleSelectRIS = (id) => {
    if (selectedRIS && hasChanges) {
      const confirm = window.confirm('⚠️ You have unsaved changes. Close without saving?');
      if (!confirm) return;
    }
    setSelectedRIS(id);
    const request = requests.find(r => r.id === id);
    const issued = {};
    request?.issuedItems?.forEach(item => {
      issued[item.itemId] = item.quantity;
    });
    setFormData({ stockAvailable: {}, remarks: {}, issuedQty: issued });
    setHasChanges(false);
  };

  return (
    <div style={{...styles.pageContainer, margin: 0, maxWidth: 'none', width: '100%', height: '100%'}}>
      <div className="ris-numbers-list" style={{...styles.tableColumn, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0}}>
        <h3 style={styles.panelTitle}>RIS Numbers</h3>
        <div className="ris-scroll-hidden" style={{...styles.risList, maxHeight: 'none', flex: 1, minHeight: 0}}>
          {approvedRequests.length > 0 ? (
            approvedRequests.map(request => (
              <div
                key={request.id}
                onClick={() => handleSelectRIS(request.id)}
                style={{
                  ...styles.risItem,
                  backgroundColor: selectedRIS === request.id ? colors.lightGreen : colors.white,
                  color: selectedRIS === request.id ? colors.white : colors.navy,
                  cursor: 'pointer',
                }}
              >
                <strong>RIS-{String(request.risNumber).padStart(3, '0')}</strong>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Ctrl: {String(request.controlNumber).padStart(3, '0')}</div>
                <div style={{ fontSize: '12px' }}>{request.department}</div>
              </div>
            ))
          ) : (
            <div style={styles.emptyPane}>No approved RIS</div>
          )}
        </div>
      </div>

      {/* MODAL WINDOW */}
      {selectedRequest && (
        <div className="ris-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="ris-print-form" style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            maxWidth: '1000px',
            width: '100%',
            maxHeight: '95vh',
            overflowY: 'auto',
            position: 'relative',
          }}>
            {/* MODAL HEADER */}
            <div className="ris-modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px 20px',
              borderBottom: `2px solid ${colors.navy}`,
              backgroundColor: colors.navy,
              color: colors.white,
              position: 'sticky',
              top: 0,
              zIndex: 1001,
            }}>
              <div></div>
              <h2 style={{margin: 0, flex: 1, textAlign: 'center'}}>RIS-{String(selectedRequest.risNumber).padStart(3, '0')}</h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                {hasChanges && <span style={{color: colors.amber, fontWeight: 'bold'}}>● Unsaved Changes</span>}
                <button 
                  onClick={handleCloseModal}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: colors.red,
                    color: colors.white,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* MODAL CONTENT */}
            <div style={{padding: '20px', fontFamily: 'Georgia, serif', overflowY: 'auto', maxHeight: 'calc(95vh - 80px)', '@media print': { overflow: 'visible', maxHeight: 'none' }}}>
              {selectedRequest && (() => {
                const itemPages = getItemPages(selectedRequest.items);
                return (
                  <>
                    {itemPages.map((pageItems, pageIndex) => {
                      const isLastPage = pageIndex === itemPages.length - 1;
                      
                      return (
                        <div 
                          key={pageIndex}
                          className={`ris-print-page ${isLastPage ? 'last-page' : ''}`}
                          style={{
                            marginBottom: pageIndex < itemPages.length - 1 ? '20px' : '0',
                            width: '100%',
                            overflow: 'visible',
                          }}
                        >
                          {/* FORM TITLE */}
                          <div style={{textAlign: 'center', marginBottom: '15px'}}>
                            <h2 style={{margin: 0, fontSize: '16px', fontWeight: 'bold'}}>REQUISITION AND ISSUE SLIP</h2>
                            {pageIndex === 0 && (
                              <div style={{fontSize: '13px', fontWeight: 'bold', color: colors.navy, marginTop: '8px'}}>
                                Control No.: {String(selectedRequest.controlNumber).padStart(3, '0')} | RIS No.: RIS-{String(selectedRequest.risNumber).padStart(3, '0')}
                              </div>
                            )}
                            {pageIndex > 0 && (
                              <div style={{fontSize: '11px', color: colors.darkGray, marginTop: '5px'}}>
                                (Continuation - Page {pageIndex + 1} | Control No.: {String(selectedRequest.controlNumber).padStart(3, '0')})
                              </div>
                            )}
                          </div>

                          {/* RIS DOCUMENT FORM */}
                          <div style={{border: `2px solid ${colors.navy}`, padding: '20px'}}>
                            {/* ENTITY INFO - Show on first page only */}
                            {pageIndex === 0 && (
                              <>
                                {/* ENTITY INFO */}
                                <div style={{marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                                  <div>
                                    <div style={{fontSize: '12px', marginBottom: '3px'}}><strong>Entity Name:</strong></div>
                                    <div style={{borderBottom: `1px solid ${colors.navy}`, padding: '5px', fontWeight: 'bold'}}>CITY OF GENERAL TRIAS</div>
                                  </div>
                                  <div>
                                    <div style={{fontSize: '12px', marginBottom: '3px'}}><strong>Fund Cluster:</strong></div>
                                    <div style={{borderBottom: `1px solid ${colors.navy}`, padding: '5px'}}>General Fund</div>
                                  </div>
                                </div>

                                {/* OFFICE/DIVISION INFO */}
                                <div style={{marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                                  <div>
                                    <div style={{fontSize: '12px', marginBottom: '3px'}}><strong>Office:</strong></div>
                                    <div style={{borderBottom: `1px solid ${colors.navy}`, padding: '5px'}}>{selectedRequest.department}</div>
                                  </div>
                                  <div>
                                    <div style={{fontSize: '12px', marginBottom: '3px'}}><strong>Responsibility Center Code:</strong></div>
                                    <div style={{borderBottom: `1px solid ${colors.navy}`, padding: '5px', fontWeight: 'bold'}}>{String(selectedRequest.controlNumber).padStart(3, '0')}</div>
                                  </div>
                                </div>

                                <div style={{marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                                  <div>
                                    <div style={{fontSize: '12px', marginBottom: '3px'}}><strong>Division:</strong></div>
                                    <div style={{borderBottom: `1px solid ${colors.navy}`, padding: '5px'}}>{selectedRequest.requestType}</div>
                                  </div>
                                  <div>
                                    <div style={{fontSize: '12px', marginBottom: '3px'}}><strong>RIS No.:</strong></div>
                                    <div style={{border: `1px solid ${colors.navy}`, backgroundColor: colors.white, padding: '5px', fontWeight: 'bold'}}>RIS-{String(selectedRequest.risNumber).padStart(3, '0')}</div>
                                  </div>
                                </div>
                              </>
                            )}

                            {/* ITEMS TABLE - MATCHING EXCEL STRUCTURE */}
                            <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px', border: `1px solid ${colors.navy}`}}>
                              <thead>
                                {/* MAIN HEADERS */}
                                <tr style={{backgroundColor: colors.lightGray, borderBottom: `1px solid ${colors.navy}`}}>
                                  <th rowSpan="2" style={{border: `1px solid ${colors.navy}`, padding: '8px', textAlign: 'center', fontWeight: 'bold'}}>Stock No.</th>
                                  <th rowSpan="2" style={{border: `1px solid ${colors.navy}`, padding: '8px', textAlign: 'center', fontWeight: 'bold'}}>Unit</th>
                                  <th rowSpan="2" style={{border: `1px solid ${colors.navy}`, padding: '8px', textAlign: 'left', fontWeight: 'bold'}}>Description</th>
                                  <th colSpan="3" style={{border: `1px solid ${colors.navy}`, padding: '8px', textAlign: 'center', fontWeight: 'bold'}}>Requisition</th>
                                  <th colSpan="2" style={{border: `1px solid ${colors.navy}`, padding: '8px', textAlign: 'center', fontWeight: 'bold'}}>Issue</th>
                                </tr>
                                {/* SUB HEADERS */}
                                <tr style={{backgroundColor: colors.lightGray, borderBottom: `1px solid ${colors.navy}`}}>
                                  <th style={{border: `1px solid ${colors.navy}`, padding: '6px', fontSize: '10px', textAlign: 'center'}}>Qty</th>
                                  <th style={{border: `1px solid ${colors.navy}`, padding: '6px', fontSize: '10px', textAlign: 'center'}}>Stock<br/>Available?</th>
                                  <th style={{border: `1px solid ${colors.navy}`, padding: '6px', fontSize: '10px', textAlign: 'center'}}>Yes/No</th>
                                  <th style={{border: `1px solid ${colors.navy}`, padding: '6px', fontSize: '10px', textAlign: 'center'}}>Qty</th>
                                  <th style={{border: `1px solid ${colors.navy}`, padding: '6px', fontSize: '10px', textAlign: 'center'}}>Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pageItems.map((item, idx) => {
                                  const itemData = AVAILABLE_ITEMS.find(i => i.id === item.itemId);
                                  return (
                                    <tr key={item.itemId} style={{borderBottom: `1px solid ${colors.navy}`, height: '35px'}}>
                                      <td style={{border: `1px solid ${colors.navy}`, padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px'}}>{itemData?.stock}</td>
                                      <td style={{border: `1px solid ${colors.navy}`, padding: '6px', textAlign: 'center', fontSize: '10px'}}>pcs</td>
                                      <td style={{border: `1px solid ${colors.navy}`, padding: '6px', fontSize: '10px'}}>{itemData?.name}</td>
                                      <td style={{border: `1px solid ${colors.navy}`, padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px'}}>{item.quantity}</td>
                                      <td style={{border: `1px solid ${colors.navy}`, padding: '6px', textAlign: 'center', fontSize: '9px'}}>Stock Available?</td>
                                      <td style={{border: `1px solid ${colors.navy}`, padding: '4px', textAlign: 'center'}}>
                                        {selectedRequest.stocksAvailable !== null && selectedRequest.stocksAvailable !== undefined ? (
                                          <div style={{
                                            fontWeight: 'bold',
                                            color: selectedRequest.stocksAvailable ? colors.lightGreen : colors.red,
                                            fontSize: '10px'
                                          }}>
                                            {selectedRequest.stocksAvailable ? '✓ Yes' : '✕ No'}
                                          </div>
                                        ) : (
                                          <select 
                                            value={formData.stockAvailable[item.itemId] || ''} 
                                            onChange={(e) => handleFieldChange(item.itemId, 'stockAvailable', e.target.value)}
                                            style={{width: '60px', padding: '3px', fontSize: '10px'}}
                                          >
                                            <option value="">—</option>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                          </select>
                                        )}
                                      </td>
                                      <td style={{border: `1px solid ${colors.navy}`, padding: '4px'}}>
                                        <input 
                                          type="number" 
                                          min="0" 
                                          value={formData.issuedQty[item.itemId] === 0 ? '' : (formData.issuedQty[item.itemId] || '')}
                                          onChange={(e) => handleFieldChange(item.itemId, 'issuedQty', e.target.value)}
                                          placeholder=""
                                          style={{width: '45px', padding: '3px', fontSize: '10px', textAlign: 'center'}}
                                        />
                                      </td>
                                      <td style={{border: `1px solid ${colors.navy}`, padding: '4px'}}>
                                        <input 
                                          type="text" 
                                          value={formData.remarks[item.itemId] || ''}
                                          onChange={(e) => handleFieldChange(item.itemId, 'remarks', e.target.value)}
                                          placeholder=""
                                          style={{width: '70px', padding: '3px', fontSize: '10px'}}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>



                            {/* APPROVAL SECTION - Show on last page only */}
                            {isLastPage && (
                              <table style={{width: '100%', borderCollapse: 'collapse', border: `1px solid ${colors.navy}`, fontSize: '10px', tableLayout: 'fixed'}}>
                                <tbody>
                                  <tr style={{borderBottom: `1px solid ${colors.navy}`, height: '60px'}}>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '6px', verticalAlign: 'bottom'}}></td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '6px', verticalAlign: 'bottom'}}></td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '6px', verticalAlign: 'bottom'}}></td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '6px', verticalAlign: 'bottom'}}></td>
                                  </tr>
                                  <tr style={{borderBottom: `1px solid ${colors.navy}`, height: '30px'}}>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '3px', verticalAlign: 'middle', textAlign: 'center', width: '25%'}}>
                                      <div style={{fontSize: '10px', fontWeight: 'bold', lineHeight: '1.2'}}>{selectedRequest.requesterName || ''}</div>
                                    </td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '3px', verticalAlign: 'middle', textAlign: 'center', width: '25%'}}>
                                      <div style={{fontSize: '10px', fontWeight: 'bold', lineHeight: '1.2'}}>{selectedRequest.approverName || ''}</div>
                                    </td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '3px', verticalAlign: 'middle', textAlign: 'center', width: '25%'}}>
                                      <div style={{fontSize: '10px', fontWeight: 'bold', lineHeight: '1.2'}}>Bryan Fortuno</div>
                                    </td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '3px', verticalAlign: 'middle', textAlign: 'center', width: '25%'}}>
                                      <div style={{fontSize: '10px', fontWeight: 'bold', lineHeight: '1.2'}}></div>
                                    </td>
                                  </tr>
                                  <tr style={{borderBottom: `1px solid ${colors.navy}`, height: '20px'}}>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '3px', textAlign: 'center', fontSize: '8px', width: '25%'}}>{selectedRequest.requesterDesignation || ''}</td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '3px', textAlign: 'center', fontSize: '8px', width: '25%'}}>{selectedRequest.approverDesignation || ''}</td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '3px', textAlign: 'center', fontSize: '8px', width: '25%'}}>Admin Officer IV</td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '3px', textAlign: 'center', fontSize: '8px', width: '25%'}}></td>
                                  </tr>
                                  <tr style={{height: '16px'}}>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '2px', textAlign: 'center', width: '25%'}}>
                                      <div style={{fontSize: '8px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                        {selectedRequest.requesterDate || ''}
                                      </div>
                                    </td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '2px', textAlign: 'center', width: '25%'}}>
                                      <div style={{fontSize: '8px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                        {selectedRequest.approverDate || ''}
                                      </div>
                                    </td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '2px', textAlign: 'center', width: '25%'}}>
                                      <div style={{fontSize: '8px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                        {selectedRequest.issuedDate || ''}
                                      </div>
                                    </td>
                                    <td style={{border: `1px solid ${colors.navy}`, padding: '2px', textAlign: 'center', width: '25%'}}>
                                      <div style={{fontSize: '8px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                        {selectedRequest.receivedDate || ''}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            )}

                            {/* ACTION BUTTONS - Show on last page only */}
                            {isLastPage && (
                              <div style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', '@media print': {display: 'none'}}}>
                                <button 
                                  onClick={handleSaveDocument}
                                  style={{padding: '10px 20px', backgroundColor: colors.forestGreen, color: colors.white, border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}
                                >
                                  💾 Save Document
                                </button>
                                <button 
                                  onClick={() => window.print()}
                                  style={{padding: '10px 20px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}
                                >
                                  🖨️ Print
                                </button>
                                <button 
                                  onClick={handleCloseModal}
                                  style={{padding: '10px 20px', backgroundColor: colors.darkGray, color: colors.white, border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}
                                >
                                  ✕ Close
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// User - My Requests Component
const UserMyRequests = ({ requests, currentUser }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const userRequests = requests.filter(r => r.department === currentUser.department);

  const stats = {
    total: userRequests.length,
    approved: userRequests.filter(r => r.status === 'approved').length,
    pending: userRequests.filter(r => r.status === 'pending').length,
    released: userRequests.filter(r => r.status === 'released').length,
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return colors.lightGreen;
      case 'pending': return colors.amber;
      case 'released': return colors.navy;
      case 'rejected': return colors.red;
      default: return colors.darkGray;
    }
  };

  if (selectedRequest) {
    return (
      <div style={styles.pageContainer}>
        <h1 style={styles.pageTitle}>📋 Request Details</h1>
        <button onClick={() => setSelectedRequest(null)} style={{...styles.submitButton, marginBottom: '15px', backgroundColor: colors.navy}}>
          ← Back to List
        </button>
        <div style={styles.detailsPanel}>
          <div style={{...styles.detailRow, marginBottom: '20px', paddingBottom: '10px', borderBottom: `1px solid ${colors.borderGray}`}}>
            <strong>Control #:</strong> {String(selectedRequest.controlNumber).padStart(3, '0')}
          </div>
          <div style={styles.detailRow}>
            <strong>RIS #:</strong> {selectedRequest.risNumber ? `RIS-${String(selectedRequest.risNumber).padStart(3, '0')}` : 'Not Yet Assigned'}
          </div>
          <div style={styles.detailRow}>
            <strong>Department:</strong> {selectedRequest.department}
          </div>
          <div style={styles.detailRow}>
            <strong>Type:</strong> {selectedRequest.requestType}
          </div>
          <div style={styles.detailRow}>
            <strong>Description:</strong> {selectedRequest.description}
          </div>
          <div style={styles.detailRow}>
            <strong>Date Submitted:</strong> {selectedRequest.requestDate}
          </div>
          <div style={{...styles.detailRow, color: getStatusColor(selectedRequest.status), fontWeight: 'bold'}}>
            <strong>Status:</strong> {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>📋 My RIS Requests</h1>
      
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: `4px solid ${colors.navy}` }}>
          <div style={styles.statLabel}>Total Requests</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: `4px solid ${colors.lightGreen}` }}>
          <div style={styles.statLabel}>Approved</div>
          <div style={styles.statValue}>{stats.approved}</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: `4px solid ${colors.amber}` }}>
          <div style={styles.statLabel}>Pending</div>
          <div style={styles.statValue}>{stats.pending}</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: `4px solid ${colors.navy}` }}>
          <div style={styles.statLabel}>Released</div>
          <div style={styles.statValue}>{stats.released}</div>
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th>Control #</th>
            <th>RIS #</th>
            <th>Type</th>
            <th>Description</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {userRequests.length > 0 ? (
            userRequests.map(request => {
              return (
                <tr key={request.id} style={{...styles.tableRow, cursor: 'pointer'}} onClick={() => setSelectedRequest(request)}>
                  <td style={{...styles.tableCell, fontWeight: 'bold', color: colors.forestGreen}}>
                    {String(request.controlNumber).padStart(3, '0')}
                  </td>
                  <td style={styles.tableCell}>{request.risNumber ? `RIS-${String(request.risNumber).padStart(3, '0')}` : '—'}</td>
                  <td style={{ ...styles.tableCell, fontWeight: 'bold', color: request.requestType === 'Janitorial' ? colors.forestGreen : colors.navy }}>
                    {request.requestType}
                  </td>
                  <td style={styles.tableCell}>{request.description}</td>
                  <td style={styles.tableCell}>{request.requestDate}</td>
                  <td style={{
                    ...styles.tableCell,
                    color: getStatusColor(request.status),
                    fontWeight: 'bold'
                  }}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="6" style={{ ...styles.tableCell, textAlign: 'center', color: colors.darkGray }}>
                No requests yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// Admin Stock Management Component
const AdminStockManagement = ({ inventory, onRestockItem }) => {
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredItems = AVAILABLE_ITEMS.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.stock.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || item.type === filterType;
    return matchSearch && matchType;
  });

  const handleRestockClick = (item) => {
    setSelectedItem(item);
    setRestockQuantity('');
    setRestockNotes('');
    setShowRestockModal(true);
  };

  const handleConfirmRestock = () => {
    if (!restockQuantity || parseInt(restockQuantity) <= 0) {
      alert('⚠️ Please enter a valid quantity');
      return;
    }

    onRestockItem(selectedItem.id, parseInt(restockQuantity), restockNotes);
    setShowRestockModal(false);
    setSelectedItem(null);
    setRestockQuantity('');
    setRestockNotes('');
    alert('✓ Item restocked successfully');
  };

  const handleCloseRestockModal = () => {
    setShowRestockModal(false);
    setSelectedItem(null);
    setRestockQuantity('');
    setRestockNotes('');
  };

  const getLowStockColor = (itemId) => {
    const stock = inventory[itemId] || 0;
    if (stock === 0) return colors.red;
    if (stock < 10) return colors.amber;
    return colors.lightGreen;
  };

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>📦 Stock Management</h1>
      
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 Search by item name or stock number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.filterSelect}>
          <option value="all">All Types</option>
          <option value="Office">Office Supplies</option>
          <option value="Janitorial">Janitorial Items</option>
        </select>
      </div>

      <div style={styles.tableOverflow}>
        <table style={styles.stockTable}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={{...styles.tableCell, textAlign: 'left'}}>Stock #</th>
              <th style={{...styles.tableCell, textAlign: 'left'}}>Item Name</th>
              <th style={{...styles.tableCell, textAlign: 'left'}}>Category</th>
              <th style={{...styles.tableCell, textAlign: 'left'}}>Type</th>
              <th style={{...styles.tableCell, textAlign: 'center'}}>Current Stock</th>
              <th style={{...styles.tableCell, textAlign: 'center'}}>Status</th>
              <th style={{...styles.tableCell, textAlign: 'center'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const currentStock = inventory[item.id] || 0;
              const statusText = currentStock === 0 ? '🔴 Out of Stock' : currentStock < 10 ? '🟡 Low Stock' : '🟢 In Stock';
              return (
                <tr key={item.id} style={styles.tableRow}>
                  <td style={{...styles.tableCell, fontWeight: 'bold', color: colors.forestGreen}}>
                    {item.stock}
                  </td>
                  <td style={styles.tableCell}>{item.name}</td>
                  <td style={styles.tableCell}>{item.category}</td>
                  <td style={{...styles.tableCell, fontWeight: 'bold', color: item.type === 'Janitorial' ? colors.forestGreen : colors.navy}}>
                    {item.type === 'Janitorial' ? '🧹' : '🏢'} {item.type}
                  </td>
                  <td style={{
                    ...styles.tableCell,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: getLowStockColor(item.id),
                    fontSize: '16px'
                  }}>
                    {currentStock}
                  </td>
                  <td style={{
                    ...styles.tableCell,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: getLowStockColor(item.id)
                  }}>
                    {statusText}
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      onClick={() => handleRestockClick(item)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: colors.forestGreen,
                        color: colors.white,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        width: '100%'
                      }}
                    >
                      ➕ Restock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showRestockModal && selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            maxWidth: '600px',
            width: '100%',
            padding: '30px',
            position: 'relative',
          }}>
            <h2 style={{margin: '0 0 20px 0', color: colors.navy, textAlign: 'center'}}>
              ➕ Restock Item
            </h2>
            
            <div style={{
              backgroundColor: colors.lightGray,
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              borderLeft: `4px solid ${colors.forestGreen}`
            }}>
              <div style={{marginBottom: '8px'}}>
                <strong>Stock #:</strong> {selectedItem.stock}
              </div>
              <div style={{marginBottom: '8px'}}>
                <strong>Item Name:</strong> {selectedItem.name}
              </div>
              <div style={{marginBottom: '8px'}}>
                <strong>Current Stock:</strong> <span style={{color: colors.forestGreen, fontWeight: 'bold', fontSize: '16px'}}>{inventory[selectedItem.id] || 0}</span>
              </div>
            </div>

            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px', color: colors.navy}}>
                📊 Quantity to Add:
              </label>
              <input
                type="number"
                min="1"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                placeholder="Enter quantity"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${colors.forestGreen}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'Georgia, serif'
                }}
              />
            </div>

            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px', color: colors.navy}}>
                📝 Notes (Optional):
              </label>
              <textarea
                value={restockNotes}
                onChange={(e) => setRestockNotes(e.target.value)}
                placeholder="e.g., New supplier delivery"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colors.borderGray}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  minHeight: '60px',
                  boxSizing: 'border-box',
                  fontFamily: 'Georgia, serif'
                }}
              />
            </div>

            <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
              <button
                onClick={handleConfirmRestock}
                style={{
                  padding: '12px 30px',
                  backgroundColor: colors.forestGreen,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                ✓ Confirm Restock
              </button>
              <button
                onClick={handleCloseRestockModal}
                style={{
                  padding: '12px 30px',
                  backgroundColor: colors.red,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// User - New Request Component
const UserNewRequest = ({ currentUser, onSubmitRequest, requests }) => {
  const [formData, setFormData] = useState({
    requestType: 'Office',
    items: {},
  });
  const [itemSearch, setItemSearch] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    requesterName: '',
    requesterDesignation: '',
    approverName: '',
    approverDesignation: '',
  });
  const [pendingRequest, setPendingRequest] = useState(null);

  const handleItemChange = (itemId, quantity) => {
    setFormData(prev => ({
      ...prev,
      items: { ...prev.items, [itemId]: parseInt(quantity) || 0 }
    }));
  };

  const handleSubmit = () => {
    const selectedItems = Object.entries(formData.items)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId: parseInt(itemId), quantity: qty }));

    if (!formData.requestType) {
      alert('⚠️ Please select a request type and at least one item');
      return;
    }

    // Auto-fill dates when submitting
    const todayDate = new Date().toISOString().split('T')[0];

    const requestData = {
      department: currentUser.department,
      requestType: formData.requestType,
      items: selectedItems,
      requestDate: todayDate,
      status: 'pending',
      userId: currentUser.id,
    };

    setPendingRequest(requestData);
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = () => {
    if (!approvalData.requesterName.trim() || !approvalData.requesterDesignation.trim() || 
        !approvalData.approverName.trim() || !approvalData.approverDesignation.trim()) {
      alert('⚠️ Please fill in all approval information');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0];

    onSubmitRequest({
      ...pendingRequest,
      requesterName: approvalData.requesterName,
      requesterDesignation: approvalData.requesterDesignation,
      approverName: approvalData.approverName,
      approverDesignation: approvalData.approverDesignation,
      requesterDate: todayDate,
      approverDate: todayDate,
      issuedDate: '',
      receivedDate: '',
    });

    setFormData({ requestType: 'Office', items: {} });
    setApprovalData({
      requesterName: '',
      requesterDesignation: '',
      approverName: '',
      approverDesignation: '',
    });
    setPendingRequest(null);
    setShowApprovalModal(false);
    alert('✓ Request submitted for approval');
  };

  const handleCloseApprovalModal = () => {
    setShowApprovalModal(false);
    setPendingRequest(null);
  };

  // Filter items by selected request type and search term
  const filteredItems = AVAILABLE_ITEMS.filter(item => 
    item.type === formData.requestType && 
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>➕ Submit New RIS Request</h1>
      
      <div style={styles.formContainer}>
        <div style={styles.infoBox}>
          📋 <strong>Department:</strong> {currentUser.department}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Request Type:</label>
          <div style={styles.requestTypeButtons}>
            {REQUEST_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setFormData({ ...formData, requestType: type, items: {} })}
                style={{
                  ...styles.typeButton,
                  backgroundColor: formData.requestType === type ? colors.forestGreen : colors.lightGray,
                  color: formData.requestType === type ? colors.white : colors.navy,
                  borderColor: formData.requestType === type ? colors.forestGreen : colors.borderGray,
                }}
              >
                {type === 'Office' ? '🏢' : '🧹'} {type}
              </button>
            ))}
          </div>
        </div>



        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Required Items & Quantities:</label>
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="🔍 Search items..."
            style={{...styles.formInput, marginBottom: '12px'}}
          />
          <div style={styles.itemsGrid}>
            {filteredItems.map(item => (
              <div key={item.id} style={styles.itemInput}>
                <label style={styles.itemLabel}>{item.name}</label>
                <input
                  type="number"
                  min="0"
                  value={formData.items[item.id] || 0}
                  onChange={(e) => handleItemChange(item.id, e.target.value)}
                  placeholder="Qty"
                  style={styles.quantityInput}
                />
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} style={styles.submitButton}>
          ✓ Submit Request
        </button>
      </div>

      {/* APPROVAL INFO MODAL */}
      {showApprovalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            maxWidth: '600px',
            width: '100%',
            padding: '30px',
            position: 'relative',
          }}>
            <h2 style={{margin: '0 0 20px 0', color: colors.navy, textAlign: 'center'}}>
              📋 Approval Information
            </h2>
            <p style={{color: colors.darkGray, marginBottom: '20px', textAlign: 'center'}}>
              Please provide the names and designations of the requester and approver
            </p>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
              {/* REQUESTER SECTION */}
              <div style={{borderRight: `2px solid ${colors.borderGray}`, paddingRight: '15px'}}>
                <h3 style={{color: colors.navy, marginTop: 0, marginBottom: '15px', fontSize: '14px', textAlign: 'center'}}>Requester</h3>
                <div style={{marginBottom: '15px'}}>
                  <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: colors.navy, fontSize: '13px'}}>
                    📝 Name:
                  </label>
                  <input
                    type="text"
                    value={approvalData.requesterName}
                    onChange={(e) => setApprovalData({...approvalData, requesterName: e.target.value})}
                    placeholder="Full name"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `2px solid ${colors.forestGreen}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: colors.navy, fontSize: '13px'}}>
                    💼 Designation:
                  </label>
                  <input
                    type="text"
                    value={approvalData.requesterDesignation}
                    onChange={(e) => setApprovalData({...approvalData, requesterDesignation: e.target.value})}
                    placeholder="e.g., Officer I"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `2px solid ${colors.forestGreen}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* APPROVER SECTION */}
              <div style={{paddingLeft: '15px'}}>
                <h3 style={{color: colors.navy, marginTop: 0, marginBottom: '15px', fontSize: '14px', textAlign: 'center'}}>Approver</h3>
                <div style={{marginBottom: '15px'}}>
                  <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: colors.navy, fontSize: '13px'}}>
                    📝 Name:
                  </label>
                  <input
                    type="text"
                    value={approvalData.approverName}
                    onChange={(e) => setApprovalData({...approvalData, approverName: e.target.value})}
                    placeholder="Full name"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `2px solid ${colors.forestGreen}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: colors.navy, fontSize: '13px'}}>
                    💼 Designation:
                  </label>
                  <input
                    type="text"
                    value={approvalData.approverDesignation}
                    onChange={(e) => setApprovalData({...approvalData, approverDesignation: e.target.value})}
                    placeholder="e.g., Head"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `2px solid ${colors.forestGreen}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
              <button 
                onClick={handleApprovalSubmit}
                style={{
                  padding: '12px 30px',
                  backgroundColor: colors.forestGreen,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                ✓ Confirm
              </button>
              <button 
                onClick={handleCloseApprovalModal}
                style={{
                  padding: '12px 30px',
                  backgroundColor: colors.red,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// User Accounts Management Component
const UserAccountsManagement = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        if (typeof APIStorageManager !== 'undefined' && APIStorageManager.getUsers) {
          const allUsers = await APIStorageManager.getUsers();
          setUsers(Array.isArray(allUsers) ? allUsers : []);
          console.log('[UserAccountsManagement] Fetched users from API:', allUsers);
        } else {
          // Fallback to localStorage
          const localUsers = StorageManager.getUsers();
          setUsers(Array.isArray(localUsers) ? localUsers : []);
        }
      } catch (err) {
        console.error('[UserAccountsManagement] Failed to fetch users:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAdmin = (currentUser.role || '').toLowerCase() === 'admin';

  const getInitialPassword = (user) => {
    // Admin always uses BAC2026
    if ((user.role || '').toLowerCase() === 'admin') {
      return 'BAC2026';
    }
    
    // For regular users, extract the email prefix and convert to password
    // Email format: {acronym}@local.gov
    // Password format: {ACRONYM}2026
    // Examples:
    // aox@local.gov -> AOX2026
    // ao2@local.gov -> AO22026 (collision-aware index suffix)
    if (user.email) {
      const emailPrefix = user.email.split('@')[0].toUpperCase();
      return emailPrefix + '2026';
    }
    
    // Fallback to department-based calculation if email not available
    return `${String(user.department || '')
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .split(/\s+/)
      .map(word => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, 'X')}2026`;
  };

  if (isAdmin) {
    return (
      <div style={styles.pageContainer}>
        <h1 style={styles.pageTitle}>👥 User Accounts (Admin)</h1>
      <div style={{backgroundColor: colors.lightGray, padding: '15px', borderRadius: '4px', marginBottom: '20px'}}>
          <p style={{margin: 0, fontSize: '13px', color: colors.darkGray}}>
            Admin can view all users' credentials: emails, departments, roles and initial passwords. Total: {users.length} users. Click "Copy" to copy password to clipboard.
          </p>
        </div>

        {loading ? (
          <div style={{textAlign: 'center', padding: '40px', color: colors.darkGray}}>
            ⏳ Loading users...
          </div>
        ) : (
          <div style={{overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', backgroundColor: colors.white, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead style={{position: 'sticky', top: 0, zIndex: 10}}>
                <tr style={{backgroundColor: colors.navy, color: colors.white}}>
                  <th style={styles.tableCell}>ID</th>
                  <th style={styles.tableCell}>Full Name</th>
                  <th style={styles.tableCell}>Email</th>
                  <th style={styles.tableCell}>Department</th>
                  <th style={styles.tableCell}>Role</th>
                  <th style={styles.tableCell}>Designation</th>
                  <th style={styles.tableCell}>Initial Password</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{user.id}</td>
                    <td style={styles.tableCell}>
                      {user.name}
                    </td>
                    <td style={{...styles.tableCell, fontFamily: 'monospace', fontSize: '12px', color: colors.forestGreen, fontWeight: 'bold'}}>{user.email}</td>
                    <td style={styles.tableCell}>{user.department}</td>
                    <td style={styles.tableCell}>{(user.role || 'user').toUpperCase()}</td>
                    <td style={styles.tableCell}>{user.designation || '—'}</td>
                    <td style={styles.tableCell}>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center'}}>
                        <code style={{fontFamily: 'monospace', fontWeight: 'bold', color: colors.navy, fontSize: '12px', backgroundColor: colors.lightGray, padding: '6px 10px', borderRadius: '3px'}}>{getInitialPassword(user)}</code>
                        <button
                          onClick={() => handleCopyToClipboard(getInitialPassword(user))}
                          style={{...styles.button, backgroundColor: colors.forestGreen, flex: 'none', padding: '6px 10px', fontSize: '12px'}}
                        >
                          {copied ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const initialPassword = getInitialPassword(currentUser);

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>🔐 My Account Settings</h1>

      <div style={{backgroundColor: colors.lightGray, padding: '15px', borderRadius: '4px', marginBottom: '20px'}}>
        <p style={{margin: 0, fontSize: '13px', color: colors.darkGray}}>
          ℹ️ View and manage your account information. Passwords are hashed and secured in the system.
        </p>
      </div>

      <div style={{maxWidth: '600px', margin: '0 auto'}}>
        <div style={{backgroundColor: colors.white, padding: '25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
          <h2 style={{color: colors.navy, marginTop: 0, marginBottom: '20px', fontSize: '16px'}}>Account Information</h2>

          <div style={{marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${colors.borderGray}`}}>
            <label style={{display: 'block', fontSize: '12px', color: colors.darkGray, fontWeight: 'bold', marginBottom: '5px'}}>
              Email Address:
            </label>
            <div style={{fontSize: '14px', color: colors.navy, fontWeight: '500'}}>{currentUser.email}</div>
          </div>

          <div style={{marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${colors.borderGray}`}}>
            <label style={{display: 'block', fontSize: '12px', color: colors.darkGray, fontWeight: 'bold', marginBottom: '5px'}}>
              Department:
            </label>
            <div style={{fontSize: '14px', color: colors.navy, fontWeight: '500'}}>{currentUser.department}</div>
          </div>

          <div style={{marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${colors.borderGray}`}}>
            <label style={{display: 'block', fontSize: '12px', color: colors.darkGray, fontWeight: 'bold', marginBottom: '5px'}}>
              Role:
            </label>
            <span style={{
              backgroundColor: isAdmin ? colors.red : colors.forestGreen,
              color: colors.white,
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'inline-block'
            }}>
              {(currentUser.role || 'user').toUpperCase()}
            </span>
          </div>

          <div>
            <label style={{display: 'block', fontSize: '12px', color: colors.darkGray, fontWeight: 'bold', marginBottom: '10px'}}>
              Initial Password:
            </label>
            <button
              onClick={() => handleToggleShow(currentUser.id)}
              style={{...styles.button, backgroundColor: colors.amber, width: 'auto', padding: '8px 16px'}}
            >
              {showPasswordFor === currentUser.id ? '👁️ Hide Password' : '🔒 Show Password'}
            </button>
            {showPasswordFor === currentUser.id && (
              <div style={{marginTop: '12px', padding: '12px', backgroundColor: colors.lightGray, borderRadius: '4px', display: 'flex', gap: '10px', alignItems: 'center'}}>
                <code style={{flex: 1, fontSize: '14px', fontWeight: 'bold', color: colors.navy, fontFamily: 'monospace', letterSpacing: '2px'}}>{initialPassword}</code>
                <button
                  onClick={() => handleCopyToClipboard(initialPassword)}
                  style={{...styles.button, backgroundColor: colors.forestGreen, flex: 'none', padding: '8px 12px'}}
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{backgroundColor: colors.lightGray, padding: '15px', borderRadius: '8px', border: `2px solid ${colors.amber}`}}>
          <p style={{margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: colors.navy}}>⚠️ Password Security:</p>
          <ul style={{margin: 0, paddingLeft: '20px', fontSize: '12px', color: colors.darkGray}}>
            <li>Your initial password is hashed and cannot be recovered</li>
            <li>Only you can view your own password in this section</li>
            <li>Change your password after your first login for enhanced security</li>
            <li>Keep your password confidential and do not share it with others</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// About System Component
const AboutSystem = () => {
  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>ℹ️ About RIS Management System</h1>
      
      <div style={{maxWidth: '800px', margin: '0 auto'}}>
        <div style={{backgroundColor: colors.lightGray, padding: '25px', borderRadius: '8px', marginBottom: '25px'}}>
          <h2 style={{color: colors.navy, marginTop: 0, marginBottom: '15px', fontSize: '18px'}}>📋 System Purpose</h2>
          <p style={{margin: 0, fontSize: '14px', lineHeight: '1.8', color: colors.darkGray}}>
            The RIS (Requisition and Issue Slip) Management System has been created to streamline and manage the stock inventory and document request processing for the BAC Office. This system helps track paper usage, supplies, and janitorial materials across all government departments.
          </p>
        </div>

        <div style={{backgroundColor: colors.white, padding: '25px', borderRadius: '8px', border: `2px solid ${colors.forestGreen}`, marginBottom: '25px'}}>
          <h2 style={{color: colors.navy, marginTop: 0, marginBottom: '15px', fontSize: '18px'}}>✨ Key Features</h2>
          <ul style={{margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8', color: colors.darkGray}}>
            <li>RIS Request Management - Track and manage stock requisition requests</li>
            <li>Inventory Tracking - Monitor current stock levels of office and janitorial supplies</li>
            <li>Department Requests - Allow departments to submit and track their requests</li>
            <li>Admin Controls - Review, approve, and manage all system requests</li>
            <li>Stock History - Maintain complete audit trail of all inventory changes</li>
            <li>Control Numbers - Auto-generated control numbers for tracking and referencing</li>
          </ul>
        </div>

        <div style={{backgroundColor: colors.lightGray, padding: '25px', borderRadius: '8px', marginBottom: '25px'}}>
          <h2 style={{color: colors.navy, marginTop: 0, marginBottom: '15px', fontSize: '18px'}}>🏢 Departments Covered</h2>
          <p style={{margin: '0 0 15px 0', fontSize: '13px', color: colors.darkGray}}>
            This system serves <strong>{DEPARTMENTS.length}</strong> government departments and offices including:
          </p>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px'}}>
            {DEPARTMENTS.slice(0, 8).map((dept, index) => (
              <div key={index} style={{fontSize: '12px', color: colors.darkGray}}>✓ {dept}</div>
            ))}
            <div style={{fontSize: '12px', color: colors.darkGray, fontStyle: 'italic'}}>...and {DEPARTMENTS.length - 8} more departments</div>
          </div>
        </div>

        <div style={{backgroundColor: colors.white, padding: '25px', borderRadius: '8px', border: `2px solid ${colors.amber}`}}>
          <h2 style={{color: colors.navy, marginTop: 0, marginBottom: '15px', fontSize: '18px'}}>🔒 Security Features</h2>
          <ul style={{margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8', color: colors.darkGray}}>
            <li>Encrypted password storage - Passwords are hashed using SHA-256</li>
            <li>Role-based access control - Admin and User roles with different permissions</li>
            <li>Pre-configured department accounts - No self-registration allowed</li>
            <li>Audit trails - All actions are logged for security purposes</li>
            <li>LocalStorage security - Data stored locally with appropriate encryption</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const RISManagementApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dashboardFilterStatus, setDashboardFilterStatus] = useState('all');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize API (check for remembered user and token)
        if (typeof APIStorageManager !== 'undefined') {
          const result = await APIStorageManager.initializeDefaults();
          if (result && result.success && result.user) {
            setCurrentUser(result.user);
            setActiveTab(result.user.role === 'admin' ? 'dashboard' : 'myRequests');
            // Fetch data from API - admin users get ALL requests
            const allRequests = result.user.role === 'admin'
              ? await APIStorageManager.getAdminRequests()
              : await APIStorageManager.getRequests();
            setRequests(allRequests);
            const inv = await APIStorageManager.getInventory();
            setInventory(inv);
          }
        } else {
          // Fallback to local storage
          await StorageManager.initializeDefaults();
          setRequests(StorageManager.getRequests());
          setInventory(StorageManager.getInventory());

          const rememberedUserId = StorageManager.getRememberedUserId();
          if (rememberedUserId) {
            const users = StorageManager.getUsers();
            const rememberedUser = users.find(user => user.id === rememberedUserId);
            if (rememberedUser) {
              setCurrentUser(rememberedUser);
              setActiveTab(rememberedUser.role === 'admin' ? 'dashboard' : 'myRequests');
            } else {
              StorageManager.clearRememberedUserId();
            }
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
      setIsInitialized(true);
    };

    initializeApp();

    // Refresh handler for cross-component data changes
    const onDataChanged = async () => {
      try {
        if (typeof APIStorageManager !== 'undefined' && currentUser) {
          const allRequests = currentUser.role === 'admin'
            ? await APIStorageManager.getAdminRequests()
            : await APIStorageManager.getRequests();
          setRequests(allRequests);
          const inv = await APIStorageManager.getInventory();
          setInventory(inv);
        }
      } catch (err) {
        console.warn('Failed to refresh data on change event:', err);
      }
    };
    window.addEventListener('ris:dataChanged', onDataChanged);

    return () => {
      window.removeEventListener('ris:dataChanged', onDataChanged);
    };
  }, []);

  if (!isInitialized) {
    return (
      <div style={{...styles.pageContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh'}}>
        <div style={{textAlign: 'center', color: colors.white}}>
          <div style={{fontSize: '28px', marginBottom: '10px'}}>Initializing...</div>
          <div style={{fontSize: '14px'}}>Preparing seeded accounts and storage — please wait.</div>
        </div>
      </div>
    );
  }

  const handleLogin = async (user) => {
    setCurrentUser(user);
    setActiveTab(user.role === 'admin' ? 'dashboard' : 'myRequests');
    // Fetch fresh data after login
    try {
      // Admin users should fetch ALL requests, regular users fetch only theirs
      const allRequests = user.role === 'admin' 
        ? await APIStorageManager.getAdminRequests()
        : await APIStorageManager.getRequests();
      setRequests(allRequests);
      const inv = await APIStorageManager.getInventory();
      setInventory(inv);
    } catch (err) {
      console.warn('Failed to fetch data after login:', err);
    }
  };

  const handleLogout = async () => {
    if (typeof APIStorageManager !== 'undefined') {
      await APIStorageManager.logout();
    } else {
      StorageManager.clearRememberedUserId();
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleApproveRequest = async (requestId) => {
    try {
      if (typeof APIStorageManager !== 'undefined') {
        await APIStorageManager.approveRequest(requestId);
        // Refresh requests from API - use admin endpoint if user is admin
        const updated = currentUser.role === 'admin'
          ? await APIStorageManager.getAdminRequests()
          : await APIStorageManager.getRequests();
        setRequests(updated);
      } else {
        const risNumber = StorageManager.getNextRISNumber();
        const updated = requests.map(r =>
          r.id === requestId ? { ...r, status: 'approved', risNumber } : r
        );
        setRequests(updated);
        StorageManager.setRequests(updated);
      }
      alert('✓ Request approved and RIS number assigned');
    } catch (err) {
      alert('✗ Failed to approve request: ' + err.message);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      if (typeof APIStorageManager !== 'undefined') {
        await APIStorageManager.rejectRequest(requestId);
        // Refresh requests from API - use admin endpoint if user is admin
        const updated = currentUser.role === 'admin'
          ? await APIStorageManager.getAdminRequests()
          : await APIStorageManager.getRequests();
        setRequests(updated);
      } else {
        const updated = requests.map(r =>
          r.id === requestId ? { ...r, status: 'rejected' } : r
        );
        setRequests(updated);
        StorageManager.setRequests(updated);
      }
      alert('✗ Request rejected');
    } catch (err) {
      alert('✗ Failed to reject request: ' + err.message);
    }
  };

  const handleMarkReleased = async (requestId) => {
    try {
      if (typeof APIStorageManager !== 'undefined') {
        console.log(`[handleMarkReleased] Starting for request ${requestId}`);
        const response = await APIStorageManager.markReleased(requestId);
        console.log(`[handleMarkReleased] Mark released response received:`, response.stockCheckResults);
        
        // OPTION 1: Use inventory returned from mark-released endpoint (NEW)
        if (response.inventoryAfterRelease) {
          console.log(`[handleMarkReleased] Using inventory from mark-released response:`, response.inventoryAfterRelease);
          setInventory(response.inventoryAfterRelease);
        } else {
          // OPTION 2: Fallback to fetching separately (old behavior)
          const updated = currentUser.role === 'admin'
            ? await APIStorageManager.getAdminRequests()
            : await APIStorageManager.getRequests();
          setRequests(updated);
          
          console.log(`[handleMarkReleased] Calling getInventory()...`);
          const latestInventory = await APIStorageManager.getInventory();
          console.log(`[handleMarkReleased] getInventory() returned:`, latestInventory);
          
          setInventory(latestInventory);
          console.log(`[handleMarkReleased] setInventory() called with new data`);
        }
        
        // Update requests - use admin endpoint if user is admin
        const updated = currentUser.role === 'admin'
          ? await APIStorageManager.getAdminRequests()
          : await APIStorageManager.getRequests();
        setRequests(updated);
        
        // Display stock availability status
        if (response.stocksAvailable) {
          alert(`✓ Request marked as released\n✓ Inventory deducted successfully\n\nAll requested items have sufficient stocks.`);
        } else {
          const insufficientItems = response.stockCheckResults
            .filter(item => !item.sufficient)
            .map(item => `  • ${item.itemName}: Requested ${item.requestedQuantity}, Available ${item.availableQuantity}`)
            .join('\n');
          
          alert(`✓ Request marked as released\n✓ Inventory deducted for all items\n⚠ WARNING - Some items had insufficient stock:\n${insufficientItems}`);
        }
      } else {
        const updated = requests.map(r =>
          r.id === requestId ? { ...r, status: 'released', stocksAvailable: true } : r
        );
        setRequests(updated);
        StorageManager.setRequests(updated);
        alert('✓ Request marked as released (Local storage mode)');
      }
    } catch (err) {
      alert('✗ Failed to mark released: ' + err.message);
    }
  };

  const handleUpdateIssued = async (requestId, issuedItems) => {
    try {
      if (typeof APIStorageManager !== 'undefined') {
        await APIStorageManager.updateIssuedItems(requestId, issuedItems);
        // Refresh requests from API - use admin endpoint if user is admin
        const updated = currentUser.role === 'admin'
          ? await APIStorageManager.getAdminRequests()
          : await APIStorageManager.getRequests();
        setRequests(updated);
      } else {
        const todayDate = new Date().toISOString().split('T')[0];
        const updated = requests.map(r =>
          r.id === requestId ? { ...r, issuedItems, issuedDate: todayDate } : r
        );
        setRequests(updated);
        StorageManager.setRequests(updated);
      }
      alert('✓ Issued quantities recorded');
    } catch (err) {
      alert('✗ Failed to update issued quantities: ' + err.message);
    }
  };

  const handleUpdateRequest = async (requestId, updateData) => {
    try {
      if (typeof APIStorageManager !== 'undefined') {
        await APIStorageManager.updateRequest(requestId, updateData);
        // Refresh requests from API - use admin endpoint if user is admin
        const updated = currentUser.role === 'admin'
          ? await APIStorageManager.getAdminRequests()
          : await APIStorageManager.getRequests();
        setRequests(updated);
      } else {
        const updated = requests.map(r => {
          if (r.id === requestId) {
            return { ...r, description: updateData.description, items: updateData.items };
          }
          return r;
        });
        setRequests(updated);
        StorageManager.setRequests(updated);
      }
      alert('✓ Request updated successfully');
    } catch (err) {
      alert('✗ Failed to update request: ' + err.message);
    }
  };

  const handleSubmitRequest = async (requestData) => {
    try {
      // Calculate control number (works for both API and local storage modes)
      const controlNumber = StorageManager.getNextControlNumber(requestData.department, requests);
      const requestDataWithControl = {
        ...requestData,
        controlNumber,
        requestYear: new Date().getFullYear(),
      };

      if (typeof APIStorageManager !== 'undefined') {
        await APIStorageManager.createRequest(requestDataWithControl);
        const updated = await APIStorageManager.getRequests();
        setRequests(updated);
      } else {
        const newRequest = {
          id: Math.max(...requests.map(r => r.id), 0) + 1,
          ...requestDataWithControl,
          risNumber: null,
          issuedItems: [],
        };
        const updated = [...requests, newRequest];
        setRequests(updated);
        StorageManager.setRequests(updated);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleRestockItem = async (itemId, quantity, notes) => {
    try {
      if (typeof APIStorageManager !== 'undefined') {
        await APIStorageManager.restockItem(itemId, quantity, notes);
        const inv = await APIStorageManager.getInventory();
        setInventory(inv);
      } else {
        const currentStock = inventory[itemId] || 0;
        const newStock = currentStock + quantity;
        const updated = { ...inventory, [itemId]: newStock };
        setInventory(updated);
        StorageManager.setInventory(updated);
      }
    } catch (err) {
      throw err;
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isRISDocumentsTab = currentUser.role === 'admin' && activeTab === 'risImages';

  return (
    <>
      <style>{`
        .ris-scroll-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .ris-scroll-hidden::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }

        @page {
          size: A4 portrait;
          margin: 0;
          padding: 0;
        }
        
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          
          html, body, div, section, main {
            height: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          
          nav, header, .ris-modal-header, button, .ris-numbers-list, .ris-list, .tableColumn, [style*="risList"], [style*="panelTitle"] {
            display: none !important;
          }
          
          .ris-modal-overlay {
            position: static !important;
            background: white !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          .ris-print-form {
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: none !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            overflow: visible !important;
          }
          
          .ris-print-form > div {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          .ris-print-page {
            display: block !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 20px !important;
            page-break-after: always !important;
            page-break-before: auto !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            break-before: auto !important;
            break-inside: avoid !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            background: white !important;
            position: relative !important;
          }
          
          .ris-print-page:last-child,
          .ris-print-page.last-page {
            page-break-after: auto !important;
            break-after: auto !important;
            height: auto !important;
          }
          
          .ris-print-page * {
            page-break-inside: auto !important;
          }
          
          table {
            width: 100% !important;
            page-break-inside: auto !important;
            border-collapse: collapse !important;
          }
          
          thead {
            display: table-header-group !important;
            page-break-inside: avoid !important;
          }
          
          tbody {
            display: table-row-group !important;
          }
          
          tfoot {
            display: table-footer-group !important;
          }
          
          tr {
            page-break-inside: auto !important;
          }
          
          [style*="pageContainer"], [style*="appContainer"], [style*="sidebar"], [style*="twoColumnLayout"], .ris-numbers-list {
            display: none !important;
          }
          
          input, select, textarea {
            border: 1px solid #000 !important;
            background: white !important;
            color: #000 !important;
          }
        }
      `}</style>
      <div style={styles.appContainer}>
      {/* Side Navigation */}
      <nav style={styles.sidebar}>
        <div style={{...styles.logo, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <img 
                src="assets/logo/logo-64.png"
                alt="City Seal"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%'
                }}
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
              <div style={{...styles.logoText, fontSize: '12px', margin: '0', lineHeight: '1'}}>City of General Trias</div>
              <div style={{fontSize: '11px', color: colors.amber, fontWeight: 'bold', margin: '0'}}>RIS System</div>
            </div>
          </div>
          <div style={{position: 'relative'}}>
            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Settings"
            >
              ⚙️
            </button>
            {showSettingsDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: colors.white,
                border: `1px solid ${colors.borderGray}`,
                borderRadius: '4px',
                minWidth: '200px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                marginTop: '5px'
              }}>
                <button
                  onClick={() => {
                    setActiveTab('userAccounts');
                    setShowSettingsDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderBottom: `1px solid ${colors.borderGray}`,
                    fontFamily: 'Georgia, serif',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = colors.lightGray}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  👥 User Accounts
                </button>
                <button
                  onClick={() => {
                    setActiveTab('aboutSystem');
                    setShowSettingsDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'Georgia, serif',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = colors.lightGray}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  ℹ️ About System
                </button>
                
              </div>
            )}
          </div>
        </div>

        <div style={styles.userInfo}>
          <div style={styles.userBadge}>{currentUser.role.toUpperCase()}</div>
          <div style={styles.userName}>{currentUser.name}</div>
          <div style={styles.userDept}>{currentUser.department}</div>
        </div>

        <nav style={styles.navMenu}>
          {currentUser.role === 'admin' ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'dashboard' ? colors.forestGreen : 'transparent',
                }}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveTab('risRequests')}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'risRequests' ? colors.forestGreen : 'transparent',
                }}
              >
                📋 RIS Requests
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'inventory' ? colors.forestGreen : 'transparent',
                }}
              >
                📊 Inventory Report
              </button>
              <button
                onClick={() => setActiveTab('risImages')}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'risImages' ? colors.forestGreen : 'transparent',
                }}
              >
                📄 RIS Documents
              </button>
              <button
                onClick={() => setActiveTab('stockManagement')}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'stockManagement' ? colors.forestGreen : 'transparent',
                }}
              >
                📦 Stock Management
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('myRequests')}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'myRequests' ? colors.forestGreen : 'transparent',
                }}
              >
                📋 My Requests
              </button>
              <button
                onClick={() => setActiveTab('newRequest')}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'newRequest' ? colors.forestGreen : 'transparent',
                }}
              >
                ➕ New Request
              </button>
            </>
          )}
        </nav>

        <button onClick={handleLogout} style={styles.logoutButton}>
          🚪 Logout
        </button>
      </nav>

      {/* Main Content */}
      <main
        style={{
          ...styles.mainContent,
          ...(isRISDocumentsTab ? { padding: 0, overflowY: 'hidden' } : {}),
        }}
      >
        {activeTab === 'userAccounts' && <UserAccountsManagement currentUser={currentUser} />}
        {activeTab === 'aboutSystem' && <AboutSystem />}
        
        {currentUser.role === 'admin' ? (
          <>
            {activeTab === 'dashboard' && (
              <AdminDashboard 
                requests={requests} 
                onStatusCardClick={(status) => {
                  setDashboardFilterStatus(status);
                  setActiveTab('risRequests');
                }}
              />
            )}
            {activeTab === 'risRequests' && (
              <AdminRISRequests
                requests={requests}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
                onMarkReleased={handleMarkReleased}
                onUpdateIssued={handleUpdateIssued}
                onUpdateRequest={handleUpdateRequest}
                initialFilterStatus={dashboardFilterStatus}
              />
            )}
            {activeTab === 'inventory' && <AdminInventory requests={requests} />}
            {activeTab === 'risImages' && <AdminRISImages requests={requests} onUpdateIssued={handleUpdateIssued} />}
            {activeTab === 'stockManagement' && <AdminStockManagement inventory={inventory} onRestockItem={handleRestockItem} />}
          </>
        ) : (
          <>
            {activeTab === 'myRequests' && <UserMyRequests requests={requests} currentUser={currentUser} />}
            {activeTab === 'newRequest' && (
              <UserNewRequest
                currentUser={currentUser}
                requests={requests}
                onSubmitRequest={handleSubmitRequest}
              />
            )}
          </>
        )}
      </main>
    </div>
    </>
  );
};

// Global Styles
const styles = {
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: colors.navy,
    fontFamily: 'Georgia, serif',
  },
  loginBox: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  loginIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  loginTitle: {
    margin: '10px 0 5px 0',
    color: colors.navy,
    fontSize: '24px',
  },
  loginSubtitle: {
    margin: '0',
    color: colors.darkGray,
    fontSize: '14px',
  },
  loginForm: {
    width: '100%',
  },
  formTitle: {
    color: colors.navy,
    fontSize: '18px',
    marginBottom: '20px',
    marginTop: 0,
  },
  formGroup: {
    marginBottom: '15px',
  },
  formLabel: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 'bold',
    color: colors.navy,
    fontSize: '13px',
  },
  formInput: {
    width: '100%',
    padding: '10px',
    border: `1px solid ${colors.borderGray}`,
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
    boxSizing: 'border-box',
  },
  formSelect: {
    width: '100%',
    padding: '10px',
    border: `1px solid ${colors.borderGray}`,
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
    backgroundColor: colors.white,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  loginButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '4px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    marginBottom: '15px',
  },
  errorBox: {
    backgroundColor: colors.red,
    color: colors.white,
    padding: '10px 12px',
    borderRadius: '4px',
    marginBottom: '12px',
    fontSize: '13px',
  },
  signUpLink: {
    textAlign: 'center',
    fontSize: '13px',
    color: colors.darkGray,
    marginBottom: '15px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: colors.forestGreen,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
    fontFamily: 'Georgia, serif',
    textDecoration: 'underline',
    padding: 0,
  },
  demoBox: {
    backgroundColor: colors.lightGray,
    padding: '12px',
    borderRadius: '4px',
    fontSize: '12px',
    color: colors.darkGray,
    borderLeft: `4px solid ${colors.forestGreen}`,
  },
  appContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    fontFamily: 'Georgia, serif',
    backgroundColor: colors.lightGray,
  },
  sidebar: {
    width: '280px',
    backgroundColor: colors.navy,
    color: colors.white,
    padding: '20px',
    overflowY: 'hidden',
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: `1px solid ${colors.forestGreen}`,
  },
  logoIcon: {
    fontSize: '28px',
    marginRight: '12px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  userInfo: {
    backgroundColor: colors.darkNavy,
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    borderLeft: `4px solid ${colors.forestGreen}`,
  },
  userBadge: {
    display: 'inline-block',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '6px',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  userDept: {
    fontSize: '12px',
    color: colors.lightGray,
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '8px',
    marginBottom: '20px',
  },
  navButton: {
    padding: '12px 15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    transition: 'all 0.3s ease',
    color: colors.white,
    fontFamily: 'Georgia, serif',
  },
  logoutButton: {
    padding: '10px 15px',
    backgroundColor: colors.red,
    color: colors.white,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    fontFamily: 'Georgia, serif',
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '30px',
    backgroundColor: colors.white,
  },
  pageContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  pageTitle: {
    color: colors.navy,
    fontSize: '28px',
    marginTop: 0,
    marginBottom: '25px',
    borderBottom: `2px solid ${colors.forestGreen}`,
    paddingBottom: '12px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: colors.white,
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '13px',
    color: colors.darkGray,
    marginBottom: '8px',
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: colors.navy,
  },
  filterBar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: '10px 15px',
    border: `1px solid ${colors.borderGray}`,
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
  },
  filterSelect: {
    padding: '10px 15px',
    border: `1px solid ${colors.borderGray}`,
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
    backgroundColor: colors.white,
    cursor: 'pointer',
  },
  twoColumnLayout: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '20px',
  },
  tableColumn: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: colors.white,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    backgroundColor: colors.navy,
    color: colors.white,
  },
  tableRow: {
    borderBottom: `1px solid ${colors.borderGray}`,
    transition: 'background-color 0.2s ease',
  },
  tableCell: {
    padding: '12px 15px',
    fontSize: '13px',
  },
  detailPanel: {
    backgroundColor: colors.lightGray,
    padding: '20px',
    borderRadius: '8px',
    borderLeft: `4px solid ${colors.forestGreen}`,
    maxHeight: '500px',
    overflowY: 'auto',
  },
  detailRow: {
    marginBottom: '12px',
    fontSize: '13px',
    lineHeight: '1.6',
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  button: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '4px',
    color: colors.white,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'Georgia, serif',
  },
  formContainer: {
    backgroundColor: colors.lightGray,
    padding: '25px',
    borderRadius: '8px',
    maxWidth: '800px',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '15px',
  },
  itemInput: {
    backgroundColor: colors.white,
    padding: '12px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderGray}`,
  },
  itemLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '6px',
    color: colors.darkGray,
  },
  quantityInput: {
    width: '100%',
    padding: '6px',
    border: `1px solid ${colors.borderGray}`,
    borderRadius: '3px',
    fontSize: '13px',
    fontFamily: 'Georgia, serif',
    boxSizing: 'border-box',
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.forestGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '4px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
  },
  risList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  risItem: {
    padding: '12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    border: `1px solid ${colors.borderGray}`,
    transition: 'all 0.2s ease',
  },
  panelTitle: {
    margin: '0 0 12px 0',
    color: colors.navy,
    fontSize: '14px',
    fontWeight: 'bold',
  },
  emptyPane: {
    textAlign: 'center',
    color: colors.darkGray,
    paddingTop: '50px',
    fontSize: '13px',
  },
  tableOverflow: {
    overflowX: 'auto',
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  inventoryTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  itemColumn: {
    padding: '12px 15px',
    minWidth: '200px',
    textAlign: 'left',
  },
  deptColumn: {
    padding: '12px 15px',
    minWidth: '120px',
    textAlign: 'center',
  },
  totalColumn: {
    padding: '12px 15px',
    minWidth: '100px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: colors.navy,
    color: colors.white,
    padding: '12px 15px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '13px',
  },
  requestTypeButtons: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  typeButton: {
    flex: 1,
    padding: '12px',
    border: `2px solid`,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    transition: 'all 0.3s ease',
  },
  stockTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
};

// Render App
ReactDOM.createRoot(document.getElementById('root')).render(<RISManagementApp />);
