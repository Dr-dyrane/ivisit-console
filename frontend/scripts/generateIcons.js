/**
 * PWA Icon Generator Script
 * 
 * Run this script with Node.js to generate all required PWA icons
 * from the source logo.png file.
 * 
 * Prerequisites: npm install sharp
 * Usage: node scripts/generateIcons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_LOGO = path.join(__dirname, '../public/logo.png');
const ICONS_DIR = path.join(__dirname, '../public/icons');

// Icon sizes to generate
const ICON_SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512];

// Apple touch icon size
const APPLE_ICON_SIZE = 180;

// Splash screen configurations (iOS)
const SPLASH_SCREENS = [
    { width: 750, height: 1334, name: 'splash-750x1334.png' },
    { width: 1242, height: 2208, name: 'splash-1242x2208.png' },
    { width: 1125, height: 2436, name: 'splash-1125x2436.png' },
    { width: 1242, height: 2688, name: 'splash-1242x2688.png' },
];

// Brand color for splash background
const BRAND_COLOR = { r: 134, g: 16, b: 14, alpha: 1 }; // #86100E

async function generateIcons() {
    console.log('🎨 Starting PWA icon generation...\n');

    // Ensure icons directory exists
    if (!fs.existsSync(ICONS_DIR)) {
        fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    // Check if source logo exists
    if (!fs.existsSync(SOURCE_LOGO)) {
        console.error('❌ Source logo not found:', SOURCE_LOGO);
        console.log('Please ensure logo.png exists in the public directory.');
        process.exit(1);
    }

    const sourceImage = sharp(SOURCE_LOGO);
    const metadata = await sourceImage.metadata();
    console.log(`📷 Source image: ${metadata.width}x${metadata.height} ${metadata.format}\n`);

    // Generate standard icons
    console.log('📦 Generating standard icons...');
    for (const size of ICON_SIZES) {
        const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
        await sharp(SOURCE_LOGO)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png()
            .toFile(outputPath);
        console.log(`  ✅ icon-${size}x${size}.png`);
    }

    // Generate maskable icon (with padding for safe zone)
    console.log('\n🎭 Generating maskable icon...');
    const maskableSize = 512;
    const iconSize = Math.floor(maskableSize * 0.8); // 80% of canvas for safe zone
    const padding = Math.floor((maskableSize - iconSize) / 2);

    await sharp(SOURCE_LOGO)
        .resize(iconSize, iconSize, { fit: 'contain' })
        .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: BRAND_COLOR
        })
        .png()
        .toFile(path.join(ICONS_DIR, 'maskable-icon-512x512.png'));
    console.log('  ✅ maskable-icon-512x512.png');

    // Generate Apple touch icon
    console.log('\n🍎 Generating Apple touch icon...');
    await sharp(SOURCE_LOGO)
        .resize(APPLE_ICON_SIZE, APPLE_ICON_SIZE, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
    console.log('  ✅ apple-touch-icon.png (180x180)');

    // Generate splash screens
    console.log('\n📱 Generating iOS splash screens...');
    for (const splash of SPLASH_SCREENS) {
        const logoSize = Math.min(splash.width, splash.height) * 0.3;
        const logo = await sharp(SOURCE_LOGO)
            .resize(Math.floor(logoSize), Math.floor(logoSize), { fit: 'contain' })
            .toBuffer();

        await sharp({
            create: {
                width: splash.width,
                height: splash.height,
                channels: 4,
                background: BRAND_COLOR
            }
        })
            .composite([{
                input: logo,
                gravity: 'center'
            }])
            .png()
            .toFile(path.join(ICONS_DIR, splash.name));
        console.log(`  ✅ ${splash.name}`);
    }

    console.log('\n✨ All icons generated successfully!');
    console.log(`📁 Output directory: ${ICONS_DIR}`);
}

// Run the generator
generateIcons().catch(console.error);
