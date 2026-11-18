const { chromium } = require('C:/Users/manis/VS Code-work space/make-my-trip-clone-springboot/makemytour/node_modules/playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const outPath = 'C:/Users/manis/.gemini/antigravity/brain/b48f1874-14ce-4b90-a137-1fd9ec7b0572/homepage_airport_background_verified.png';
  await page.screenshot({ path: outPath });
  console.log('Homepage screenshot saved to:', outPath);

  await browser.close();
})();
