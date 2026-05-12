#!/usr/bin/env node

/**
 * Logo Converter Script
 * Converts logo.svg to PNG and ICO formats for use in Electron app
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 RIS Manager Logo Converter');
console.log('================================\n');

// Check if SVG exists
const svgPath = path.join(__dirname, 'assets', 'logo', 'logo.svg');
if (!fs.existsSync(svgPath)) {
  console.error('❌ Logo SVG not found at:', svgPath);
  process.exit(1);
}

console.log('📄 SVG logo found:', svgPath);

// Try to use sharp if available
try {
  const sharp = require('sharp');
  const toIco = require('to-ico');
  
  async function convertLogo() {
    try {
      const logoDir = path.join(__dirname, 'assets', 'logo');
      
      // Create PNG versions
      console.log('🔄 Creating PNG versions...');
      
      await sharp(svgPath)
        .png()
        .resize(256, 256, { fit: 'contain', background: { r: 45, g: 110, b: 79, alpha: 1 } })
        .toFile(path.join(logoDir, 'logo-256.png'));
      
      await sharp(svgPath)
        .png()
        .resize(128, 128, { fit: 'contain', background: { r: 45, g: 110, b: 79, alpha: 1 } })
        .toFile(path.join(logoDir, 'logo-128.png'));
      
      await sharp(svgPath)
        .png()
        .resize(64, 64, { fit: 'contain', background: { r: 45, g: 110, b: 79, alpha: 1 } })
        .toFile(path.join(logoDir, 'logo-64.png'));
      
      console.log('✅ PNG files created:');
      console.log('   - logo-256.png');
      console.log('   - logo-128.png');
      console.log('   - logo-64.png');
      
      // Create ICO file
      console.log('🔄 Creating ICO file...');
      
      const pngBuffer = fs.readFileSync(path.join(logoDir, 'logo-256.png'));
      const icoBuffer = await toIco([pngBuffer]);
      fs.writeFileSync(path.join(logoDir, 'logo.ico'), icoBuffer);
      
      console.log('✅ ICO file created: logo.ico');
      console.log('✅ All logo files ready for Electron build!');
      console.log('\n🚀 Next: Run "npm run build:win" to create the installer');
      console.log('   Output: dist/RIS Manager - City of General Trias Setup 1.2.0.exe');
      
    } catch (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  }
  
  convertLogo();
  
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.log('⚠️  sharp or to-ico package not installed.');
    console.log('   Install with: npm install --save-dev sharp to-ico');
  } else {
    console.error('❌ Error:', err.message);
  }
}

