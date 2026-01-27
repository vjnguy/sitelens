/**
 * Capture screenshots from the actual Siteora app for the demo video
 *
 * Run: npx ts-node scripts/capture-screenshots.ts
 *
 * Make sure the app is running at http://localhost:3000
 */

import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'screenshots');
const APP_URL = 'http://localhost:3000';

async function captureScreenshots() {
  console.log('🎬 Capturing screenshots from Siteora app...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set viewport to 1920x1080 for HD video
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // 1. Capture the main app/map view
    console.log('📸 Capturing: Main map view...');
    await page.goto(`${APP_URL}/app`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for map to load
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01-map-initial.png'),
      fullPage: false
    });
    console.log('   ✅ Saved 01-map-initial.png');

    // 2. Click on search and type an address
    console.log('📸 Capturing: Search with address...');
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.click();
      await page.keyboard.type('42 Smith Street, Brisbane', { delay: 50 });
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '02-search-typing.png'),
        fullPage: false
      });
      console.log('   ✅ Saved 02-search-typing.png');

      // Press enter or click a result if available
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    // 3. Capture map with property selected (if available)
    console.log('📸 Capturing: Property selected view...');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '03-property-selected.png'),
      fullPage: false
    });
    console.log('   ✅ Saved 03-property-selected.png');

    // 4. Try to open layers panel
    console.log('📸 Capturing: Layers panel open...');
    // Look for a layers button
    const layersButton = await page.$('button:has-text("Layers")') ||
                         await page.$('[aria-label*="layer"]') ||
                         await page.$('button svg[class*="layers"]');
    if (layersButton) {
      await layersButton.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '04-layers-panel.png'),
      fullPage: false
    });
    console.log('   ✅ Saved 04-layers-panel.png');

    // 5. Toggle some layers if possible
    console.log('📸 Capturing: Layers toggled...');
    // Try to find and click layer toggles
    const toggles = await page.$$('button[role="switch"]');
    for (let i = 0; i < Math.min(3, toggles.length); i++) {
      await toggles[i].click();
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '05-layers-active.png'),
      fullPage: false
    });
    console.log('   ✅ Saved 05-layers-active.png');

    // 6. Try to open property/analysis panel
    console.log('📸 Capturing: Analysis panel...');
    const analysisButton = await page.$('button:has-text("Property")') ||
                           await page.$('button:has-text("Analysis")') ||
                           await page.$('[aria-label*="property"]');
    if (analysisButton) {
      await analysisButton.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '06-analysis-panel.png'),
      fullPage: false
    });
    console.log('   ✅ Saved 06-analysis-panel.png');

    // 7. Capture landing page
    console.log('📸 Capturing: Landing page...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '07-landing-page.png'),
      fullPage: false
    });
    console.log('   ✅ Saved 07-landing-page.png');

    console.log('\n✨ All screenshots captured!');
    console.log(`   Output directory: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
