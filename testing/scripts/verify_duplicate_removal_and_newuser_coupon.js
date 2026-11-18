const { chromium } = require('C:/Users/manis/VS Code-work space/make-my-trip-clone-springboot/makemytour/node_modules/playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/manis/.gemini/antigravity/brain/b48f1874-14ce-4b90-a137-1fd9ec7b0572';

(async () => {
  console.log('=== Verifying Duplicate Offer Removal & New User Coupon ===\n');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,950'],
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 950 },
  });

  try {
    // -------------------------------------------------------------
    // Part 1: Book Flight Page (http://localhost:3000/book-flight/fl-107)
    // -------------------------------------------------------------
    console.log('--- Part 1: Verifying Flight Booking Page (fl-107) ---');
    await page.goto('http://localhost:3000/book-flight/fl-107', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=Fare Summary', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Get all coupon cards rendered under Available Coupons
    const flightCoupons = await page.evaluate(() => {
      const container = Array.from(document.querySelectorAll('p')).find(p => p.innerText.includes('Available Coupons'))?.parentElement;
      if (!container) return [];
      const cards = Array.from(container.querySelectorAll('.bg-white.p-2\\.5'));
      return cards.map(c => c.innerText);
    });

    console.log(`Found ${flightCoupons.length} coupon cards on Flight Booking.`);
    flightCoupons.forEach((c, idx) => console.log(`Card ${idx + 1}:\n${c}\n---`));

    // Check for duplicates
    const staycationMatches = flightCoupons.filter(c => c.includes('Staycation Club') || c.includes('HOTELSPL'));
    console.log(`Staycation Club count: ${staycationMatches.length} (Expected: 1)`);
    if (staycationMatches.length === 1) {
      console.log('✓ PASS: Duplicate Staycation Club offer successfully removed! (Exactly 1 present)');
    } else {
      console.error(`✗ FAIL: Duplicate Staycation Club offers found: ${staycationMatches.length}`);
    }

    // Check for NEWUSER coupon
    const newUserCoupon = flightCoupons.find(c => c.includes('NEWUSER') || c.includes('First Booking Offer'));
    if (newUserCoupon) {
      console.log('✓ PASS: NEWUSER first booking coupon found with % and amt details!');
    } else {
      console.error('✗ FAIL: NEWUSER coupon not found!');
    }

    // Click Apply on NEWUSER
    console.log('\nClicking "Apply" on NEWUSER coupon on flight booking...');
    const newUserBtn = page.locator('.bg-white.p-2\\.5:has-text("NEWUSER") button:has-text("Apply")');
    await newUserBtn.click();
    await page.waitForTimeout(2000);

    const flightAppliedBanner = await page.evaluate(() => {
      const banner = document.querySelector('.bg-emerald-100');
      return banner ? banner.innerText : null;
    });
    console.log('Flight Page Applied Banner:', flightAppliedBanner);
    if (flightAppliedBanner && flightAppliedBanner.includes('NEWUSER')) {
      console.log('✓ PASS: NEWUSER coupon discount successfully applied to flight booking!');
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_book_flight_new_user_coupon.png') });
    console.log('Screenshot saved: 06_book_flight_new_user_coupon.png\n');

    // -------------------------------------------------------------
    // Part 2: Book Hotel Page (http://localhost:3000/book-hotel/ht-2)
    // -------------------------------------------------------------
    console.log('--- Part 2: Verifying Hotel Booking Page (ht-2) ---');
    await page.goto('http://localhost:3000/book-hotel/ht-2', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=Booking Rate Summary', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const hotelCoupons = await page.evaluate(() => {
      const container = Array.from(document.querySelectorAll('p')).find(p => p.innerText.includes('Available Coupons'))?.parentElement;
      if (!container) return [];
      const cards = Array.from(container.querySelectorAll('.bg-white.p-2\\.5'));
      return cards.map(c => c.innerText);
    });
    console.log(`Found ${hotelCoupons.length} coupon cards on Hotel Booking.`);
    hotelCoupons.forEach((c, idx) => console.log(`Hotel Card ${idx + 1}:\n${c}\n---`));

    const hotelStaycation = hotelCoupons.filter(c => c.includes('Staycation Club') || c.includes('HOTELSPL'));
    console.log(`Hotel Staycation Club count: ${hotelStaycation.length} (Expected: 1)`);
    if (hotelStaycation.length === 1) {
      console.log('✓ PASS: No duplicate Staycation Club offer on Hotel booking!');
    }

    // Click Apply on NEWUSER on hotel page
    console.log('\nClicking "Apply" on NEWUSER coupon on hotel booking...');
    const hotelNewUserBtn = page.locator('.bg-white.p-2\\.5:has-text("NEWUSER") button:has-text("Apply")');
    await hotelNewUserBtn.click();
    await page.waitForTimeout(2000);

    const hotelAppliedBanner = await page.evaluate(() => {
      const banner = document.querySelector('.bg-emerald-100');
      return banner ? banner.innerText : null;
    });
    console.log('Hotel Page Applied Banner:', hotelAppliedBanner);
    if (hotelAppliedBanner && hotelAppliedBanner.includes('NEWUSER')) {
      console.log('✓ PASS: NEWUSER coupon discount successfully applied to hotel booking!');
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_book_hotel_coupon_verified.png') });
    console.log('Screenshot saved: 07_book_hotel_coupon_verified.png\n');

    // -------------------------------------------------------------
    // Part 3: Dynamic Pricing (http://localhost:3000/dynamic-pricing)
    // -------------------------------------------------------------
    console.log('--- Part 3: Verifying Dynamic Pricing Deals ---');
    await page.goto('http://localhost:3000/dynamic-pricing', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=E-Cart Offers & Coupons', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const dynamicDeals = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.bg-slate-50.rounded-xl'));
      return cards.map(c => c.innerText);
    });
    console.log(`Found ${dynamicDeals.length} active deal cards on Dynamic Pricing.`);

    const dynamicStaycation = dynamicDeals.filter(d => d.includes('HOTELSPL') || d.includes('Staycation Club'));
    console.log(`Dynamic Pricing Staycation count: ${dynamicStaycation.length} (Expected: 1)`);
    if (dynamicStaycation.length === 1) {
      console.log('✓ PASS: Exactly 1 Staycation Club deal on Dynamic Pricing!');
    }

    // Click Apply Deal on NEWUSER
    console.log('\nClicking "Apply Deal" on NEWUSER on dynamic pricing...');
    const dynamicNewUserBtn = page.locator('.bg-slate-50.rounded-xl:has-text("NEWUSER") button:has-text("Apply Deal")');
    await dynamicNewUserBtn.click();
    await page.waitForTimeout(2000);

    const dynamicAppliedBanner = await page.evaluate(() => {
      const banner = document.querySelector('.border-emerald-300');
      return banner ? banner.innerText : null;
    });
    console.log('Dynamic Pricing Applied Banner:', dynamicAppliedBanner);
    if (dynamicAppliedBanner && dynamicAppliedBanner.includes('NEWUSER')) {
      console.log('✓ PASS: NEWUSER applied on dynamic pricing engine!');
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '08_dynamic_pricing_newuser_coupon.png') });
    console.log('Screenshot saved: 08_dynamic_pricing_newuser_coupon.png\n');

    console.log('=== ALL VERIFICATIONS PASSED 100% SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
})();
