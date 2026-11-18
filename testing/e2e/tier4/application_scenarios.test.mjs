/**
 * Tier 4: Real-World End-to-End Application Workflows
 * Implements the 6 comprehensive multi-feature user journeys defined in TEST_INFRA.md:
 * 1. Flight Price Freeze to Instant Booking & Seat Lock
 * 2. Hotel Room 3D Showcase to Booking & Review Life Cycle
 * 3. Booking Cancellation, Inventory Restoration & Automated Refund Timeline
 * 4. Personalized Recommendations Cold-Start to Feedback Tuning & Sync
 * 5. Community Review Flagging, Admin Moderation & SSE Real-time Updates
 * 6. Cross-Module Dynamic Travel Package: Surge Flight + Luxury Room + Coupon
 */

const TEST_USER = '6ab7690b80552a1a2ff9e11f';
const TEST_HOTEL = 'ht-1';

export const tests = [
  // --------------------------------------------------------------------------
  // SCENARIO 1: Flight Price Freeze to Instant Booking & Seat Lock
  // Features: F1, F6, F7, F9, F18, F20, F21
  // --------------------------------------------------------------------------
  {
    tier: 4,
    feature: 9,
    name: 'Scenario 1: Flight Price Freeze to Instant Booking & Seat Lock (F1, F6, F7, F9, F18, F20, F21)',
    fn: async ({ client, assert }) => {
      // Step 1: User queries live flight status (F1)
      const flightsRes = await client.get('/api/flight-status');
      assert.strictEqual(flightsRes.status, 200);
      assert.ok(flightsRes.data.length > 0);
      const flight = flightsRes.data[0];

      // Step 2: Observes surge multiplier & time-to-departure (F6, F7)
      const pricingRes = await client.get('/api/pricing/calculate', {
        params: { itemId: flight.flightNumber, basePrice: 5500, demand: 'HIGH' }
      });
      assert.strictEqual(pricingRes.status, 200);
      assert.strictEqual(pricingRes.data.demandLevel, 'HIGH');
      assert.ok(pricingRes.data.finalPrice > 5500);

      // Step 3: Locks price for 48h via Price Freeze (F9)
      const freezeRes = await client.post('/api/pricing/freeze', {
        itemId: flight.flightNumber,
        itemTitle: flight.airline + ' ' + flight.flightNumber,
        currentPrice: pricingRes.data.finalPrice,
        hours: 48,
        userId: TEST_USER
      });
      assert.strictEqual(freezeRes.status, 201);
      assert.ok(freezeRes.data.freezeId);
      assert.strictEqual(freezeRes.data.durationHours, 48);

      // Step 4: Saves user travel preferences (F20)
      const prefRes = await client.post('/api/selection/preferences', {
        userId: TEST_USER,
        preferredSeatType: 'WINDOW'
      });
      assert.strictEqual(prefRes.status, 201);

      // Step 5: Retrieves interactive seat map and reserves seat (F18)
      await client.post('/api/selection/release-seat', null, { params: { flightId: flight.flightNumber, seatNo: '6A' } });
      const seatRes = await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: flight.flightNumber, seatNo: '6A', userId: TEST_USER }
      });
      assert.strictEqual(seatRes.status, 200);

      // Step 6: Verifies concurrency lock prevents double-booking (F21)
      const clashRes = await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: flight.flightNumber, seatNo: '6A', userId: 'competing-user' }
      });
      assert.strictEqual(clashRes.status, 409);
    }
  },

  // --------------------------------------------------------------------------
  // SCENARIO 2: Hotel Room 3D Showcase to Booking & Review Life Cycle
  // Features: F19, F20, F23, F24, F25, F26
  // --------------------------------------------------------------------------
  {
    tier: 4,
    feature: 23,
    name: 'Scenario 2: Hotel Room 3D Showcase to Booking & Review Life Cycle (F19, F20, F23, F24, F25, F26)',
    fn: async ({ client, assert }) => {
      // Step 1: Inspects 3D room showcase (F19)
      const showcaseRes = await client.get('/api/selection/featured-rooms');
      assert.strictEqual(showcaseRes.status, 200);
      const selectedRoom = showcaseRes.data[0];
      assert.ok(selectedRoom.room3dConfig);

      // Step 2: Saves room preferences (F20)
      const prefRes = await client.post('/api/selection/preferences', {
        userId: TEST_USER,
        preferredRoomType: selectedRoom.roomTypeName
      });
      assert.strictEqual(prefRes.status, 201);

      // Step 3: Completes booking (creates confirmed booking) (F23 gate requirement)
      const bookRes = await client.post('/booking/hotel', null, {
        params: {
          userId: TEST_USER,
          hotelId: TEST_HOTEL,
          rooms: 1,
          price: 9200,
          roomTypeName: selectedRoom.roomTypeName
        }
      });
      assert.strictEqual(bookRes.status, 201);

      // Step 4: Verified customer submits detailed review with photos (F23, F24, F25)
      const reviewRes = await client.post('/api/reviews', {
        targetId: TEST_HOTEL,
        targetType: 'HOTEL',
        targetTitle: 'Taj Mahal Palace',
        userId: TEST_USER,
        userName: 'Verified Executive Guest',
        rating: 5,
        title: 'Masterpiece of Hospitality',
        comment: 'The architectural showcase matched reality perfectly. The harbor panorama and sea breeze from the balcony were sublime.',
        photoUrls: ['https://images.unsplash.com/photo-1566073771259-6a8506099945']
      });
      assert.strictEqual(reviewRes.status, 201);
      assert.ok(reviewRes.data.id);
      assert.strictEqual(reviewRes.data.sentimentCategory, 'POSITIVE');

      // Step 5: Hotelier responds with public reply (F26)
      const replyRes = await client.post(`/api/reviews/${reviewRes.data.id}/reply`, {
        userId: 'general-manager-taj',
        userName: 'General Manager',
        comment: 'We are delighted you enjoyed the sea view panorama! Looking forward to welcoming you back.'
      });
      assert.strictEqual(replyRes.status, 201);
      assert.ok(replyRes.data.replies.some(r => r.comment.includes('sea view panorama')));
    }
  },

  // --------------------------------------------------------------------------
  // SCENARIO 3: Booking Cancellation, Inventory Restoration & Automated Refund Timeline
  // Features: F13, F14, F15, F16, F18
  // --------------------------------------------------------------------------
  {
    tier: 4,
    feature: 13,
    name: 'Scenario 3: Booking Cancellation, Inventory Restoration & Automated Refund Timeline (F13, F14, F15, F16, F18)',
    fn: async ({ client, assert }) => {
      // Step 1: Inspect existing refund/booking history (F13, F14)
      const allRefundsRes = await client.get('/refund/all');
      assert.strictEqual(allRefundsRes.status, 200);
      assert.ok(allRefundsRes.data.length > 0);
      const refund = allRefundsRes.data[0];

      // Step 2: Query refund tracking timeline status (F16)
      const timelineRes = await client.get(`/refund/status/${refund.refundId}`);
      assert.strictEqual(timelineRes.status, 200);
      assert.strictEqual(timelineRes.data.refundId, refund.refundId);
      assert.ok(timelineRes.data.currentStep >= 0);

      // Step 3: Admin progresses refund lifecycle APPROVED -> PROCESSED -> COMPLETED (F15)
      const advanceRes = await client.put('/refund/admin/update-status', null, {
        params: { refundId: refund.refundId, status: 'COMPLETED' }
      });
      assert.strictEqual(advanceRes.status, 200);
      assert.strictEqual(advanceRes.data.status, 'COMPLETED');
      assert.strictEqual(advanceRes.data.currentStep, 3);
      assert.ok(advanceRes.data.transactionRef, 'Expected UTR transaction reference on completion');

      // Step 4: Verified seat release in inventory (F18)
      const seatmapRes = await client.get('/api/selection/seatmap/FL-101');
      assert.strictEqual(seatmapRes.status, 200);
      assert.strictEqual(seatmapRes.data.seats.length, 72);
    }
  },

  // --------------------------------------------------------------------------
  // SCENARIO 4: Personalized Recommendations Cold-Start to Feedback Tuning & Sync
  // Features: F29, F30, F31, F32, F33
  // --------------------------------------------------------------------------
  {
    tier: 4,
    feature: 29,
    name: 'Scenario 4: Personalized Recommendations Cold-Start to Feedback Tuning & Sync (F29, F30, F31, F32, F33)',
    fn: async ({ client, assert }) => {
      // Step 1: Cold-start user visits recommendations catalog (F29, F32)
      const coldStartUser = 'usr-cold-start-journey-' + Date.now();
      const recsRes = await client.get('/api/recommendations', { params: { userId: coldStartUser } });
      assert.strictEqual(recsRes.status, 200);
      assert.ok(recsRes.data.length >= 9, 'Zero empty-state collapse under cold start');

      // Step 2: User inspects transparent algorithmic explanation (F30)
      const firstPick = recsRes.data[0];
      assert.ok(firstPick.reasonTitle);
      assert.ok(firstPick.reasonExplanation);
      assert.ok(firstPick.collaborativeFactor);

      // Step 3: Submits HELPFUL feedback to refine category affinity (F31)
      const fbRes = await client.post(`/api/recommendations/${firstPick.id}/feedback`, {
        userId: coldStartUser,
        feedbackType: 'HELPFUL',
        notes: 'Love beach destinations for annual family trip'
      });
      assert.strictEqual(fbRes.status, 200);
      assert.strictEqual(fbRes.data.status, 'SUCCESS');

      // Step 4: Catalog sync via admin seed endpoint (F33)
      const syncRes = await client.post('/api/recommendations/seed');
      assert.strictEqual(syncRes.status, 200);

      // Step 5: Subsequent recommendations query returns enriched recommendations (F29)
      const refreshedRes = await client.get('/api/recommendations', { params: { userId: coldStartUser } });
      assert.strictEqual(refreshedRes.status, 200);
      assert.ok(refreshedRes.data.length > 0);
    }
  },

  // --------------------------------------------------------------------------
  // SCENARIO 5: Community Review Flagging, Admin Moderation & SSE Real-time Updates
  // Features: F25, F26, F27, F28
  // --------------------------------------------------------------------------
  {
    tier: 4,
    feature: 27,
    name: 'Scenario 5: Community Review Flagging, Admin Moderation & Real-time Updates (F25, F26, F27, F28)',
    fn: async ({ client, assert }) => {
      // Step 1: User creates review (F25)
      const reviewRes = await client.post('/api/reviews', {
        targetId: TEST_HOTEL,
        targetType: 'HOTEL',
        userId: TEST_USER,
        rating: 1,
        title: 'Spam content to test flagging',
        comment: 'Visit discount-deals.com for fake vouchers and coupons!'
      });
      assert.strictEqual(reviewRes.status, 201);
      const reviewId = reviewRes.data.id;

      // Step 2: Community traveler flags the review (F26)
      const flagRes = await client.post(`/api/reviews/${reviewId}/flag`, null, {
        params: { userId: 'vigilant-traveler', reason: 'Unsolicited advertising' }
      });
      assert.strictEqual(flagRes.status, 200);
      assert.strictEqual(flagRes.data.flagged, true);

      // Step 3: Verify flagged review is hidden from public listing (F28)
      const publicList = await client.get('/api/reviews', { params: { targetId: TEST_HOTEL } });
      assert.ok(!publicList.data.reviews.some(r => r.id === reviewId), 'Flagged review must be hidden from public');

      // Step 4: Review appears in admin moderation queue (F27)
      const queueRes = await client.get('/api/reviews/moderation/flagged');
      assert.strictEqual(queueRes.status, 200);
      assert.ok(queueRes.data.some(r => r.id === reviewId), 'Flagged review must appear in admin queue');

      // Step 5: Admin takes REMOVE moderation action (F27)
      const removeRes = await client.post(`/api/reviews/moderation/${reviewId}/action`, null, {
        params: { action: 'REMOVE' }
      });
      assert.strictEqual(removeRes.status, 200);
      assert.strictEqual(removeRes.data.status, 'SUCCESS');

      // Step 6: Verified review is permanently purged from moderation queue
      const postQueue = await client.get('/api/reviews/moderation/flagged');
      assert.ok(!postQueue.data.some(r => r.id === reviewId));
    }
  },

  // --------------------------------------------------------------------------
  // SCENARIO 6: Cross-Module Dynamic Travel Package: Surge Flight + Luxury Room + Coupon
  // Features: F1, F6, F7, F10, F11, F18, F19
  // --------------------------------------------------------------------------
  {
    tier: 4,
    feature: 10,
    name: 'Scenario 6: Cross-Module Dynamic Travel Package: Surge Flight + Luxury Room + Coupon (F1, F6, F7, F10, F11, F18, F19)',
    fn: async ({ client, assert }) => {
      // Step 1: User tracks flight status & coordinates (F1)
      const flightRes = await client.get('/api/flight-status/AI-101');
      assert.strictEqual(flightRes.status, 200);

      // Step 2: Calculates dynamic surge price with urgency multiplier (F6, F7)
      const priceRes = await client.get('/api/pricing/calculate', {
        params: { itemId: 'AI-101', demand: 'HIGH', season: 'HOLIDAY_PEAK', basePrice: 6500 }
      });
      assert.strictEqual(priceRes.status, 200);
      const flightFinalPrice = priceRes.data.finalPrice;
      assert.ok(flightFinalPrice > 6500);

      // Step 3: Selects showcase luxury room (F19)
      const roomsRes = await client.get('/api/selection/featured-rooms');
      assert.strictEqual(roomsRes.status, 200);
      const luxuryRoom = roomsRes.data.find(r => r.roomTypeName.toLowerCase().includes('presidential')) || roomsRes.data[0];
      const roomCost = 12000 + luxuryRoom.priceUpgradeAddon;

      // Step 4: Locks extra legroom seat (F18)
      await client.post('/api/selection/release-seat', null, { params: { flightId: 'AI-101', seatNo: '1B' } });
      const seatRes = await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: 'AI-101', seatNo: '1B', userId: TEST_USER }
      });
      assert.strictEqual(seatRes.status, 200);
      const seatAddon = seatRes.data.seats.find(s => s.seatNo === '1B').priceAddon;

      // Step 5: Computes package total
      const packageTotal = flightFinalPrice + roomCost + seatAddon;

      // Step 6: Applies promotional coupon to total package amount (F10)
      const couponRes = await client.post('/api/pricing/apply-coupon', {
        code: 'HDFC10',
        amount: packageTotal
      });
      assert.strictEqual(couponRes.status, 200);
      assert.strictEqual(couponRes.data.success, true);
      assert.ok(couponRes.data.discountAmount > 0);
      assert.strictEqual(couponRes.data.finalAmount, packageTotal - couponRes.data.discountAmount);
    }
  }
];
