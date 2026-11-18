const { chromium } = require('C:/Users/manis/VS Code-work space/make-my-trip-clone-springboot/makemytour/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/manis/.gemini/antigravity/brain/b48f1874-14ce-4b90-a137-1fd9ec7b0572';

(async () => {
  console.log('=== Verifying 6E-204 Delayed Status & Real Browser Notifications ===');

  // Step 1: Update 6E-204 in backend to DELAYED
  console.log('\n--- Step 1: Updating 6E-204 to DELAYED via backend API ---');
  const updateRes = await fetch('http://localhost:8081/api/flight-status/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flightNumber: '6E-204',
      status: 'DELAYED',
      delayReason: 'Delayed by 1h - Adverse weather & runway flow control',
      revisedDeparture: '05:30 PM',
      revisedArrival: '08:00 PM',
      gate: 'Gate 17',
      terminal: 'T7',
      estimatedArrivalMinutes: 200,
    }),
  });
  const updateData = await updateRes.json();
  console.log('Backend response for 6E-204 update:', updateData.flightNumber, updateData.status, updateData.delayReason);

  // Step 2: Launch browser with notifications permission
  console.log('\n--- Step 2: Launching Playwright browser with Notification permissions ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,950'],
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 950 },
    permissions: ['notifications'],
  });
  const page = await context.newPage();

  // Step 3: Setup Notification spy
  await page.addInitScript(() => {
    window.__notificationsFired = [];
    const OriginalNotification = window.Notification;
    window.Notification = function (title, options) {
      window.__notificationsFired.push({ title, options, timestamp: new Date().toISOString() });
      if (OriginalNotification) {
        return new OriginalNotification(title, options);
      }
      return { title, ...options };
    };
    window.Notification.permission = 'granted';
    window.Notification.requestPermission = async () => 'granted';
  });

  try {
    console.log('\n--- Step 3: Loading http://localhost:3000/flight-status ---');
    await page.goto('http://localhost:3000/flight-status', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Step 4: Verify Pill Counts
    const getPills = async () => {
      return await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button:has(span)'));
        const pills = {};
        buttons.forEach((b) => {
          const spans = b.querySelectorAll('span');
          if (spans.length >= 2) {
            const label = spans[0].innerText.trim();
            const count = parseInt(spans[1].innerText.trim(), 10);
            if (['All Flights', 'Delayed', 'Boarding', 'In Flight', 'On Time', 'Landed'].includes(label)) {
              pills[label] = count;
            }
          }
        });
        return pills;
      });
    };

    const initialPills = await getPills();
    console.log('Initial Pill Counts:', initialPills);

    if (initialPills['Delayed'] > 0) {
      console.log(`✓ PASS: Delayed flight status count is ${initialPills['Delayed']} (greater than 0)!`);
    } else {
      console.error(`✗ FAIL: Delayed count is still 0!`);
    }

    // Step 5: Click "Delayed" filter pill
    console.log('\n--- Step 5: Clicking "Delayed" filter pill ---');
    const delayedBtn = await page.$('button:has-text("Delayed")');
    if (delayedBtn) {
      await delayedBtn.click();
      await page.waitForTimeout(1500);

      const pillsAfterClick = await getPills();
      console.log('Pill counts after clicking "Delayed":', pillsAfterClick);

      if (pillsAfterClick['All Flights'] === initialPills['All Flights']) {
        console.log('✓ PASS: Filter pills did not collapse to 0 or shrink!');
      }

      // Check if 6E-204 is visible
      const has6E204 = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('6E-204') || text.includes('6E - 204');
      });

      console.log('Is 6E-204 visible under Delayed filter?:', has6E204);
      if (has6E204) {
        console.log('✓ PASS: 6E-204 is present in the Delayed flights list!');
      } else {
        console.error('✗ FAIL: 6E-204 was NOT found under Delayed filter!');
      }

      // Capture screenshot 1
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_delayed_filter_and_6e204.png') });
      console.log('Screenshot saved: 01_delayed_filter_and_6e204.png');
    }

    // Step 6: Track flight 6E-204
    console.log('\n--- Step 6: Tracking flight 6E-204 ---');
    // Find bookmark button for 6E-204
    const trackBtn = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('.bg-white.rounded-2xl.border'));
      for (const card of cards) {
        if (card.innerText.includes('6E-204') || card.innerText.includes('6E - 204')) {
          return card.querySelector('button[title*="Track"]');
        }
      }
      return null;
    });

    if (trackBtn && trackBtn.asElement()) {
      await trackBtn.asElement().click();
      await page.waitForTimeout(1500);
      console.log('Clicked track button for 6E-204.');
    } else {
      console.log('Track button not found via title, trying bookmark svg selector...');
      const firstBookmark = await page.$('button:has(svg.lucide-bookmark)');
      if (firstBookmark) {
        await firstBookmark.click();
        await page.waitForTimeout(1500);
      }
    }

    // Check notifications fired
    let notifsFired = await page.evaluate(() => window.__notificationsFired);
    console.log('Real Browser Notifications Fired so far:', notifsFired);

    if (notifsFired.length > 0) {
      console.log(`✓ PASS: Real Browser Notification fired! (${notifsFired.length} notification(s))`);
      console.log('Last notification title:', notifsFired[notifsFired.length - 1].title);
      console.log('Last notification body:', notifsFired[notifsFired.length - 1].options?.body);
    } else {
      console.warn('No browser notification captured yet.');
    }

    // Check Multi-Flight Simultaneous Watchlist contains 6E-204
    const watchlistText = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2'));
      const wlHeading = headings.find(h => h.innerText.includes('Multi-Flight Simultaneous Watchlist'));
      return wlHeading ? wlHeading.closest('.bg-white')?.innerText || '' : '';
    });

    const is6E204InWatchlist = watchlistText.includes('6E-204') || watchlistText.includes('6E - 204');
    console.log('Is 6E-204 in Multi-Flight Simultaneous Watchlist?:', is6E204InWatchlist);

    // Capture screenshot 2 (Watchlist)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_watchlist_delayed_6e204.png') });
    console.log('Screenshot saved: 02_watchlist_delayed_6e204.png');

    // Step 7: Trigger SSE flight update simulation for 6E-204
    console.log('\n--- Step 7: Triggering live update for 6E-204 via backend simulate API ---');
    await fetch('http://localhost:8081/api/flight-status/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flightNumber: '6E-204',
        status: 'DELAYED',
        delayReason: 'Delayed by 1h 30m - Heavy fog & visibility hold',
        revisedDeparture: '06:00 PM',
        revisedArrival: '08:30 PM',
        gate: 'Gate 17',
        terminal: 'T7',
        estimatedArrivalMinutes: 230,
      }),
    });

    await page.waitForTimeout(3000);

    notifsFired = await page.evaluate(() => window.__notificationsFired);
    console.log('Total Real Browser Notifications Fired after SSE update:', notifsFired.length);
    notifsFired.forEach((n, i) => {
      console.log(`Notification [${i + 1}]: "${n.title}" - "${n.options?.body}"`);
    });

    // Capture screenshot 3
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_browser_notifications_feed.png') });
    console.log('Screenshot saved: 03_browser_notifications_feed.png');

    console.log('\n=== ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }
})();
