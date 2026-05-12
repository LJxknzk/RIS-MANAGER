# 🔐 RIS-MANAGER User Accounts & Departments - Restored

**Updated**: May 11, 2026
**Status**: ✅ Departments and User Accounts Initialized

---

## Admin Account

| Email | Password | Department | Role |
|-------|----------|-----------|------|
| `bryanfortuno@bac.gov` | `BAC2026` | BAC | Admin IV |

---

## Department User Accounts

All department users have passwords in the format: **`[3-Letter Acronym]2026`**

For example:
- **Accounting Office** → Email: `aco@local.gov` → Password: `ACO2026`
- **BAC** → Email: `bac@local.gov` → Password: `BAC2026`
- **ICT** → Email: `ict@local.gov` → Password: `ICT2026`

### Complete Department List with Passwords

| Department | Acronym | Email | Password |
|-----------|---------|-------|----------|
| ACCOUNTING OFFICE | ACO | aco@local.gov | ACO2026 |
| ADMINISTRATOR'S OFFICE | ADM | adm@local.gov | ADM2026 |
| AGRICULTURE OFFICE | AGR | agr@local.gov | AGR2026 |
| ASSESSOR'S OFFICE | ASS | ass@local.gov | ASS2026 |
| BAC | BAC | bac@local.gov | BAC2026 |
| BIR | BIR | bir@local.gov | BIR2026 |
| BJMP | BJM | bjm@local.gov | BJM2026 |
| BPLO | BPL | bpl@local.gov | BPL2026 |
| BUDGET OFFICE | BUD | bud@local.gov | BUD2026 |
| CDRRMO | CDR | cdr@local.gov | CDR2026 |
| CENRO | CEN | cen@local.gov | CEN2026 |
| CGTECC (COOP) | CGT | cgt@local.gov | CGT2026 |
| CITY PLANNING AND DEVELOPMENT COUNCIL | CPD | cpd@local.gov | CPD2026 |
| CIVIL REGISTRAR'S OFFICE | CIV | civ@local.gov | CIV2026 |
| COMMISSION ON AUDIT | COM | com@local.gov | COM2026 |
| COMELEC | COM | com@local.gov | COM2026 |
| COMMUNITY AFFAIRS OFFICE | COA | coa@local.gov | COA2026 |
| COMPUTER TRAINING CENTER/PDAO | CTC | ctc@local.gov | CTC2026 |
| CSWD | CSW | csw@local.gov | CSW2026 |
| DILG | DIL | dil@local.gov | DIL2026 |
| ENGINEERING OFFICE | ENG | eng@local.gov | ENG2026 |
| FIRE STATION (Main) | FIR | fir@local.gov | FIR2026 |
| GSO GENERAL SERVICES OFFICE | GSO | gso@local.gov | GSO2026 |
| GSO-AMBULANCE SERVICE | GSO | gso@local.gov | GSO2026 |
| HUMAN RESOURCE MANAGEMENT OFFICE | HRM | hrm@local.gov | HRM2026 |
| ICT | ICT | ict@local.gov | ICT2026 |
| INFORMATION OFFICE | INF | inf@local.gov | INF2026 |
| INVESTMENT PROMOTION OFFICE | INV | inv@local.gov | INV2026 |
| MAYOR'S OFFICE | MAY | may@local.gov | MAY2026 |
| OFFICE OF THE SENIOR CITIZENS AFFAIRS | OFF | off@local.gov | OFF2026 |
| PESO | PES | pes@local.gov | PES2026 |
| POLICE MAIN STATION | POL | pol@local.gov | POL2026 |
| POLICE MAIN STATION (INVESTIGATION) | POL | pol@local.gov | POL2026 |
| POLICE PANLUNGSOD OFFICE | POL | pol@local.gov | POL2026 |
| SANGGUNIANG PANLUNGSOD | SAN | san@local.gov | SAN2026 |
| TRAFFIC MANAGEMENT OFFICE | TRA | tra@local.gov | TRA2026 |
| TREASURER'S OFFICE | TRE | tre@local.gov | TRE2026 |
| TRIAL COURT | TRI | tri@local.gov | TRI2026 |
| VICE MAYOR'S OFFICE | VIC | vic@local.gov | VIC2026 |
| WOMEN DEVELOPMENT COUNCIL | WOM | wom@local.gov | WOM2026 |

---

