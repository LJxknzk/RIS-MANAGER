# Inventory Released Items Fix - Quick Reference

## What Was Fixed
✅ Released items now automatically recorded in inventory
✅ Complete audit trail for all releases
✅ Handles both successful and failed releases
✅ Syncs existing data with new script

## Files Changed

| File | Change | Purpose |
|------|--------|---------|
| `backend/routes/requests.js` | Enhanced mark-released endpoint | Auto-create inventory records + audit trail |
| `backend/routes/inventory.js` | Added /released-items endpoint | View all released items |
| `backend/package.json` | Added sync script | Run data migration |
| `backend/db/sync-released-items.js` | New file | Sync existing released items |

## Setup Commands

```bash
# First time only
npm run migrate              # Create database tables
npm run sync                 # Sync existing released items

# Regular startup
npm start                    # Run backend server
```

## API Endpoints

### Mark Request as Released
```bash
POST /api/requests/{id}/mark-released
Headers: Authorization: Bearer {token}
```

**Response (Success - Sufficient Stock)**
```json
{
  "id": 45,
  "status": "released",
  "stocks_available": true,
  "stockCheckResults": [
    {
      "itemId": 2,
      "itemName": "Ball Pen (black)",
      "requestedQuantity": 100,
      "availableQuantity": 150,
      "sufficient": true
    }
  ]
}
```

**Response (Failure - Insufficient Stock)**
```json
{
  "id": 46,
  "status": "released",
  "stocks_available": false,
  "stockCheckResults": [
    {
      "itemId": 2,
      "itemName": "Ball Pen (black)",
      "requestedQuantity": 200,
      "availableQuantity": 50,
      "sufficient": false
    }
  ]
}
```

### View Released Items
```bash
GET /api/inventory/released-items
Headers: Authorization: Bearer {token}
```

**Response**
```json
[
  {
    "id": 1,
    "item_id": 2,
    "item_name": "Ball Pen (black)",
    "quantity": 100,
    "action": "release",
    "previous_stock": 200,
    "new_stock": 100,
    "notes": "Request ID: 45",
    "date": "2026-05-05",
    "time": "14:30:45",
    "current_stock": 100
  },
  {
    "id": 2,
    "item_id": 5,
    "item_name": "Battery 9v",
    "quantity": 50,
    "action": "release_failed",
    "previous_stock": 20,
    "new_stock": 20,
    "notes": "Request ID: 46 - Insufficient stock",
    "date": "2026-05-05",
    "time": "14:31:22",
    "current_stock": 20
  }
]
```

## How It Works

### When Request Marked as Released:

1. **Create Inventory Records**
   - Check if all items have inventory entries
   - Create missing entries (with 0 quantity)

2. **Check Stock**
   - Verify each item has sufficient quantity
   - Collect results for all items

3. **Deduct or Log**
   - **If all sufficient**: Deduct quantities + set `stocks_available=true`
   - **If any insufficient**: Don't deduct + set `stocks_available=false`

4. **Audit Trail**
   - Log all actions to `stock_history`
   - Include item name, quantities, dates, request ID
   - Show success or failure reason

## Database Queries

### Check Released Items
```sql
SELECT * FROM stock_history 
WHERE action IN ('release', 'release_failed')
ORDER BY date DESC;
```

### View Current Inventory
```sql
SELECT * FROM inventory 
ORDER BY item_name;
```

### View Request with Stock Status
```sql
SELECT id, ris_number, stocks_available, status
FROM ris_requests
WHERE status = 'released'
ORDER BY issued_date DESC;
```

## UI Features

### Admin RIS Requests Tab
- Shows "Stocks Available" column
- ✓ Yes (green) = sufficient stocks
- ✕ No (red) = insufficient stocks
- — (gray) = not yet released

### RIS Documents Tab
- "Stock Available?" column auto-populates
- Shows status from `stocks_available` flag
- Can manually override if needed

## Common Tasks

### Find Items Released Today
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/inventory/released-items \
  | grep "2026-05-05"
```

### Restock an Item After Release
```bash
curl -X POST http://localhost:5000/api/inventory/restock \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId": 2, "quantity": 500, "notes": "Restocking"}'
```

### View Full Audit Trail
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/inventory/history
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Empty inventory | Run `npm run sync` |
| Stock not deducting | Check item has inventory record |
| RIS Doc blank stock | Mark request as released first |
| Sync fails | Check database connection |
| No released items | Check `/api/inventory/released-items` endpoint |

## Documentation
- Full details: [INVENTORY_RELEASED_ITEMS_FIX.md](../INVENTORY_RELEASED_ITEMS_FIX.md)
- Implementation: [RELEASED_ITEMS_FIX_SUMMARY.md](../RELEASED_ITEMS_FIX_SUMMARY.md)
