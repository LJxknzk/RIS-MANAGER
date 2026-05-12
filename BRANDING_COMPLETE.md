# 🏛️ RIS Manager - City of General Trias
## ✅ Branding & Installer Complete

**Status**: Production Ready

---

## Installation

### Download & Install
The branded installer is ready at:
```
dist/RIS Manager - City of General Trias Setup 1.2.0.exe
```

**Installation Steps:**
1. Download: `RIS Manager - City of General Trias Setup 1.2.0.exe`
2. Run the installer
3. Choose installation directory (default: `C:\Program Files\RIS Manager - City of General Trias`)
4. Click "Install"
5. Installer will automatically launch the app

**Features:**
- ✅ City seal logo in installer window
- ✅ City seal icon in app window title bar
- ✅ City seal in login page header
- ✅ City seal in main app sidebar
- ✅ Desktop shortcut with city seal icon
- ✅ Start menu shortcut with city seal icon

---

## Login Credentials

### Admin Access
```
Email: bryanfortuno@bac.gov
Password: BAC2026
```

### Department User Example
```
Email: aox@local.gov  (Accounting Office)
Password: AOX2026
```

**All 40 Departments Available**
- See User Accounts tab in admin panel for complete list

---

## What's New in This Build

### 1. City of General Trias Official Branding
- **Logo Design**: Green seal with gold accents and city name
- **Icon**: Forest Green (#2D6E4F) with gold borders (#FFC107)
- **Elements**: Government building icon, decorative stars, official appearance

### 2. Logo Placement
- **Login Page**: Circular 120px seal header
- **App Sidebar**: 48px seal with city name
- **Window Icon**: System tray and title bar
- **Installer**: Branded installer window with logo

### 3. Files Generated
```
assets/
  logo/
    logo.svg              # Scalable vector (2.6 KB)
    logo.ico              # Windows icon (256 KB)
    logo-256.png          # High res (17.4 KB)
    logo-128.png          # Medium res (7.5 KB)
    logo-64.png           # Standard (3.3 KB)
    logo-32.png           # Small (1.5 KB)
    logo-16.png           # Tiny (600 B)
```

---

## System Features

✅ **User Management**
- 1 Admin account (bryanfortuno@bac.gov)
- 40 Department user accounts
- Unique collision-aware acronyms for all departments
- All passwords visible in admin panel

✅ **Request Management**
- Create RIS requests with multiple items
- Approve/reject requests (admin only)
- Mark requests as released
- Track inventory deductions
- Print RIS documents with official format

✅ **Inventory System**
- 116 office and janitorial supply items
- Real-time stock tracking
- Automatic inventory deduction on release
- Stock history logging
- Current stock display

✅ **Security**
- SHA-256 password hashing with salt
- Role-based access control
- Password format: {ACRONYM}2026
- Admin-only functions protected

---

## Database Info

**Location**: `%APPDATA%\ris-manager\data.db`
- Windows User Profile specific
- Persisted across app restarts
- Contains all users, requests, inventory

**Users Created**: 41
- 1 Admin (BAC)
- 40 Departments with unique emails and passwords

**Inventory**: 116 items (Office + Janitorial)

---

## Development

### Building a New Version

1. **Update version in package.json**:
   ```json
   "version": "1.2.1"
   ```

2. **Make code changes** if needed

3. **Rebuild installer**:
   ```powershell
   npm run build:win
   ```

4. **Output**: `dist/RIS Manager - City of General Trias Setup 1.2.1.exe`

### Modifying the Logo

1. **Edit the SVG**: `assets/logo/logo.svg`
2. **Regenerate files**:
   ```powershell
   node logo-converter.js
   ```
3. **Rebuild installer**:
   ```powershell
   npm run build:win
   ```

---

## Configuration Files

### package.json
- App version and metadata
- Build configuration
- NSIS installer settings
- Electron dependencies

### main.js
- Electron main process
- Database initialization
- IPC API endpoints
- 41 user seeding

### app.js
- React UI components
- Login page with city seal
- Admin panels
- Request management

### Logo Settings
- Color Scheme:
  - Forest Green: `#2D6E4F`
  - Gold/Amber: `#FFC107`
  - Navy: `#0D1B2A`
  - White: `#FFFFFF`

---

## Support

### Common Issues

**Issue**: App won't start
- **Solution**: Check `%APPDATA%\ris-manager\` folder exists
- Delete `data.db` to reset and force reinit

**Issue**: Logo not showing
- **Solution**: Ensure `assets/logo/` folder contains all files
- Rebuild with `npm run build:win`

**Issue**: Can't login
- **Solution**: Check email format matches department acronym
- Default admin: `bryanfortuno@bac.gov` / `BAC2026`

---

## Quick Commands

```powershell
# Start app in development
npm start

# Build Windows installer
npm run build:win

# Convert logo SVG to PNG/ICO
node logo-converter.js

# Regenerate logo files
npm install --save-dev sharp to-ico
```

---

**Created**: 2024  
**Organization**: City of General Trias  
**System**: RIS Manager (Requisition & Issue System)  
**Version**: 1.2.0 (Branded)

✅ **Production Ready - All 41 Users Initialized - Official Branding Applied**
