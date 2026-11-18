const { chromium } = require('C:/Users/manis/VS Code-work space/make-my-trip-clone-springboot/makemytour/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../reports/screenshots/flight_tracker_fix');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
  console.log('=== Verifying Flight Tracker Filter Pill Bug Fix ===');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/flight-status', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 1. Initial State
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_initial_all_flights.png') });
    const getPillCounts = async () => {
      return await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button:has(span)'));
        const pills = {};
        buttons.forEach(b => {
          const spans = b.querySelectorAll('span');
          if (spans.length >= 2) {
            const label = spans[0].innerText.trim();
            const count = spans[1].innerText.trim();
            if (['All Flights', 'Delayed', 'Boarding', 'In Flight', 'On Time', 'Landed'].includes(label)) {
              pills[label] = count;
            }
          }
        });
        return pills;
      });
    };

    const initialPills = await getPillCounts();
    console.log('Initial Pill Counts:', initialPills);

    // 2. Click "Delayed"
    console.log('\n--- Clicking Delayed Filter ---');
    const delayedBtn = await page.$('button:has-text("Delayed")');
    if (delayedBtn) {
      await delayedBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_delayed_filter_clicked.png') });
      const delayedPills = await getPillCounts();
      console.log('Pill Counts After Clicking "Delayed":', delayedPills);

      if (delayedPills['All Flights'] === initialPills['All Flights']) {
        console.log('✓ PASS: All Flights count did NOT reset to 0! Remained:', delayedPills['All Flights']);
      } else {
        console.error('✗ FAIL: All Flights count changed from', initialPills['All Flights'], 'to', delayedPills['All Flights']);
      }

      if (delayedPills['Boarding'] === initialPills['Boarding'] && delayedPills['In Flight'] === initialPills['In Flight']) {
        console.log('✓ PASS: Other pill counts remained stable and did NOT wipe out to 0!');
      } else {
        console.error('✗ FAIL: Other pill counts were wiped out!');
      }
    }

    // 3. Click "Boarding"
    console.log('\n--- Clicking Boarding Filter ---');
    const boardingBtn = await page.$('button:has-text("Boarding")');
    if (boardingBtn) {
      await boardingBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_boarding_filter_clicked.png') });
      const boardingPills = await getPillCounts();
      console.log('Pill Counts After Clicking "Boarding":', boardingPills);

      if (boardingPills['All Flights'] === initialPills['All Flights']) {
        console.log('✓ PASS: All Flights count did NOT collapse to boarding count! Remained:', boardingPills['All Flights']);
      } else {
        console.error('✗ FAIL: All Flights count collapsed to', boardingPills['All Flights']);
      }

      const visibleCards = await page.evaluate(() => {
        return document.querySelectorAll('.grid > div.bg-white.rounded-2xl').length;
      });
      console.log(`Cards rendered for Boarding filter: ${visibleCards}`);
    }

    // 4. Click "All Flights"
    console.log('\n--- Clicking All Flights ---');
    const allBtn = await page.$('button:has-text("All Flights")');
    if (allBtn) {
      await allBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_all_flights_clicked.png') });
      const restoredPills = await getPillCounts();
      console.log('Pill Counts After Clicking "All Flights":', restoredPills);

      const allCardsCount = await page.evaluate(() => {
        return document.querySelectorAll('.grid > div.bg-white.rounded-2xl').length;
      });
      console.log(`Total flight cards rendered: ${allCardsCount}`);
    }

    console.log('\n=== All Tests Completed Successfully ===');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
})();
