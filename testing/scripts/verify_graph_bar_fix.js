const { chromium } = require('C:/Users/manis/VS Code-work space/make-my-trip-clone-springboot/makemytour/node_modules/playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('=== Verifying Graph Bar Size Fix for Hotels & Flights ===');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // 1. Hotel Rate History for Radisson Blu Plaza (HT-NEW-205)
    console.log('Navigating to Radisson Blu Plaza (HT-NEW-205)...');
    await page.goto('http://localhost:3000/book-hotel/HT-NEW-205', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const rateHistoryBtn = page.locator('button:has-text("Rate History")').first();
    await rateHistoryBtn.waitFor({ state: 'visible', timeout: 10000 });
    await rateHistoryBtn.click();
    await page.waitForTimeout(1000);

    // Extract bar data from modal
    const hotelBars = await page.evaluate(() => {
      const container = document.querySelector('.bg-slate-900.rounded-xl');
      if (!container) return null;
      const columns = Array.from(container.querySelectorAll('.flex-1.flex.flex-col'));
      return columns.map(col => {
        const price = col.querySelector('span.font-mono')?.textContent?.trim();
        const day = col.querySelectorAll('span')[1]?.textContent?.trim();
        const barDiv = col.querySelector('.rounded-t[style*="height"]');
        const heightStyle = barDiv ? barDiv.getAttribute('style') : null;
        const computedHeight = barDiv ? window.getComputedStyle(barDiv).height : null;
        return { day, price, heightStyle, computedHeight };
      });
    });

    console.log('Hotel Bar Results for Radisson Blu Plaza:', JSON.stringify(hotelBars, null, 2));

    const shot1 = 'C:/Users/manis/.gemini/antigravity/brain/b48f1874-14ce-4b90-a137-1fd9ec7b0572/hotel_rate_trend_fixed.png';
    await page.screenshot({ path: shot1 });
    console.log('Saved hotel modal screenshot to:', shot1);

    const modalLocator = page.locator('.bg-white.rounded-2xl.max-w-lg');
    const shotClose = 'C:/Users/manis/.gemini/antigravity/brain/b48f1874-14ce-4b90-a137-1fd9ec7b0572/modal_rate_trend_fixed.png';
    await modalLocator.screenshot({ path: shotClose });
    console.log('Saved modal close-up screenshot to:', shotClose);

    // Verify hotel bar heights are different
    if (hotelBars && hotelBars.length > 0) {
      const heights = hotelBars.map(b => b.heightStyle);
      const uniqueHeights = new Set(heights);
      console.log(`Unique heights count: ${uniqueHeights.size} out of ${heights.length}`);
      if (uniqueHeights.size > 1) {
        console.log('PASS: Hotel graph bar sizes are dynamically scaled and differentiated!');
      } else {
        console.error('FAIL: All hotel graph bars have the same size!');
      }
    }

    // Close hotel modal
    await page.locator('button:has-text("Close")').click();
    await page.waitForTimeout(500);

    // 2. Flight Fare History
    // Fetch a flight ID
    const flights = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8081/api/flights');
      return await res.json();
    });

    if (flights && flights.length > 0) {
      const flightId = flights[0].id || flights[0]._id;
      console.log(`Testing flight fare history for flight ${flightId}...`);
      await page.goto(`http://localhost:3000/book-flight/${flightId}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const fareBtn = page.locator('button:has-text("Fare History"), button:has-text("Rate History")').first();
      if (await fareBtn.isVisible()) {
        await fareBtn.click();
        await page.waitForTimeout(1000);

        const flightBars = await page.evaluate(() => {
          const container = document.querySelector('.bg-slate-900.rounded-xl');
          if (!container) return null;
          const columns = Array.from(container.querySelectorAll('.flex-1.flex.flex-col'));
          return columns.map(col => {
            const price = col.querySelector('span.font-mono')?.textContent?.trim();
            const day = col.querySelectorAll('span')[1]?.textContent?.trim();
            const barDiv = col.querySelector('.rounded-t[style*="height"]');
            const heightStyle = barDiv ? barDiv.getAttribute('style') : null;
            return { day, price, heightStyle };
          });
        });

        console.log('Flight Bar Results:', JSON.stringify(flightBars, null, 2));

        const shot2 = 'C:/Users/manis/.gemini/antigravity/brain/b48f1874-14ce-4b90-a137-1fd9ec7b0572/flight_fare_trend_fixed.png';
        await page.screenshot({ path: shot2 });
        console.log('Saved flight modal screenshot to:', shot2);
      }
    }

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    await browser.close();
  }
})();
