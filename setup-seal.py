#!/usr/bin/env python3
"""
City of General Trias - Official Seal Image Processor
Converts official seal PNG to app assets (PNG sizes + ICO format)
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("❌ Pillow not installed")
    print("   Install with: pip install Pillow pillow-ico")
    sys.exit(1)

def setup_seal():
    script_dir = Path(__file__).parent
    logo_dir = script_dir / 'assets' / 'logo'
    logo_dir.mkdir(parents=True, exist_ok=True)
    
    print("🏛️ City of General Trias - Official Seal Processor")
    print("=" * 50)
    print()
    
    # Check for source seal
    seal_path = logo_dir / 'official-seal.png'
    
    if not seal_path.exists():
        print("⚠️  Official seal not found at: assets/logo/official-seal.png")
        print("\nTo proceed:")
        print("1. Save the official City of General Trias seal as: assets/logo/official-seal.png")
        print("2. Run this script again")
        return
    
    print(f"📄 Official seal found: {seal_path.name}")
    print("🔄 Processing seal image...\n")
    
    try:
        # Open seal
        seal = Image.open(seal_path)
        print(f"   Original size: {seal.size}")
        
        # Copy as main logo
        seal.save(logo_dir / 'logo.png', 'PNG')
        print("✅ logo.png (main reference)")
        
        # Generate sizes
        sizes = [256, 128, 64, 32, 16]
        for size in sizes:
            resized = seal.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(logo_dir / f'logo-{size}.png', 'PNG')
            print(f"✅ logo-{size}.png ({size}x{size})")
        
        # Generate ICO (try using PIL or fallback)
        print("\n🖼️  Creating Windows icon...")
        try:
            # Try using PIL's ICO support if available
            sizes_for_ico = [(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)]
            ico_images = [seal.resize(s, Image.Resampling.LANCZOS) for s in sizes_for_ico]
            
            # Save as ICO
            ico_images[0].save(
                logo_dir / 'logo.ico',
                'ICO',
                sizes=[s for s in sizes_for_ico]
            )
            print("✅ logo.ico created")
        except Exception as e:
            print(f"⚠️  Could not create ICO: {e}")
            print("   Run: npm run setup:seal (uses Node.js converter instead)")
        
        print("\n✅ Official seal assets generated successfully!")
        print("\n🚀 Next: npm run build:win")
        
    except Exception as e:
        print(f"❌ Error processing seal: {e}")
        sys.exit(1)

if __name__ == '__main__':
    setup_seal()
