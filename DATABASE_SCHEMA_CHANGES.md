# Database Schema - Inventory Released Items

## Tables Modified/Created

### 1. ris_requests Table (MODIFIED)

Added column for tracking stock availability:

```sql
ALTER TABLE ris_requests ADD COLUMN stocks_available BOOLEAN;
```

**Column Details:**
```sql
Column Name:      stocks_available
Data Type:        BOOLEAN (nullable)
Default:          NULL
Description:      Tracks whether sufficient stocks were available when request was released
Values:
  - TRUE:  Sufficient stock, items deducted from inventory
  - FALSE: Insufficient stock, no items deducted
  - NULL:  Request not yet released (default)
```

**Full Table Structure:**
```sql
CREATE TABLE ris_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  control_number INT NOT NULL,
  ris_number INT,
  department VARCHAR(255) NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  stocks_available BOOLEAN,              -- NEW COLUMN
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
```

### 2. inventory Table (EXISTING)

No schema changes, but now actively used for all released items:

```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL UNIQUE,
  item_name VARCHAR(255) NOT NULL,
  stock_number VARCHAR(50) NOT NULL UNIQUE,
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Usage:**
- Records created automatically for released items if missing
- Quantity updated when items are released
- Tracks current stock level for all items

### 3. stock_history Table (EXISTING)

Enhanced to track release actions:

```sql
CREATE TABLE stock_history (
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
```

**New Action Values:**
```sql
action = 'release'          -- Item successfully released, stock deducted
action = 'release_failed'   -- Release attempted but insufficient stock
```

**Example Records:**

**Successful Release:**
```sql
INSERT INTO stock_history VALUES (
  DEFAULT,                          -- id
  2,                                -- item_id
  'Ball Pen (black)',              -- item_name
  100,                              -- quantity (released)
  'release',                        -- action
  200,                              -- previous_stock
  100,                              -- new_stock
  'Request ID: 45',                -- notes
  '2026-05-05',                    -- date
  '14:30:45'                        -- time
);
```

**Failed Release:**
```sql
INSERT INTO stock_history VALUES (
  DEFAULT,
  5,
  'Battery 9v',
  50,
  'release_failed',
  20,
  20,
  'Request ID: 46 - Insufficient stock',
  '2026-05-05',
  '14:31:22'
);
```

## Data Model Relationships

```
                    ┌─────────────────────┐
                    │   ris_requests      │
                    ├─────────────────────┤
                    │ id                  │ (PK)
                    │ status              │
                    │ stocks_available    │◄── NEW
                    │ issued_date         │
                    └─────────────────────┘
                            │
                            │ 1:N
                            │
                    ┌─────────────────────┐
                    │   request_items     │
                    ├─────────────────────┤
                    │ request_id          │ (FK)
                    │ item_id             │
                    │ quantity            │
                    └─────────────────────┘
                            │
                            │ N:1
                            │
                    ┌─────────────────────┐
                    │   inventory         │
                    ├─────────────────────┤
                    │ item_id             │ (PK)
                    │ quantity            │
                    │ updated_at          │
                    └─────────────────────┘
                            ▲
                            │
                            │ Logged from
                            │
                    ┌─────────────────────┐
                    │   stock_history     │
                    ├─────────────────────┤
                    │ item_id             │
                    │ action              │◄── 'release' or 'release_failed'
                    │ notes               │◄── References Request ID
                    │ date, time          │
                    └─────────────────────┘
```

## SQL Queries for Common Tasks

### View All Released Items
```sql
SELECT 
  sh.item_id,
  sh.item_name,
  sh.quantity as released_qty,
  sh.previous_stock,
  sh.new_stock,
  inv.quantity as current_stock,
  sh.date,
  sh.time
FROM stock_history sh
LEFT JOIN inventory inv ON sh.item_id = inv.item_id
WHERE sh.action = 'release'
ORDER BY sh.date DESC, sh.time DESC;
```

### Find Failed Releases
```sql
SELECT 
  sh.item_id,
  sh.item_name,
  sh.quantity as requested_qty,
  sh.previous_stock as available_qty,
  sh.notes,
  sh.date,
  sh.time
FROM stock_history sh
WHERE sh.action = 'release_failed'
ORDER BY sh.date DESC;
```

### Check Stock After All Releases
```sql
SELECT 
  item_name,
  quantity as current_stock,
  (SELECT COUNT(*) FROM stock_history sh 
   WHERE sh.item_id = inv.item_id 
   AND sh.action = 'release') as times_released
FROM inventory inv
WHERE quantity > 0
ORDER BY quantity DESC;
```

### Verify Request Stock Status
```sql
SELECT 
  r.id,
  r.ris_number,
  r.status,
  r.stocks_available,
  COUNT(ri.id) as item_count,
  SUM(ri.quantity) as total_qty_requested
FROM ris_requests r
LEFT JOIN request_items ri ON r.id = ri.request_id
WHERE r.status = 'released'
GROUP BY r.id
ORDER BY r.issued_date DESC;
```

### Audit Trail for Specific Request
```sql
SELECT 
  sh.*
FROM stock_history sh
WHERE sh.notes LIKE '%Request ID: 45%'
ORDER BY sh.date DESC, sh.time DESC;
```

## Migration Steps

### Step 1: Update Database Schema
```bash
npm run migrate
```

This runs the migration in `backend/db/migrate.js`:
```sql
ALTER TABLE ris_requests ADD COLUMN stocks_available BOOLEAN;
```

### Step 2: Sync Existing Released Items
```bash
npm run sync
```

This runs `backend/db/sync-released-items.js`:
- Finds all released requests
- Creates missing inventory records
- Reports statistics

### Step 3: Start Backend
```bash
npm start
```

## Validation Queries

### Verify Column Added
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ris_requests' 
AND column_name = 'stocks_available';
```

Expected output:
```
column_name       | data_type
------------------+-----------
stocks_available  | boolean
```

### Verify Inventory Records
```sql
SELECT COUNT(*) FROM inventory;
-- Should show all 116 items after sync
```

### Verify Stock History
```sql
SELECT COUNT(*) FROM stock_history 
WHERE action IN ('release', 'release_failed');
-- Shows number of release transactions
```

## Backup & Recovery

### Backup Before Migration
```bash
pg_dump -U postgres ris_manager > backup_$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
psql -U postgres ris_manager < backup_YYYYMMDD.sql
```

## Performance Considerations

### Indexes (Already Exist)
```sql
CREATE INDEX IF NOT EXISTS idx_requests_status ON ris_requests(status);
CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON request_items(request_id);
```

### Recommended Additional Index
```sql
CREATE INDEX idx_stock_history_action ON stock_history(action);
CREATE INDEX idx_stock_history_date ON stock_history(date);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);
```

## Storage Estimates

### Table Size After 1 Year
Assuming ~100 releases/month:

```
ris_requests:     ~500 KB (including new stocks_available column)
stock_history:    ~2 MB (1200 release records)
inventory:        ~50 KB (116 items)
```

Total: ~2.5 MB (negligible for production)

## Compatibility

### PostgreSQL Versions
- ✓ PostgreSQL 10+
- ✓ PostgreSQL 11+
- ✓ PostgreSQL 12+
- ✓ PostgreSQL 13+
- ✓ PostgreSQL 14+
- ✓ PostgreSQL 15+ (tested)

### Data Types
- BOOLEAN: Fully supported in all PostgreSQL versions
- VARCHAR: No issues
- TIMESTAMP: Standard type

## References
- [RELEASED_ITEMS_QUICK_REF.md](../RELEASED_ITEMS_QUICK_REF.md) - Quick commands
- [INVENTORY_RELEASED_ITEMS_FIX.md](../INVENTORY_RELEASED_ITEMS_FIX.md) - Full documentation
