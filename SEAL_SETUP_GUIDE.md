# 🏛️ RIS Manager - Official Seal Integration

## Quick Setup (3 Steps)

### Step 1: Save Official Seal Image
1. **Right-click on the City of General Trias seal image** (the one you sent with green border, stars, and MMXV text)
2. **Save As**: Choose `official-seal.png`
3. **Location**: Save to `C:\Users\Lem Jasper\OneDrive\Desktop\RIS-MANAGER\assets\logo\`

Result: `assets/logo/official-seal.png` should now exist

### Step 2: Generate App Assets
Open PowerShell in the RIS-MANAGER folder and run:

```powershell
npm run setup:seal
```

This will:
- ✅ Copy seal as main logo
- ✅ Create PNG versions (256, 128, 64, 32, 16px)
- ✅ Generate Windows ICO icon
- ✅ Create metadata file

Expected output:
```
✅ logo.png
✅ logo-256.png
✅ logo-128.png
✅ logo-64.png
✅ logo-32.png
✅ logo-16.png
✅ logo.ico created
```

### Step 3: Build & Deploy
```powershell
npm run build:win
```

Creates: `dist/RIS Manager - City of General Trias Setup 1.2.0.exe`

---

## What This Does

The official City of General Trias seal will appear in:
- 🏛️ **Login Page**: Large seal header (140x140px)
- 🏛️ **App Sidebar**: Small seal icon (48x48px) 
- 🏛️ **Window Title Bar**: System icon
- 🏛️ **Desktop Shortcut**: Icon from seal
- 🏛️ **Start Menu**: Branded with official seal
- 🏛️ **Installer Window**: Official seal displayed

---

## File Structure

After Step 2, your logo folder should have:
```
assets/logo/
├── official-seal.png          (SOURCE - you save this)
├── logo.png                   (Main reference, same as official-seal.png)
├── logo-256.png               (256x256px)
├── logo-128.png               (128x128px)
├── logo-64.png                (64x64px)
├── logo-32.png                (32x32px)
├── logo-16.png                (16x16px)
├── logo.ico                   (Windows icon format)
└── SEAL_INFO.json             (Metadata)
```

---

## Verification Commands

Check that official seal was saved:
```powershell
Test-Path "assets/logo/official-seal.png"
# Should return: True
```

Check that assets were generated:
```powershell
Get-ChildItem "assets/logo/*" | Select-Object Name, Length
```

Should show all PNG files and logo.ico (~250KB)

---

## Testing the Setup

After Step 2, test the app:
```powershell
npm start
```

You should see:
- ✅ Official seal in login page header
- ✅ Official seal in app sidebar
- ✅ Professional City of General Trias branding

---

## Alternative: Use Python Converter

If Node.js converter fails, try Python:
```powershell
python setup-seal.py
```

Requires: `pip install Pillow pillow-ico`

---

## Troubleshooting

**Problem: "Official seal not found"**
```
Solution: 
1. Right-click the seal image you sent
2. Select "Save image as..."
3. Filename: official-seal.png
4. Save to: assets/logo/
5. Retry: npm run setup:seal
```

**Problem: Assets not generating**
```
Solution:
1. Delete old logo files: rm assets/logo/logo*.png
2. Ensure official-seal.png exists and is readable
3. Run: npm run setup:seal
```

**Problem: Installer still shows old logo**
```
Solution:
1. Delete dist folder: rm dist/ -Recurse -Force
2. Regenerate assets: npm run setup:seal
3. Rebuild installer: npm run build:win
```

**Problem: Can't save official-seal.png**
```
Solution:
1. Make sure assets/logo/ folder exists: mkdir -p assets/logo
2. Check folder permissions (should be writable)
3. Try saving to Desktop first, then move to assets/logo/
```

---

## Complete Workflow

```powershell
# 1. Save official-seal.png to assets/logo/

# 2. Generate assets
npm run setup:seal

# 3. Verify files created
Get-ChildItem assets/logo/

# 4. Test in development
npm start

# 5. Build installer
npm run build:win

# 6. Test installer
& "dist/RIS Manager - City of General Trias Setup 1.2.0.exe"
```

---

## Notes

- **First time only**: You need to manually save the `official-seal.png` file
- **Updates**: If you ever need to update the seal, just replace `official-seal.png` and run `npm run setup:seal` again
- **Version builds**: Each rebuild will use the latest `official-seal.png`
- **Official**: The seal will be used throughout the entire app and installer

---

**Organization**: City of General Trias  
**System**: RIS Manager  
**Version**: 1.2.0 (Official Seal Edition)

✅ Ready to integrate official City of General Trias seal!
