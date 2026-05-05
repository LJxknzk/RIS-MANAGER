# Inventory Released Items Fix

## Problem
Released items were not properly recorded in the inventory system. When requests were marked as "released", there were no inventory records to track which items were released.

## Solution
Implemented comprehensive inventory tracking for all released items:

### 1. **Automatic Inventory Record Creation**
When a request is marked as released, the system now:
- Ensures all requested items have inventory records
- Creates records automatically if they don't exist
- Initializes new records with 0 quantity (if no stock exists)

**File**: `backend/routes/requests.js` - `POST /api/requests/:id/mark-released`

### 2. **Audit Trail for Released Items**
All release actions are logged in `stock_history` table:

**Success Case** (`action = 'release'`):
- Item deducted from inventory
- Previous stock, new stock, and request ID recorded
- Full transaction logged

**Failure Case** (`action = 'release_failed'`):
- Item NOT deducted (insufficient stock)
- Attempt still logged for audit purposes
- Request ID and reason recorded

### 3. **New API Endpoint**
Added endpoint to view all released items:

```
GET /api/inventory/released-items
```

Returns all items with `action = 'release'` or `action = 'release_failed'` including:
- Item details
- Quantity released
- Previous and new stock levels
- Release date/time
- Current stock in inventory

**File**: `backend/routes/inventory.js`

### 4. **Sync Script for Existing Data**
New migration script to sync all previously released requests:

```bash
npm run sync
```

**File**: `backend/db/sync-released-items.js`

This script:
1. Finds all released requests in the database
2. Ensures their request items have inventory records
3. Creates missing inventory records
4. Reports summary statistics

## Files Modified

### Backend
- `backend/routes/requests.js` - Enhanced mark-released endpoint
- `backend/routes/inventory.js` - Added released-items endpoint
- `backend/package.json` - Added sync script command
- `backend/db/sync-released-items.js` - New sync script

### Database
- `backend/db/migrate.js` - Already had stocks_available column

## Usage

### First Time Setup
```bash
# Run database migration
npm run migrate

# Run sync to catch any existing released items
npm run sync

# Start backend
npm start
```

### Regular Usage
When admin marks a request as released:
1. System checks stock availability
2. If sufficient: Deducts from inventory + creates stock_history entry
3. If insufficient: Does NOT deduct but logs the attempt

### View Released Items
```bash
# Via API (requires admin token)
GET http://localhost:5000/api/inventory/released-items

# Returns array of all released item records with:
{
  "id": 123,
  "item_id": 2,
  "item_name": "Ball Pen (black)",
  "quantity": 100,              // Amount released
  "action": "release",          // or "release_failed"
  "previous_stock": 200,
  "new_stock": 100,             // After deduction
  "notes": "Request ID: 45",
  "date": "2026-05-05",
  "time": "14:30:45",
  "current_stock": 100          // Current inventory qty
}
```

## Data Integrity
- All inventory changes tracked in `stock_history`
- Released items linked to specific requests via `notes` field
- Audit trail complete even for failed releases
- Atomic transactions ensure data consistency

## Testing Checklist
- [ ] Create request with items
- [ ] Approve request
- [ ] Mark as released with sufficient stock → verify inventory deducted
- [ ] Mark another request as released with insufficient stock → verify NO deduction
- [ ] Check `stock_history` table for all release records
- [ ] Query `/api/inventory/released-items` → verify all releases listed
- [ ] Run `npm run sync` → verify no errors
- [ ] Check RIS Document tab → verify stock status shows YES/NO correctly
