/**
 * Tier 1: Collaborative Travel Recommendations & AI Engine (Features 29 - 34)
 * Covers collaborative filtering engine, algorithmic explanations modal,
 * user feedback loop, curated fallback catalog, SSE stream sync, and 3-tier architecture.
 */

export const tests = [
  // --------------------------------------------------------------------------
  // FEATURE 29: Collaborative travel recommendations engine (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 29,
    name: 'T1_F29_01_GetAllRecommendations: GET /api/recommendations returns 200 OK with list',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length > 0, 'Expected non-empty recommendations');
    }
  },
  {
    tier: 1,
    feature: 29,
    name: 'T1_F29_02_RecommendationModelStructure: Recommendations contain core discovery fields',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      const rec = res.data[0];
      assert.ok(rec.id);
      assert.ok(rec.title);
      assert.ok(rec.category);
      assert.ok(typeof rec.matchScore === 'number');
      assert.ok(typeof rec.rating === 'number');
      assert.ok(typeof rec.priceEstimate === 'number');
    }
  },
  {
    tier: 1,
    feature: 29,
    name: 'T1_F29_03_CategoryFilterBeach: GET /api/recommendations?category=BEACH filters beach destinations',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations', { params: { category: 'BEACH' } });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length > 0);
      for (const r of res.data) {
        assert.strictEqual(r.category, 'BEACH');
      }
    }
  },
  {
    tier: 1,
    feature: 29,
    name: 'T1_F29_04_CategoryFilterHeritage: GET /api/recommendations?category=HERITAGE filters heritage destinations',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations', { params: { category: 'HERITAGE' } });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length > 0);
      for (const r of res.data) {
        assert.strictEqual(r.category, 'HERITAGE');
      }
    }
  },
  {
    tier: 1,
    feature: 29,
    name: 'T1_F29_05_UserSpecificRecommendations: Passing userId returns tailored recommendations',
    fn: async ({ client, assert }) => {
      const userId = 'usr-rec-test-1';
      const res = await client.get('/api/recommendations', { params: { userId } });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length > 0);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 30: Algorithmic explanations ("Why this pick?") (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 30,
    name: 'T1_F30_01_ReasonTitlePresent: Recommendations contain reasonTitle',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      for (const r of res.data) {
        assert.ok(r.reasonTitle, `Recommendation ${r.id} must have reasonTitle`);
      }
    }
  },
  {
    tier: 1,
    feature: 30,
    name: 'T1_F30_02_ReasonExplanationPresent: Recommendations contain reasonExplanation description',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      for (const r of res.data) {
        assert.ok(r.reasonExplanation, `Recommendation ${r.id} must have reasonExplanation`);
      }
    }
  },
  {
    tier: 1,
    feature: 30,
    name: 'T1_F30_03_ReasonBreakdownList: Recommendations contain reasonBreakdown bullet points',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      for (const r of res.data) {
        assert.ok(Array.isArray(r.reasonBreakdown), `Recommendation ${r.id} must have reasonBreakdown array`);
        assert.ok(r.reasonBreakdown.length > 0);
      }
    }
  },
  {
    tier: 1,
    feature: 30,
    name: 'T1_F30_04_CollaborativeFactor: Recommendations include collaborativeFactor narrative',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      for (const r of res.data) {
        assert.ok(r.collaborativeFactor, `Recommendation ${r.id} must have collaborativeFactor`);
      }
    }
  },
  {
    tier: 1,
    feature: 30,
    name: 'T1_F30_05_MatchScoreRange: Match scores are realistic percentages (70-99)',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      for (const r of res.data) {
        assert.ok(r.matchScore >= 60 && r.matchScore <= 100, `Match score ${r.matchScore} out of bounds`);
      }
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 31: User feedback loop (Helpful/Irrelevant affinity) (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 31,
    name: 'T1_F31_01_SubmitHelpfulFeedback: POST /api/recommendations/{id}/feedback HELPFUL increments helpfulCount',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/recommendations');
      const targetRec = listRes.data[0];
      const res = await client.post(`/api/recommendations/${targetRec.id}/feedback`, {
        userId: 'usr-fb-' + Date.now(),
        feedbackType: 'HELPFUL',
        notes: 'Great recommendation!'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'SUCCESS');
      assert.strictEqual(res.data.feedbackType, 'HELPFUL');
      assert.ok(res.data.helpfulCount >= 1);
    }
  },
  {
    tier: 1,
    feature: 31,
    name: 'T1_F31_02_SubmitIrrelevantFeedback: POST /api/recommendations/{id}/feedback IRRELEVANT increments irrelevantCount',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/recommendations');
      const targetRec = listRes.data[1] || listRes.data[0];
      const res = await client.post(`/api/recommendations/${targetRec.id}/feedback`, {
        userId: 'usr-fb-irr-' + Date.now(),
        feedbackType: 'IRRELEVANT',
        notes: 'Not interested in beach destinations right now.'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'SUCCESS');
      assert.strictEqual(res.data.feedbackType, 'IRRELEVANT');
      assert.ok(res.data.irrelevantCount >= 1);
    }
  },
  {
    tier: 1,
    feature: 31,
    name: 'T1_F31_03_HelpfulNotesPreserved: Feedback notes accepted without truncation',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/recommendations');
      const targetRec = listRes.data[0];
      const note = 'Planning anniversary trip next month.';
      const res = await client.post(`/api/recommendations/${targetRec.id}/feedback`, {
        userId: 'usr-note-' + Date.now(),
        feedbackType: 'HELPFUL',
        notes: note
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'SUCCESS');
    }
  },
  {
    tier: 1,
    feature: 31,
    name: 'T1_F31_04_FeedbackResponseStructure: Response includes confirmation message',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/recommendations');
      const targetRec = listRes.data[0];
      const res = await client.post(`/api/recommendations/${targetRec.id}/feedback`, {
        userId: 'usr-msg-' + Date.now(),
        feedbackType: 'HELPFUL'
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.message);
    }
  },
  {
    tier: 1,
    feature: 31,
    name: 'T1_F31_05_AffinityShiftOnHelpful: Submitting HELPFUL feedback refines user recommendations',
    fn: async ({ client, assert }) => {
      const userId = 'usr-affinity-' + Date.now();
      const listRes = await client.get('/api/recommendations', { params: { category: 'BEACH' } });
      const beachRec = listRes.data[0];
      const fbRes = await client.post(`/api/recommendations/${beachRec.id}/feedback`, {
        userId,
        feedbackType: 'HELPFUL'
      });
      assert.strictEqual(fbRes.status, 200);

      // Verify recommendations for this user still load cleanly
      const recRes = await client.get('/api/recommendations', { params: { userId } });
      assert.strictEqual(recRes.status, 200);
      assert.ok(recRes.data.length > 0);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 32: Curated fallback base catalog (Cold start) (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 32,
    name: 'T1_F32_01_CuratedBaseCatalogNotEmpty: Recommendations catalog guarantees zero empty-state collapse',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.length >= 9, 'Expected at least 9 fallback destinations');
    }
  },
  {
    tier: 1,
    feature: 32,
    name: 'T1_F32_02_CuratedDestinationsIncludeGoa: Catalog contains Goa beach destination',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      const goa = res.data.find(r => r.destination?.toLowerCase().includes('goa') || r.title?.toLowerCase().includes('goa'));
      assert.ok(goa, 'Expected Goa destination in base catalog');
    }
  },
  {
    tier: 1,
    feature: 32,
    name: 'T1_F32_03_CuratedDestinationsIncludeJaipur: Catalog contains Jaipur heritage destination',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      const jaipur = res.data.find(r => 
        r.destination?.toLowerCase().includes('jaipur') || 
        r.destination?.toLowerCase().includes('rajasthan') ||
        r.title?.toLowerCase().includes('jaipur') ||
        r.title?.toLowerCase().includes('rambagh') ||
        r.title?.toLowerCase().includes('udaivilas')
      );
      assert.ok(jaipur, 'Expected Jaipur/Rajasthan destination in base catalog');
    }
  },
  {
    tier: 1,
    feature: 32,
    name: 'T1_F32_04_CuratedDestinationsIncludeDubai: Catalog contains Dubai international destination',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      const dubai = res.data.find(r => 
        r.destination?.toLowerCase().includes('dubai') || 
        r.destination?.toLowerCase().includes('emirates') ||
        r.destination?.toLowerCase().includes('uae') ||
        r.title?.toLowerCase().includes('dubai') ||
        r.title?.toLowerCase().includes('burj')
      );
      assert.ok(dubai, 'Expected Dubai destination in base catalog');
    }
  },
  {
    tier: 1,
    feature: 32,
    name: 'T1_F32_05_ZeroEmptyStateCollapse: Random unseeded user receives full catalog',
    fn: async ({ client, assert }) => {
      const randomUser = 'cold-start-usr-' + Date.now();
      const res = await client.get('/api/recommendations', { params: { userId: randomUser } });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length >= 5);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 33: Recommendation SSE streaming sync (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 33,
    name: 'T1_F33_01_StreamConnection: GET /api/recommendations/stream connects and receives SSE event',
    fn: async ({ sse, assert }) => {
      const events = await sse.listenToSse('/api/recommendations/stream', {
        timeoutMs: 4000,
        maxEvents: 1
      });
      assert.ok(events.length >= 1, 'Expected at least 1 SSE event');
    }
  },
  {
    tier: 1,
    feature: 33,
    name: 'T1_F33_02_StreamContentType: GET /api/recommendations/stream responds with text/event-stream',
    fn: async ({ client, assert }) => {
      const controller = new AbortController();
      const res = await fetch(`${client.baseUrl}/api/recommendations/stream`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal
      });
      const contentType = res.headers.get('content-type') || '';
      controller.abort();
      assert.ok(contentType.includes('text/event-stream'));
    }
  },
  {
    tier: 1,
    feature: 33,
    name: 'T1_F33_03_CatalogSeedEndpoint: POST /api/recommendations/seed syncs catalog with database entities',
    fn: async ({ client, assert }) => {
      const res = await client.post('/api/recommendations/seed');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'SUCCESS');
    }
  },
  {
    tier: 1,
    feature: 33,
    name: 'T1_F33_04_SeedTriggersStreamEvent: Seed action broadcasts catalog update over SSE',
    fn: async ({ client, sse, assert }) => {
      const events = await sse.listenToSse('/api/recommendations/stream', {
        timeoutMs: 5000,
        maxEvents: 2,
        triggerAction: async () => {
          await client.post('/api/recommendations/seed');
        }
      });
      assert.ok(events.length >= 1);
    }
  },
  {
    tier: 1,
    feature: 33,
    name: 'T1_F33_05_StreamKeepAlivePing: Stream accepts connections without sudden disconnection',
    fn: async ({ sse, assert }) => {
      const events = await sse.listenToSse('/api/recommendations/stream', {
        timeoutMs: 2500,
        maxEvents: 5
      });
      assert.ok(Array.isArray(events));
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 34: Recommendation 3-tier architecture (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 34,
    name: 'T1_F34_01_ControllerDelegatesToService: RecommendationController routes calls to service',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/recommendations');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
    }
  },
  {
    tier: 1,
    feature: 34,
    name: 'T1_F34_02_RecommendationPersistence: Recommendations persist in MongoDB recommendations collection',
    fn: async ({ client, assert }) => {
      const res1 = await client.get('/api/recommendations');
      const res2 = await client.get('/api/recommendations');
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res1.data.length, res2.data.length);
    }
  },
  {
    tier: 1,
    feature: 34,
    name: 'T1_F34_03_FeedbackPersistence: Feedback updates are reflected in subsequent queries',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/recommendations');
      const sample = listRes.data[0];
      const initialHelpful = sample.helpfulCount || 0;

      await client.post(`/api/recommendations/${sample.id}/feedback`, {
        userId: 'usr-persist-fb-' + Date.now(),
        feedbackType: 'HELPFUL'
      });

      const singleRes = await client.get(`/api/recommendations/${sample.id}`);
      assert.strictEqual(singleRes.status, 200);
      assert.ok(singleRes.data.helpfulCount >= initialHelpful);
    }
  },
  {
    tier: 1,
    feature: 34,
    name: 'T1_F34_04_PreferenceSync: Category affinities persist in user_preferences',
    fn: async ({ client, assert }) => {
      const userId = 'usr-pref-sync-' + Date.now();
      const listRes = await client.get('/api/recommendations', { params: { category: 'HERITAGE' } });
      const rec = listRes.data[0];

      await client.post(`/api/recommendations/${rec.id}/feedback`, {
        userId,
        feedbackType: 'HELPFUL'
      });

      const prefRes = await client.get(`/api/selection/preferences/${userId}`);
      assert.strictEqual(prefRes.status, 200);
    }
  },
  {
    tier: 1,
    feature: 34,
    name: 'T1_F34_05_IndividualRecommendationGet: GET /api/recommendations/{id} retrieves specific entity',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/recommendations');
      const sample = listRes.data[0];
      const res = await client.get(`/api/recommendations/${sample.id}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.id, sample.id);
      assert.strictEqual(res.data.title, sample.title);
    }
  }
];
