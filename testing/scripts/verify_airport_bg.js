const { chromium } = require('C:/Users/manis/VS Code-work space/make-my-trip-clone-springboot/makemytour/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../reports/screenshots/airport_bg_verification');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
  console.log('=== Verifying Airport Background on Homepage ===');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1000']
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check backgroundImage style of hero div
    const bgInfo = await page.evaluate(() => {
      const hero = document.querySelector('div.min-h-screen.bg-cover, div[style*="background-image"]');
      const computed = hero ? window.getComputedStyle(hero).backgroundImage : null;
      const inline = hero ? hero.style.backgroundImage : null;
      return { inline, computed };
    });

    console.log('Background style:', bgInfo);

    const shot1 = path.join(SCREENSHOTS_DIR, '01_homepage_airport_bg_top.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('Top screenshot saved to:', shot1);

    // Scroll down to collections and app banner
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(1000);

    const shot2 = path.join(SCREENSHOTS_DIR, '02_homepage_airport_bg_collections.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('Collections screenshot saved to:', shot2);

    const shotFull = path.join(SCREENSHOTS_DIR, '03_homepage_airport_bg_full.png');
    await page.screenshot({ path: shotFull, fullPage: true });
    console.log('Full page screenshot saved to:', shotFull);

    // Also copy to artifact directory for convenient display if needed
    fs.copyFileSync(shot1, 'C:/Users/manis/.gemini/antigravity/brain/b48f1874-14ce-4b90-a137-1fd9ec7b0572/airport_bg_top.png');
    fs.copyFileSync(shot2, 'C:/Users/manis/.gemini/antigravity/brain/b48f1874-14ce-4b90-a137-1fd9ec7b0572/airport_bg_collections.png');

    console.log('SUCCESS: Airport background verification complete.');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
