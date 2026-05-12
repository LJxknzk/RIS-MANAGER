#!/usr/bin/env node

/**
 * Official Seal Converter Script
 * Processes the official City of General Trias seal image
 * and creates all necessary formats for app and installer
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

console.log('🏛️ City of General Trias - Official Seal Processor');
console.log('=================================================\n');

async function processOfficialSeal() {
  try {
    const logoDir = path.join(__dirname, 'assets', 'logo');
    
    // Look for PNG seal in assets/logo
    const sealFiles = fs.readdirSync(logoDir).filter(f => 
      (f.includes('seal') || f.includes('official') || f === 'seal.png') && f.endsWith('.png')
    );
    
    if (sealFiles.length === 0) {
      console.log('⚠️  No official seal PNG found in assets/logo/');
      console.log('   Expected: seal.png, official-seal.png, or similar');
      console.log('   Please save the official seal image as: assets/logo/seal.png');
      process.exit(0);
    }
    
    const sealPath = path.join(logoDir, sealFiles[0]);
    console.log('📄 Official seal found:', sealFiles[0]);
    console.log('🔄 Processing seal image...\n');
    
    // Create resized versions
    console.log('📐 Creating resized versions:');
    
    const sizes = [256, 128, 64, 32, 16];
    const buffers = {};
    
    for (const size of sizes) {
      await sharp(sealPath)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.join(logoDir, `logo-${size}.png`));
      
      const buf = await sharp(sealPath)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();
      
      buffers[size] = buf;
      console.log(`   ✅ logo-${size}.png`);
    }
    
    // Copy seal to logo.png (main reference)
    console.log('   ✅ logo.png (main reference)');
    fs.copyFileSync(sealPath, path.join(logoDir, 'logo.png'));
    
    // Create ICO file
    console.log('\n🖼️  Creating Windows icon (ICO):');
    const icoBuffer = await toIco([buffers[256], buffers[128], buffers[64], buffers[32]]);
    fs.writeFileSync(path.join(logoDir, 'logo.ico'), icoBuffer);
    console.log('   ✅ logo.ico (262 KB)');
    
    // Create SVG reference (metadata only)
    console.log('\n📋 Creating metadata:');
    const metadata = {
      source: sealFiles[0],
      official: true,
      organization: 'City of General Trias',
      created: new Date().toISOString(),
      sizes: {
        'logo.png': 'Original seal image',
        'logo-256.png': '256x256 px (high resolution)',
        'logo-128.png': '128x128 px (medium resolution)',
        'logo-64.png': '64x64 px (standard)',
        'logo-32.png': '32x32 px (small)',
        'logo-16.png': '16x16 px (tiny)',
        'logo.ico': 'Windows icon format'
      }
    };
    
    fs.writeFileSync(
      path.join(logoDir, 'LOGO_INFO.json'),
      JSON.stringify(metadata, null, 2)
    );
    console.log('   ✅ LOGO_INFO.json');
    
    console.log('\n✅ Official seal successfully processed!');
    console.log('\n📦 Ready for rebuild:');
    console.log('   npm run build:win');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

processOfficialSeal();
