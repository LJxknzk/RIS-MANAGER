const pool = require('./client');

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  department VARCHAR(255) NOT NULL,
  designation VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RIS Requests table
CREATE TABLE IF NOT EXISTS ris_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  control_number INT NOT NULL,
  ris_number INT,
  department VARCHAR(255) NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  stocks_available BOOLEAN,
  request_date DATE NOT NULL,
  request_year INT NOT NULL,
  requester_name VARCHAR(255),
  requester_designation VARCHAR(255),
  requester_date DATE,
  approver_name VARCHAR(255),
  approver_designation VARCHAR(255),
  approver_date DATE,
  issued_date DATE,
  received_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Request Items (many-to-many between requests and inventory items)
CREATE TABLE IF NOT EXISTS request_items (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES ris_requests(id) ON DELETE CASCADE,
  item_id INT NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issued Items table (tracks what was actually issued)
CREATE TABLE IF NOT EXISTS issued_items (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES ris_requests(id) ON DELETE CASCADE,
  item_id INT NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Stock table
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL UNIQUE,
  item_name VARCHAR(255) NOT NULL,
  stock_number VARCHAR(50) NOT NULL UNIQUE,
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock History (audit trail)
CREATE TABLE IF NOT EXISTS stock_history (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL,
  item_name VARCHAR(255),
  quantity INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  previous_stock INT,
  new_stock INT,
  notes TEXT,
  date DATE NOT NULL,
  time VARCHAR(8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON ris_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_department ON ris_requests(department);
CREATE INDEX IF NOT EXISTS idx_requests_status ON ris_requests(status);
CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_issued_items_request_id ON issued_items(request_id);
`;

async function migrate() {
  try {
    console.log('Starting database migration...');
    await pool.query(schema);
    console.log('✓ Database migration completed successfully');
    await pool.end();
  } catch (err) {
    console.error('✗ Database migration failed:', err);
    process.exit(1);
  }
}

migrate();