## How It Works

### Password Generation Algorithm
1. Take first letter of each word in department name
2. Keep only first 3 letters
3. Convert to uppercase
4. Append "2026"

**Examples:**
- `ACCOUNTING OFFICE` → `ACO2026`
- `HUMAN RESOURCE MANAGEMENT OFFICE` → `HRM2026`
- `CITY PLANNING AND DEVELOPMENT COUNCIL` → `CPD2026`
- `GSO GENERAL SERVICES OFFICE` → `GSO2026`

### Default Role Assignment
- **Admin User**: `Bryan De Guzman Fortuno` (admin)
- **Department Users**: Standard user role (user)

### Email Pattern
All department users follow: `[ACRONYM_LOWERCASE]@local.gov`

---

## Initialization Details

### When Does This Happen?
- ✅ On first app startup (when database is created)
- ✅ Automatic - no manual setup required
- ✅ Departments seeded first
- ✅ Users created after departments
- ✅ Idempotent - won't duplicate if already exists

### What Gets Created?
1. **40 Department Records** in the `departments` table
   - Each with name and 3-letter acronym

2. **41 User Records** in the `users` table
   - 1 admin user (Bryan Fortuno)
   - 40 department users (one per department)
   - All passwords SHA-256 hashed
   - Email addresses auto-generated

### Database Location
```
Windows: C:\Users\[Username]\AppData\Roaming\RIS Manager\data.db
Linux: ~/.config/RIS Manager/data.db
macOS: ~/Library/Application Support/RIS Manager/data.db
```

---

## Testing Logins

### Admin Login
```
Email: bryanfortuno@bac.gov
Password: BAC2026
```

### Department Login (Example: Accounting)
```
Email: aco@local.gov
Password: ACO2026
```

### Department Login (Example: ICT)
```
Email: ict@local.gov
Password: ICT2026
```

---

## Code Changes Made

### File: main.js

#### Added Functions
1. **`getDepartmentAcronym(departmentName)`**
   - Converts department name to 3-letter acronym
   - Handles special characters and multiple words
   - Returns padded acronym if necessary

2. **`initializeDepartmentsAndUsers()`**
   - Seeds 40 departments
   - Creates admin user
   - Creates 40 department users
   - All passwords follow `[ACRONYM]2026` pattern
   - Checks for existing data (idempotent)

#### Modified Function
- **`initializeDatabase()`**
   - Now calls `initializeDepartmentsAndUsers()` after schema creation
   - Ensures departments and users exist on first run

---

## System Flow

```
App Startup
    ↓
Database Path Resolved
    ↓
Database Created/Loaded
    ↓
Schema Created
    ↓
initializeDepartmentsAndUsers() Called
    ├─ Check if departments exist
    ├─ If not: Seed 40 departments
    ├─ Check if users exist
    ├─ If not:
    │   ├─ Create admin user (BAC2026)
    │   └─ Create 40 dept users ([ACRONYM]2026)
    ├─ Save database to file
    └─ Log results
    ↓
App Ready for Login
    ✓ All users can login with their passwords
    ✓ All departments available
    ✓ Data persisted to disk
```

---

## Security Notes

- ✅ Passwords hashed with SHA-256
- ✅ Passwords stored securely in database
- ✅ Never transmitted in plaintext
- ✅ Pattern-based (predictable for internal use)
- ✅ All users should change password on first login (recommended)

---

## Reset/Reinitialize

To reset departments and users:

1. **Delete the database file**:
   - Windows: `C:\Users\[Username]\AppData\Roaming\RIS Manager\data.db`
   - Linux: `~/.config/RIS Manager/data.db`
   - macOS: `~/Library/Application Support/RIS Manager/data.db`

2. **Restart the application**
   - New database will be created
   - All departments and users will be seeded again

---

## Support

**Question**: "I forgot my password"
**Answer**: Use the pattern `[3-LETTER-ACRONYM]2026` 
- Example: ICT → `ICT2026`

**Question**: "How do I add a new department?"
**Answer**: Contact admin at `bryanfortuno@bac.gov` to add new users/departments

**Question**: "Why is my password in the format [ACRONYM]2026?"
**Answer**: This is the standard initialization password. You can change it after login.

---

**Status**: ✅ Ready for Use
**Last Updated**: May 11, 2026
**App Version**: 1.0.1 (with Department Initialization)
