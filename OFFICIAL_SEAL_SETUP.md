# 🏛️ Using Official City of General Trias Seal

## Setup Instructions

### Step 1: Save the Official Seal Image
1. Right-click on the official City of General Trias seal image (the one with green border, stars, and MMXV)
2. Save As: `official-seal.png`
3. Move it to: `assets/logo/official-seal.png`

**File should be saved at**:
```
C:\Users\Lem Jasper\OneDrive\Desktop\RIS-MANAGER\assets\logo\official-seal.png
```

### Step 2: Generate App & Installer Assets
```powershell
cd "C:\Users\Lem Jasper\OneDrive\Desktop\RIS-MANAGER"
node setup-official-seal.js
```

This will:
- ✅ Copy official seal as main logo
- ✅ Create resized PNG versions (256, 128, 64, 32, 16px)
- ✅ Generate Windows ICO icon format
- ✅ Create metadata file

### Step 3: Rebuild Installer
```powershell
npm run build:win
```

The new installer will include:
- 🏛️ Official seal in login page
- 🏛️ Official seal in app sidebar  
- 🏛️ Official seal in window title bar
- 🏛️ Official seal in installer window
- 🏛️ Official seal as desktop shortcut icon

---

## Files Created

After running `setup-official-seal.js`, you'll have:

```
assets/logo/
├── official-seal.png         ← SOURCE (save this first)
├── logo.png                  ← Main reference
├── logo-256.png              ← High res
├── logo-128.png              ← Medium res
├── logo-64.png               ← Standard
├── logo-32.png               ← Small
├── logo-16.png               ← Tiny
├── logo.ico                  ← Windows icon
└── SEAL_INFO.json            ← Metadata
```

---

## Verification

After setup, verify the files exist:
```powershell
ls assets/logo/ | Select-Object Name, Length
```

Should show all PNG files and logo.ico (~250-260 KB).

---

## Building With Official Seal

```bash
# Full process:
node setup-official-seal.js    # Generate assets from seal
npm run build:win               # Build installer with seal
```

Output: `dist/RIS Manager - City of General Trias Setup 1.2.0.exe`

---

## Troubleshooting

**Q: Setup script says seal not found**
- A: Make sure you saved the image as `official-seal.png` in `assets/logo/`

**Q: Logo still not showing in app**
- A: Check file exists at `assets/logo/logo.png`
- Run `npm start` to test in development mode

**Q: Installer doesn't show seal**
- A: Delete old installer files and rebuild:
  ```powershell
  rm dist/*.exe -Force
  npm run build:win
  ```

---

**Organization**: City of General Trias  
**System**: RIS Manager  
**Official Seal**: Used in app, installer, and windows icons
