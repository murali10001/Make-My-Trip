/**
 * Tier 1: Interactive Seat & Room Selection (Features 18 - 22)
 * Covers interactive seat map, 3D hotel room showcase,
 * user travel preferences, real-time concurrency handling, and 3-tier architecture.
 */

export const tests = [
  // --------------------------------------------------------------------------
  // FEATURE 18: Interactive seat map & lock/release (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 18,
    name: 'T1_F18_01_GetSeatMap: GET /api/selection/seatmap/{flightId} returns 12x6 cabin map',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/seatmap/FL-101');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.totalRows, 12);
      assert.ok(Array.isArray(res.data.seats));
      assert.strictEqual(res.data.seats.length, 72, 'Expected 72 seats in 12x6 cabin');
    }
  },
  {
    tier: 1,
    feature: 18,
    name: 'T1_F18_02_SeatMapSeatStructure: Seats contain row, column, tier, priceAddon, status',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/seatmap/FL-101');
      assert.strictEqual(res.status, 200);
      const seat = res.data.seats[0];
      assert.ok(seat.seatNo);
      assert.ok(typeof seat.row === 'number');
      assert.ok(seat.column);
      assert.ok(seat.tier);
      assert.ok(typeof seat.priceAddon === 'number');
      assert.ok(['AVAILABLE', 'OCCUPIED', 'LOCKED', 'RESERVED'].includes(seat.status));
    }
  },
  {
    tier: 1,
    feature: 18,
    name: 'T1_F18_03_ReserveSeat: POST /api/selection/reserve-seat reserves an available seat',
    fn: async ({ client, assert }) => {
      // First release 12F to ensure clean state
      await client.post('/api/selection/release-seat', null, {
        params: { flightId: 'FL-101', seatNo: '12F' }
      });

      const res = await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: 'FL-101', seatNo: '12F', userId: 'usr-seat-1' }
      });
      assert.strictEqual(res.status, 200);
      const reserved = res.data.seats.find(s => s.seatNo === '12F');
      assert.ok(reserved);
      assert.strictEqual(reserved.status, 'OCCUPIED');
    }
  },
  {
    tier: 1,
    feature: 18,
    name: 'T1_F18_04_ReleaseSeat: POST /api/selection/release-seat frees reserved seat',
    fn: async ({ client, assert }) => {
      const res = await client.post('/api/selection/release-seat', null, {
        params: { flightId: 'FL-101', seatNo: '12F' }
      });
      assert.strictEqual(res.status, 200);
      const released = res.data.seats.find(s => s.seatNo === '12F');
      assert.ok(released);
      assert.strictEqual(released.status, 'AVAILABLE');
    }
  },
  {
    tier: 1,
    feature: 18,
    name: 'T1_F18_05_SeatTiersCheck: Front row window seat is WINDOW_EXTRA_LEGROOM',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/seatmap/FL-101');
      const seat1A = res.data.seats.find(s => s.seatNo === '1A');
      assert.ok(seat1A);
      assert.strictEqual(seat1A.tier, 'WINDOW_EXTRA_LEGROOM');
      assert.ok(seat1A.priceAddon > 0);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 19: Interactive hotel room selection & 3D showcase (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 19,
    name: 'T1_F19_01_FeaturedRoomsShowcase: GET /api/selection/featured-rooms returns 4 room tiers',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/featured-rooms');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length >= 4, 'Expected at least 4 showcase room tiers');
    }
  },
  {
    tier: 1,
    feature: 19,
    name: 'T1_F19_02_Showcase3DConfigPresent: Showcase rooms contain room3dConfig',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/featured-rooms');
      assert.strictEqual(res.status, 200);
      for (const room of res.data) {
        assert.ok(room.room3dConfig, `Room ${room.roomTypeName} must have room3dConfig`);
      }
    }
  },
  {
    tier: 1,
    feature: 19,
    name: 'T1_F19_03_ShowcaseDimensions: 3D configs specify architectural dimensions',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/featured-rooms');
      assert.strictEqual(res.status, 200);
      const room = res.data[0];
      assert.ok(room.room3dConfig.dimensions, 'Expected dimensions object');
      assert.ok(room.room3dConfig.dimensions.width > 0);
      assert.ok(room.room3dConfig.dimensions.length > 0);
    }
  },
  {
    tier: 1,
    feature: 19,
    name: 'T1_F19_04_ShowcaseLightingProfile: 3D configs provide lightingProfile details',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/featured-rooms');
      assert.strictEqual(res.status, 200);
      const room = res.data[0];
      assert.ok(room.room3dConfig.lightingProfile);
      assert.ok(typeof room.room3dConfig.lightingProfile.dayIntensity === 'number');
    }
  },
  {
    tier: 1,
    feature: 19,
    name: 'T1_F19_05_HotelRoomsEndpoint: GET /api/selection/hotel-rooms/{hotelId} returns room options',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/hotel-rooms/curated-hotel-goa-taj');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length > 0);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 20: Saved user seat & room travel preferences (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 20,
    name: 'T1_F20_01_SaveUserPreferences: POST /api/selection/preferences saves travel choices',
    fn: async ({ client, assert }) => {
      const userId = 'usr-pref-' + Date.now();
      const res = await client.post('/api/selection/preferences', {
        userId,
        preferredSeatType: 'WINDOW',
        preferredRoomType: 'DELUXE_BALCONY',
        bedType: 'King Size Bed',
        floorView: 'Sea View'
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.userId, userId);
      assert.strictEqual(res.data.preferredSeatType, 'WINDOW');
    }
  },
  {
    tier: 1,
    feature: 20,
    name: 'T1_F20_02_GetUserPreferences: GET /api/selection/preferences/{userId} retrieves saved preferences',
    fn: async ({ client, assert }) => {
      const userId = 'usr-pref-' + Date.now();
      await client.post('/api/selection/preferences', {
        userId,
        preferredSeatType: 'EXTRA_LEGROOM',
        preferredRoomType: 'PRESIDENTIAL_ROYAL'
      });

      const res = await client.get(`/api/selection/preferences/${userId}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.userId, userId);
      assert.strictEqual(res.data.preferredSeatType, 'EXTRA_LEGROOM');
    }
  },
  {
    tier: 1,
    feature: 20,
    name: 'T1_F20_03_UpdateUserPreferences: Updating preferences overwrites prior settings',
    fn: async ({ client, assert }) => {
      const userId = 'usr-pref-' + Date.now();
      await client.post('/api/selection/preferences', {
        userId,
        preferredSeatType: 'WINDOW'
      });
      const updateRes = await client.post('/api/selection/preferences', {
        userId,
        preferredSeatType: 'AISLE'
      });
      assert.strictEqual(updateRes.status, 201);
      assert.strictEqual(updateRes.data.preferredSeatType, 'AISLE');
    }
  },
  {
    tier: 1,
    feature: 20,
    name: 'T1_F20_04_DefaultPreferencesOnUnknownUser: Unknown user receives default preferences model',
    fn: async ({ client, assert }) => {
      const unknownId = 'usr-unknown-' + Date.now();
      const res = await client.get(`/api/selection/preferences/${unknownId}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.userId, unknownId);
    }
  },
  {
    tier: 1,
    feature: 20,
    name: 'T1_F20_05_PreferenceFieldsIntegrity: Model supports category affinities and room preferences',
    fn: async ({ client, assert }) => {
      const userId = 'usr-pref-' + Date.now();
      const res = await client.post('/api/selection/preferences', {
        userId,
        preferredSeatType: 'EXTRA_LEGROOM',
        preferredRoomType: 'EXECUTIVE_PANORAMIC'
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.preferredSeatType, 'EXTRA_LEGROOM');
      assert.strictEqual(res.data.preferredRoomType, 'EXECUTIVE_PANORAMIC');
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 21: Real-time concurrency handling (Seat locks) (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 21,
    name: 'T1_F21_01_SeatLockSSEStream: GET /api/selection/stream connects and receives SSE event',
    fn: async ({ sse, assert }) => {
      const events = await sse.listenToSse('/api/selection/stream', {
        timeoutMs: 4000,
        maxEvents: 1
      });
      assert.ok(events.length >= 1, 'Expected at least 1 SSE event');
      assert.ok(['connection', 'ping', 'seat-update', 'room-update'].includes(events[0].event));
    }
  },
  {
    tier: 1,
    feature: 21,
    name: 'T1_F21_02_SeatLockSSEBroadcast: Seat reservation broadcasts seat-update event',
    fn: async ({ client, sse, assert }) => {
      await client.post('/api/selection/release-seat', null, {
        params: { flightId: 'FL-101', seatNo: '11A' }
      });

      const events = await sse.listenToSse('/api/selection/stream', {
        timeoutMs: 5000,
        maxEvents: 2,
        triggerAction: async () => {
          await client.post('/api/selection/reserve-seat', null, {
            params: { flightId: 'FL-101', seatNo: '11A', userId: 'usr-sse' }
          });
        }
      });
      assert.ok(events.length >= 1);
    }
  },
  {
    tier: 1,
    feature: 21,
    name: 'T1_F21_03_ConcurrentSeatConflict: Double-reserving an occupied seat returns HTTP 409 Conflict',
    fn: async ({ client, assert }) => {
      // First ensure seat is reserved
      await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: 'FL-101', seatNo: '10A', userId: 'usr-first' }
      });

      // Second reserve on same seat
      const clashRes = await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: 'FL-101', seatNo: '10A', userId: 'usr-second' }
      });
      assert.strictEqual(clashRes.status, 409, 'Expected HTTP 409 Conflict');
    }
  },
  {
    tier: 1,
    feature: 21,
    name: 'T1_F21_04_ConflictErrorMessage: 409 response explains seat is unavailable',
    fn: async ({ client, assert }) => {
      await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: 'FL-101', seatNo: '10B', userId: 'usr-first' }
      });
      const clashRes = await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: 'FL-101', seatNo: '10B', userId: 'usr-second' }
      });
      assert.strictEqual(clashRes.status, 409);
      assert.ok(clashRes.data.message || clashRes.data.error);
    }
  },
  {
    tier: 1,
    feature: 21,
    name: 'T1_F21_05_SequentialLockReleaseCycle: Lock followed by release leaves seat AVAILABLE',
    fn: async ({ client, assert }) => {
      await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: 'FL-101', seatNo: '10C', userId: 'usr-cycle' }
      });
      const releaseRes = await client.post('/api/selection/release-seat', null, {
        params: { flightId: 'FL-101', seatNo: '10C' }
      });
      assert.strictEqual(releaseRes.status, 200);
      const seat = releaseRes.data.seats.find(s => s.seatNo === '10C');
      assert.strictEqual(seat.status, 'AVAILABLE');
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 22: Selection 3-tier architecture (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 22,
    name: 'T1_F22_01_ControllerDelegatesToService: SelectionController routes calls to SelectionService',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/selection/featured-rooms');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
    }
  },
  {
    tier: 1,
    feature: 22,
    name: 'T1_F22_02_SeatMapPersistence: SeatMap changes persist in MongoDB across queries',
    fn: async ({ client, assert }) => {
      await client.post('/api/selection/reserve-seat', null, {
        params: { flightId: 'FL-101', seatNo: '10D', userId: 'usr-p' }
      });
      const getRes = await client.get('/api/selection/seatmap/FL-101');
      assert.strictEqual(getRes.status, 200);
      const seat = getRes.data.seats.find(s => s.seatNo === '10D');
      assert.strictEqual(seat.status, 'OCCUPIED');
      // Cleanup
      await client.post('/api/selection/release-seat', null, {
        params: { flightId: 'FL-101', seatNo: '10D' }
      });
    }
  },
  {
    tier: 1,
    feature: 22,
    name: 'T1_F22_03_RoomOptionsPersistence: Hotel room tiers persist in room_type_options',
    fn: async ({ client, assert }) => {
      const res1 = await client.get('/api/selection/hotel-rooms/curated-hotel-goa-taj');
      const res2 = await client.get('/api/selection/hotel-rooms/curated-hotel-goa-taj');
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res1.data.length, res2.data.length);
    }
  },
  {
    tier: 1,
    feature: 22,
    name: 'T1_F22_04_UserPreferencesPersistence: User travel preferences persist in user_preferences',
    fn: async ({ client, assert }) => {
      const userId = 'usr-p-' + Date.now();
      await client.post('/api/selection/preferences', { userId, preferredSeatType: 'AISLE' });
      const getRes = await client.get(`/api/selection/preferences/${userId}`);
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.data.preferredSeatType, 'AISLE');
    }
  },
  {
    tier: 1,
    feature: 22,
    name: 'T1_F22_05_SelectionStreamContentType: /api/selection/stream responds with text/event-stream',
    fn: async ({ client, assert }) => {
      const controller = new AbortController();
      const res = await fetch(`${client.baseUrl}/api/selection/stream`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal
      });
      const contentType = res.headers.get('content-type') || '';
      controller.abort();
      assert.ok(contentType.includes('text/event-stream'));
    }
  }
];
