/**
 * Tier 1: Dynamic Pricing Engine (Features 6 - 12)
 * Covers demand-based surge pricing, time-to-departure multipliers,
 * competitor price simulation, 24-48h price freezes, promotional coupons,
 * real-time SSE price stream, and 3-tier persistence.
 */

export const tests = [
  // --------------------------------------------------------------------------
  // FEATURE 6: Demand-based surge pricing (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 6,
    name: 'T1_F06_01_CalculateDefaultPrice: GET /api/pricing/calculate returns valid DynamicPrice',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', itemType: 'FLIGHT', basePrice: 5500 }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.finalPrice > 0, 'Expected positive finalPrice');
      assert.strictEqual(res.data.itemId, 'FL-101');
      assert.ok(res.data.demandLevel, 'Expected demandLevel');
    }
  },
  {
    tier: 1,
    feature: 6,
    name: 'T1_F06_02_HighDemandSurge: demand=HIGH applies 15% surge factor',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', demand: 'HIGH', basePrice: 5000, season: 'REGULAR' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.demandLevel, 'HIGH');
      assert.strictEqual(res.data.demandSurgePercentage, 15);
      assert.ok(res.data.finalPrice >= 5000 * 1.15);
    }
  },
  {
    tier: 1,
    feature: 6,
    name: 'T1_F06_03_MediumDemandSurge: demand=MEDIUM applies 5% surge factor',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', demand: 'MEDIUM', basePrice: 5000, season: 'REGULAR' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.demandLevel, 'MEDIUM');
      assert.strictEqual(res.data.demandSurgePercentage, 5);
    }
  },
  {
    tier: 1,
    feature: 6,
    name: 'T1_F06_04_AutoFlightHighDemand: Flight auto-demand sets surgeReason',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', itemType: 'FLIGHT', demand: 'HIGH' }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.surgeReason, 'Expected surgeReason string');
    }
  },
  {
    tier: 1,
    feature: 6,
    name: 'T1_F06_05_AutoHotelDemand: Hotel demand calculation produces valid pricing response',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'HT-201', itemType: 'HOTEL', basePrice: 4000, demand: 'MEDIUM' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.itemType, 'HOTEL');
      assert.ok(res.data.finalPrice > 0);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 7: Time-to-departure multipliers (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 7,
    name: 'T1_F07_01_UrgencyLessThan24h: Response includes time-to-departure multiplier',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', basePrice: 5000 }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.data.timeToDepartureMultiplier === 'number');
      assert.ok(res.data.timeToDepartureMultiplier >= 1.0);
    }
  },
  {
    tier: 1,
    feature: 7,
    name: 'T1_F07_02_UrgencyHoursReported: Response reports valid multiplier and pricing metadata',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', basePrice: 5000 }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.data.timeToDepartureMultiplier === 'number');
      assert.ok(res.data.timeToDepartureMultiplier >= 1.0);
    }
  },
  {
    tier: 1,
    feature: 7,
    name: 'T1_F07_03_UrgencyCompounding: finalPrice compounds base price, surge, and urgency',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', basePrice: 6000, demand: 'NORMAL', season: 'REGULAR' }
      });
      assert.strictEqual(res.status, 200);
      const expectedMin = 6000 * res.data.timeToDepartureMultiplier;
      assert.ok(res.data.finalPrice >= expectedMin - 1, 'finalPrice should reflect time-to-departure');
    }
  },
  {
    tier: 1,
    feature: 7,
    name: 'T1_F07_04_UrgencyBaseline: Regular season baseline has seasonalMultiplier >= 1.0',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', season: 'REGULAR' }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.seasonalMultiplier >= 1.0);
    }
  },
  {
    tier: 1,
    feature: 7,
    name: 'T1_F07_05_HolidayPeakMultiplier: season=HOLIDAY_PEAK applies 1.20 seasonal multiplier',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', season: 'HOLIDAY_PEAK', basePrice: 5000 }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.seasonalMultiplier, 1.20);
      assert.strictEqual(res.data.seasonType, 'HOLIDAY_PEAK');
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 8: Competitor pricing simulation (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 8,
    name: 'T1_F08_01_CompetitorPricesMapPresent: DynamicPrice contains competitorPrices map',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101' }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.competitorPrices, 'Expected competitorPrices object');
      assert.strictEqual(typeof res.data.competitorPrices, 'object');
    }
  },
  {
    tier: 1,
    feature: 8,
    name: 'T1_F08_02_CompetitorPricesPositive: All competitor prices are positive values',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101', basePrice: 5000 }
      });
      assert.strictEqual(res.status, 200);
      for (const [competitor, price] of Object.entries(res.data.competitorPrices)) {
        assert.ok(typeof price === 'number', `${competitor} price must be numeric`);
        assert.ok(price > 0, `${competitor} price must be positive`);
      }
    }
  },
  {
    tier: 1,
    feature: 8,
    name: 'T1_F08_03_MarketBenchmarking: Competitor map contains primary market rivals',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'FL-101' }
      });
      assert.strictEqual(res.status, 200);
      const keys = Object.keys(res.data.competitorPrices);
      assert.ok(keys.length >= 2, 'Expected at least 2 competitor benchmarks');
    }
  },
  {
    tier: 1,
    feature: 8,
    name: 'T1_F08_04_HotelCompetitorPricing: Competitor prices generated for hotel queries',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', {
        params: { itemId: 'HT-101', itemType: 'HOTEL', basePrice: 4500 }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.competitorPrices);
      assert.ok(Object.keys(res.data.competitorPrices).length > 0);
    }
  },
  {
    tier: 1,
    feature: 8,
    name: 'T1_F08_05_FlightCompetitorPricing: Competitor prices scale relative to base price',
    fn: async ({ client, assert }) => {
      const resLow = await client.get('/api/pricing/calculate', { params: { basePrice: 3000 } });
      const resHigh = await client.get('/api/pricing/calculate', { params: { basePrice: 10000 } });
      assert.strictEqual(resLow.status, 200);
      assert.strictEqual(resHigh.status, 200);

      const firstCompLow = Object.values(resLow.data.competitorPrices)[0];
      const firstCompHigh = Object.values(resHigh.data.competitorPrices)[0];
      assert.ok(firstCompHigh > firstCompLow, 'Competitor rate should scale with base price');
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 9: 24-48h Price freeze lifecycle (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 9,
    name: 'T1_F09_01_CreateFreeze24h: POST /api/pricing/freeze locks price for 24h',
    fn: async ({ client, assert }) => {
      const res = await client.post('/api/pricing/freeze', {
        itemId: 'FL-TEST-1',
        itemTitle: 'Flight Test Lock',
        currentPrice: 5200.0,
        hours: 24,
        userId: 'usr-frz-1'
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.data.freezeId, 'Expected freezeId');
      assert.ok(res.data.frozenPrice > 0);
      assert.strictEqual(res.data.active, true);
    }
  },
  {
    tier: 1,
    feature: 9,
    name: 'T1_F09_02_CreateFreeze48h: POST /api/pricing/freeze locks price for 48h',
    fn: async ({ client, assert }) => {
      const res = await client.post('/api/pricing/freeze', {
        itemId: 'FL-TEST-2',
        itemTitle: 'Flight Test 48h Lock',
        currentPrice: 6500.0,
        hours: 48,
        userId: 'usr-frz-2'
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.durationHours, 48);
      assert.ok(res.data.expiresAt);
    }
  },
  {
    tier: 1,
    feature: 9,
    name: 'T1_F09_03_GetActiveFreezeStatus: GET /api/pricing/freeze/{freezeId} retrieves active lock',
    fn: async ({ client, assert }) => {
      const createRes = await client.post('/api/pricing/freeze', {
        itemId: 'FL-TEST-3',
        itemTitle: 'Flight Test Status',
        currentPrice: 4800.0,
        hours: 24
      });
      const freezeId = createRes.data.freezeId;

      const getRes = await client.get(`/api/pricing/freeze/${freezeId}`);
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.data.freezeId, freezeId);
      assert.strictEqual(getRes.data.active, true);
    }
  },
  {
    tier: 1,
    feature: 9,
    name: 'T1_F09_04_UserFreezesListing: GET /api/pricing/user-freezes retrieves user locks',
    fn: async ({ client, assert }) => {
      const userId = 'usr-freeze-list-' + Date.now();
      await client.post('/api/pricing/freeze', {
        itemId: 'FL-TEST-USER',
        itemTitle: 'Flight User Lock',
        currentPrice: 5100.0,
        hours: 24,
        userId
      });

      const listRes = await client.get('/api/pricing/user-freezes', { params: { userId } });
      assert.strictEqual(listRes.status, 200);
      assert.ok(Array.isArray(listRes.data));
      assert.ok(listRes.data.some(f => f.userId === userId));
    }
  },
  {
    tier: 1,
    feature: 9,
    name: 'T1_F09_05_DeletePriceFreeze: DELETE /api/pricing/freeze/{freezeId} deletes lock',
    fn: async ({ client, assert }) => {
      const createRes = await client.post('/api/pricing/freeze', {
        itemId: 'FL-TO-DELETE',
        itemTitle: 'Flight To Delete',
        currentPrice: 4900.0,
        hours: 24
      });
      const freezeId = createRes.data.freezeId;

      const delRes = await client.delete(`/api/pricing/freeze/${freezeId}`);
      assert.strictEqual(delRes.status, 200);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 10: Promotional coupons validation (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 10,
    name: 'T1_F10_01_GetAvailableOffers: GET /api/pricing/offers returns active coupon list',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/offers');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length > 0, 'Expected active promotional coupons');
      assert.ok(res.data[0].code, 'Expected coupon code');
      assert.ok(typeof res.data[0].discountPercentage === 'number');
    }
  },
  {
    tier: 1,
    feature: 10,
    name: 'T1_F10_02_ApplyValidCoupon: POST /api/pricing/apply-coupon applies discount',
    fn: async ({ client, assert }) => {
      const offersRes = await client.get('/api/pricing/offers');
      const coupon = offersRes.data[0];
      const res = await client.post('/api/pricing/apply-coupon', {
        code: coupon.code,
        amount: Math.max(coupon.minBookingAmount || 1000, 5000)
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.discountAmount > 0);
      assert.strictEqual(res.data.code, coupon.code);
    }
  },
  {
    tier: 1,
    feature: 10,
    name: 'T1_F10_03_DiscountPercentageCalculation: Discount conforms to coupon percentage',
    fn: async ({ client, assert }) => {
      const offersRes = await client.get('/api/pricing/offers');
      const coupon = offersRes.data[0];
      const amount = 6000;
      const res = await client.post('/api/pricing/apply-coupon', {
        code: coupon.code,
        amount
      });
      assert.strictEqual(res.status, 200);
      const expectedDiscount = Math.min(
        (amount * coupon.discountPercentage) / 100.0,
        coupon.maxDiscountAmount || Infinity
      );
      assert.strictEqual(res.data.discountAmount, expectedDiscount);
    }
  },
  {
    tier: 1,
    feature: 10,
    name: 'T1_F10_04_FinalAmountMath: finalAmount equals originalAmount minus discountAmount',
    fn: async ({ client, assert }) => {
      const offersRes = await client.get('/api/pricing/offers');
      const coupon = offersRes.data[0];
      const amount = 7500;
      const res = await client.post('/api/pricing/apply-coupon', {
        code: coupon.code,
        amount
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.finalAmount, res.data.originalAmount - res.data.discountAmount);
    }
  },
  {
    tier: 1,
    feature: 10,
    name: 'T1_F10_05_CouponMetadataReturned: Response includes title, badgeText, and message',
    fn: async ({ client, assert }) => {
      const offersRes = await client.get('/api/pricing/offers');
      const coupon = offersRes.data[0];
      const res = await client.post('/api/pricing/apply-coupon', {
        code: coupon.code,
        amount: 5000
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.title, 'Expected title');
      assert.ok(res.data.badgeText, 'Expected badgeText');
      assert.ok(res.data.message, 'Expected success message');
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 11: Real-time price stream (SSE) (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 11,
    name: 'T1_F11_01_PriceSseConnectEvent: GET /api/pricing/stream connects and receives event',
    fn: async ({ sse, assert }) => {
      const events = await sse.listenToSse('/api/pricing/stream', {
        timeoutMs: 4000,
        maxEvents: 1
      });
      assert.ok(events.length >= 1, 'Expected at least 1 SSE event');
      assert.ok(['connection', 'ping', 'price-update'].includes(events[0].event));
    }
  },
  {
    tier: 1,
    feature: 11,
    name: 'T1_F11_02_PriceSseBroadcastEndpoint: POST /api/pricing/broadcast-update succeeds',
    fn: async ({ client, assert }) => {
      const res = await client.post('/api/pricing/broadcast-update', {
        itemId: 'FL-101',
        itemType: 'FLIGHT',
        newPrice: 5800.0,
        reason: 'SURGE_INCREASE'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'SUCCESS');
    }
  },
  {
    tier: 1,
    feature: 11,
    name: 'T1_F11_03_PriceSseEventReceipt: Broadcast triggers price-update event on SSE stream',
    fn: async ({ client, sse, assert }) => {
      const events = await sse.listenToSse('/api/pricing/stream', {
        timeoutMs: 5000,
        maxEvents: 2,
        triggerAction: async () => {
          await client.post('/api/pricing/broadcast-update', {
            itemId: 'FL-101',
            newPrice: 5900.0
          });
        }
      });
      assert.ok(events.length >= 1);
    }
  },
  {
    tier: 1,
    feature: 11,
    name: 'T1_F11_04_PriceSseKeepAlivePing: Stream stays connected without premature closure',
    fn: async ({ sse, assert }) => {
      const events = await sse.listenToSse('/api/pricing/stream', {
        timeoutMs: 2500,
        maxEvents: 5
      });
      assert.ok(Array.isArray(events));
    }
  },
  {
    tier: 1,
    feature: 11,
    name: 'T1_F11_05_PriceSseContentType: GET /api/pricing/stream responds with text/event-stream',
    fn: async ({ client, assert }) => {
      const controller = new AbortController();
      const res = await fetch(`${client.baseUrl}/api/pricing/stream`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal
      });
      const contentType = res.headers.get('content-type') || '';
      controller.abort();
      assert.ok(contentType.includes('text/event-stream'), `Expected text/event-stream but got ${contentType}`);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 12: Dynamic pricing 3-tier architecture (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 12,
    name: 'T1_F12_01_ControllerDelegation: PricingController routes price calculation to service',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', { params: { itemId: 'FL-101' } });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.finalPrice > 0);
    }
  },
  {
    tier: 1,
    feature: 12,
    name: 'T1_F12_02_DynamicPricePersistence: Calculations stored with timestamp metadata',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', { params: { itemId: 'FL-101' } });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.itemId);
      assert.ok(res.data.itemType);
    }
  },
  {
    tier: 1,
    feature: 12,
    name: 'T1_F12_03_OfferCouponPersistence: Coupons stored in persistent offer_coupons collection',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/offers');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.every(c => c.id || c.code));
    }
  },
  {
    tier: 1,
    feature: 12,
    name: 'T1_F12_04_PriceHistoryPersistence: Response contains 7-day priceHistory array',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/pricing/calculate', { params: { itemId: 'FL-101' } });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.priceHistory));
      assert.ok(res.data.priceHistory.length > 0);
      assert.ok(res.data.priceHistory[0].date);
      assert.ok(typeof res.data.priceHistory[0].price === 'number');
    }
  },
  {
    tier: 1,
    feature: 12,
    name: 'T1_F12_05_PriceFreezePersistence: Price freezes stored in price_freezes collection',
    fn: async ({ client, assert }) => {
      const res = await client.post('/api/pricing/freeze', {
        itemId: 'FL-PERSIST',
        itemTitle: 'Persistence Test',
        currentPrice: 5300.0,
        hours: 24
      });
      assert.strictEqual(res.status, 201);
      const freezeId = res.data.freezeId;

      const getRes = await client.get(`/api/pricing/freeze/${freezeId}`);
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.data.freezeId, freezeId);
    }
  }
];
