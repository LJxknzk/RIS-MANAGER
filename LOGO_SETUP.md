# Logo Setup Instructions

## Current Status
✅ App branding updated with City of General Trias seal design
✅ SVG logo created: `assets/logo/logo.svg`
⏳ ICO icon file needed for Windows app icon

## To Complete the Logo Integration

### Option 1: Using Online Converter (Quick)
1. Open `assets/logo/logo.svg` in a text editor to view the file
2. Upload to an online SVG to ICO converter:
   - https://convertio.co/svg-ico/
   - https://cloudconvert.com/svg-to-ico
3. Save the resulting `logo.ico` to `assets/logo/logo.ico`

### Option 2: Using ImageMagick (Windows)
```powershell
# Install ImageMagick if not already installed
choco install imagemagick

# Convert SVG to ICO
magick convert assets/logo/logo.svg -define icon:auto-resize=256,128,96,64,48,32,16 assets/logo/logo.ico
```

### Option 3: Using Node.js with Sharp (Recommended)
```powershell
# Install sharp and ico packages
npm install --save-dev sharp icojs

# Then run the conversion script (create logo-converter.js):
```

Create `logo-converter.js`:
```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createICO() {
  try {
    // Create PNG first
    await sharp('assets/logo/logo.svg')
      .png()
      .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toFile('assets/logo/logo-256.png');
    
    console.log('✅ Logo PNG created successfully');
    console.log('Next: Convert logo-256.png to logo.ico using an online converter or ImageMagick');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createICO();
```

## Files Generated
- ✅ `assets/logo/logo.svg` - Scalable vector logo with City of General Trias seal
- ⏳ `assets/logo/logo.ico` - Needed for Windows app icon (needs to be created)

## Next Steps After Logo is Ready

1. **Place the logo.ico file**:
   ```
   assets/logo/logo.ico
   ```

2. **Build the installer**:
   ```powershell
   npm run build:win
   ```

3. **Verify in installer**:
   - The installer should display the city seal as the app icon
   - Window title bar shows the city seal
   - Installer header may show the logo

## Logo Design Details
- **Main Colors**: 
  - Forest Green: #2D6E4F (background)
  - Gold/Amber: #FFC107 (accent, border)
  - White: #FFFFFF (text, elements)
- **Elements**: Government building, decorative stars, city name
- **Used in**:
  - Login page header (circular seal 120px)
  - Main app sidebar (48px version)
  - Window icon
  - Installer branding

## Building the Installer
After logo.ico is created, run:
```powershell
npm run build:win
# Or for all platforms:
npm run build
```

This will create an installer at: `dist/RIS Manager - City of General Trias Setup 1.2.0.exe`
