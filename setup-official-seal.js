#!/usr/bin/env node

/**
 * Copy Official Seal & Generate Assets
 * This script expects the official seal to be saved as official-seal.png in assets/logo/
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

async function setupOfficialSeal() {
  const logoDir = path.join(__dirname, 'assets', 'logo');
  
  console.log('🏛️ City of General Trias - Official Seal Setup');
  console.log('==============================================\n');
  
  // Check if official seal exists
  const sealPath = path.join(logoDir, 'official-seal.png');
  const logoPath = path.join(logoDir, 'logo.png');
  
  if (!fs.existsSync(sealPath)) {
    console.log('⚠️  Official seal not found at: assets/logo/official-seal.png');
    console.log('\nTo use the official City of General Trias seal:');
    console.log('1. Save the seal image as: assets/logo/official-seal.png');
    console.log('2. Run this script again: node setup-official-seal.js');
    process.exit(0);
  }
  
  console.log('📄 Official seal found: official-seal.png');
  console.log('🔄 Generating assets...\n');
  
  try {
    // Copy to main logo.png
    fs.copyFileSync(sealPath, logoPath);
    console.log('✅ logo.png (main reference)');
    
    // Generate PNG sizes
    const sizes = [256, 128, 64, 32, 16];
    const buffers = {};
    
    for (const size of sizes) {
      await sharp(sealPath)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(path.join(logoDir, `logo-${size}.png`));
      
      const buf = await sharp(sealPath)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toBuffer();
      
      buffers[size] = buf;
      console.log(`✅ logo-${size}.png (${size}x${size})`);
    }
    
    // Generate ICO
    console.log('\n🖼️  Creating Windows icon...');
    const icoBuffer = await toIco([buffers[256], buffers[128], buffers[64]]);
    fs.writeFileSync(path.join(logoDir, 'logo.ico'), icoBuffer);
    console.log('✅ logo.ico created');
    
    // Create metadata
    const metadata = {
      official_seal: true,
      organization: 'City of General Trias',
      generated: new Date().toISOString(),
      files: {
        'official-seal.png': 'Source image',
        'logo.png': 'Main reference (full size)',
        'logo-256.png': 'High resolution',
        'logo-128.png': 'Medium resolution', 
        'logo-64.png': 'Standard size',
        'logo-32.png': 'Small',
        'logo-16.png': 'Tiny (favicon)',
        'logo.ico': 'Windows icon'
      }
    };
    fs.writeFileSync(path.join(logoDir, 'SEAL_INFO.json'), JSON.stringify(metadata, null, 2));
    
    console.log('\n✅ Official seal assets generated successfully!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: npm run build:win');
    console.log('   2. Installer will use official City of General Trias seal');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setupOfficialSeal();
