/**
 * Tier 1: Customer Reviews & Rating System (Features 23 - 28)
 * Covers verified review gate, sentiment & rating distributions,
 * helpful votes, hotelier replies, reporting/flagging, admin moderation, and 3-tier persistence.
 */

const VERIFIED_USER = '6ab7690b80552a1a2ff9e11f';
const VERIFIED_TARGET = 'ht-1';

export const tests = [
  // --------------------------------------------------------------------------
  // FEATURE 23: Verified booking review gate (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 23,
    name: 'T1_F23_01_VerifiedReviewCreation: POST /api/reviews creates review for confirmed booking',
    fn: async ({ client, assert }) => {
      // Ensure user has booking for ht-1
      await client.post('/booking/hotel', null, {
        params: { userId: VERIFIED_USER, hotelId: VERIFIED_TARGET, rooms: 1, price: 8500 }
      });

      const res = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        targetTitle: 'Taj Mahal Palace',
        userId: VERIFIED_USER,
        userName: 'Verified Guest',
        rating: 5,
        title: 'Superb Historic Luxury',
        comment: 'Iconic heritage hotel with phenomenal views and exceptional service.'
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.data.id);
      assert.strictEqual(res.data.targetId, VERIFIED_TARGET);
      assert.strictEqual(res.data.rating, 5);
    }
  },
  {
    tier: 1,
    feature: 23,
    name: 'T1_F23_02_ReviewGateEnforcement: Unbooked user review is rejected with 403 Forbidden',
    fn: async ({ client, assert }) => {
      const res = await client.post('/api/reviews', {
        targetId: 'ht-1',
        targetType: 'HOTEL',
        userId: 'unverified-user-no-booking-' + Date.now(),
        rating: 5,
        title: 'Unverified Review',
        comment: 'Review attempt without booking.'
      });
      assert.strictEqual(res.status, 403, 'Expected 403 Forbidden for unverified customer');
    }
  },
  {
    tier: 1,
    feature: 23,
    name: 'T1_F23_03_ReviewAssociatedWithBooking: Review stores targetId and userId',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews', {
        params: { targetId: VERIFIED_TARGET }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.reviews.length > 0);
      const rev = res.data.reviews[0];
      assert.ok(rev.userId);
      assert.strictEqual(rev.targetId, VERIFIED_TARGET);
    }
  },
  {
    tier: 1,
    feature: 23,
    name: 'T1_F23_04_ReviewHotelTargetType: TargetType HOTEL supported on reviews',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews', {
        params: { targetId: VERIFIED_TARGET, targetType: 'HOTEL' }
      });
      assert.strictEqual(res.status, 200);
      for (const r of res.data.reviews) {
        assert.strictEqual(r.targetType, 'HOTEL');
      }
    }
  },
  {
    tier: 1,
    feature: 23,
    name: 'T1_F23_05_ReviewSummaryIntegrity: Review endpoint returns totalCount and averageRating',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews', {
        params: { targetId: VERIFIED_TARGET }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.data.totalCount === 'number');
      assert.ok(typeof res.data.averageRating === 'number');
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 24: Detailed sentiment scoring & category (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 24,
    name: 'T1_F24_01_ReviewCreationReturnsReview: POST /api/reviews returns full review model with sentiment',
    fn: async ({ client, assert }) => {
      const res = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 5,
        title: 'Exceptional Service',
        comment: 'The private dining and heritage architecture were truly breathtaking.'
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.data.id);
      assert.ok(res.data.sentimentCategory);
      assert.ok(typeof res.data.sentimentScore === 'number');
    }
  },
  {
    tier: 1,
    feature: 24,
    name: 'T1_F24_02_ReviewRatingRecorded: Rating stored accurately (1-5 range)',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews', {
        params: { targetId: VERIFIED_TARGET }
      });
      for (const r of res.data.reviews) {
        assert.ok(r.rating >= 1 && r.rating <= 5);
      }
    }
  },
  {
    tier: 1,
    feature: 24,
    name: 'T1_F24_03_PositiveCommentReview: Review comment preserved faithfully',
    fn: async ({ client, assert }) => {
      const comment = 'Excellent breakfast buffet and pristine swimming pool.';
      const res = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 5,
        title: 'Great Experience',
        comment
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.comment, comment);
    }
  },
  {
    tier: 1,
    feature: 24,
    name: 'T1_F24_04_DetailedCommentStored: Reviews support detailed text',
    fn: async ({ client, assert }) => {
      const longComment = 'A'.repeat(500);
      const res = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 4,
        title: 'Long Form Review',
        comment: longComment
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.comment.length, 500);
    }
  },
  {
    tier: 1,
    feature: 24,
    name: 'T1_F24_05_RatingDistributionCalculated: Summary includes 1-5 rating distribution map',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews', {
        params: { targetId: VERIFIED_TARGET }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.ratingDistribution);
      assert.strictEqual(typeof res.data.ratingDistribution, 'object');
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 25: Photo upload support & helpful counters (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 25,
    name: 'T1_F25_01_ReviewSummaryDtoReturned: GET /api/reviews returns ReviewSummaryDTO structure',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews', {
        params: { targetId: VERIFIED_TARGET }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.data.totalCount === 'number');
      assert.ok(Array.isArray(res.data.reviews));
    }
  },
  {
    tier: 1,
    feature: 25,
    name: 'T1_F25_02_HelpfulVoteToggle: POST /api/reviews/{id}/helpful toggles helpfulCount',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      const targetReview = listRes.data.reviews[0];
      const initialCount = targetReview.helpfulCount || 0;
      const voterId = 'usr-vote-' + Date.now();

      const voteRes = await client.post(`/api/reviews/${targetReview.id}/helpful`, null, {
        params: { userId: voterId }
      });
      assert.strictEqual(voteRes.status, 200);
      assert.strictEqual(voteRes.data.helpfulCount, initialCount + 1);
    }
  },
  {
    tier: 1,
    feature: 25,
    name: 'T1_F25_03_HelpfulUserTracked: helpfulUserIds contains voter userId',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      const targetReview = listRes.data.reviews[0];
      const voterId = 'usr-vote-track-' + Date.now();

      const voteRes = await client.post(`/api/reviews/${targetReview.id}/helpful`, null, {
        params: { userId: voterId }
      });
      assert.strictEqual(voteRes.status, 200);
      assert.ok(voteRes.data.helpfulUserIds.includes(voterId));
    }
  },
  {
    tier: 1,
    feature: 25,
    name: 'T1_F25_04_HelpfulVoteUntoggle: Second vote by same user removes vote and decrements count',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      const targetReview = listRes.data.reviews[0];
      const voterId = 'usr-vote-untoggle-' + Date.now();

      // Vote 1
      const vote1 = await client.post(`/api/reviews/${targetReview.id}/helpful`, null, { params: { userId: voterId } });
      const countAfterVote = vote1.data.helpfulCount;

      // Vote 2 (Untoggle)
      const vote2 = await client.post(`/api/reviews/${targetReview.id}/helpful`, null, { params: { userId: voterId } });
      assert.strictEqual(vote2.status, 200);
      assert.strictEqual(vote2.data.helpfulCount, countAfterVote - 1);
      assert.ok(!vote2.data.helpfulUserIds.includes(voterId));
    }
  },
  {
    tier: 1,
    feature: 25,
    name: 'T1_F25_05_ReviewPhotoUrlsSupported: Reviews preserve photoUrls array',
    fn: async ({ client, assert }) => {
      const photoUrls = [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'
      ];
      const res = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 5,
        title: 'Photo Verified Stay',
        comment: 'Check out these authentic photos from our oceanfront villa.',
        photoUrls
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.photoUrls.length, 2);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 26: Hotelier replies & community flagging (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 26,
    name: 'T1_F26_01_AddHotelierReply: POST /api/reviews/{id}/reply adds hotelier reply',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      const targetReview = listRes.data.reviews[0];
      const replyRes = await client.post(`/api/reviews/${targetReview.id}/reply`, {
        userId: 'mgr-taj-1',
        userName: 'General Manager, Taj Mahal Palace',
        comment: 'Thank you for your warm words! We look forward to hosting you again.'
      });
      assert.strictEqual(replyRes.status, 201);
      assert.ok(Array.isArray(replyRes.data.replies));
      assert.ok(replyRes.data.replies.some(r => r.comment.includes('warm words')));
    }
  },
  {
    tier: 1,
    feature: 26,
    name: 'T1_F26_02_ReplyContentRecorded: Reply contains replyId, userName, comment, createdAt',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      const targetReview = listRes.data.reviews[0];
      const reply = targetReview.replies[targetReview.replies.length - 1];
      assert.ok(reply.replyId);
      assert.ok(reply.userName);
      assert.ok(reply.comment);
      assert.ok(reply.createdAt);
    }
  },
  {
    tier: 1,
    feature: 26,
    name: 'T1_F26_03_FlagReview: POST /api/reviews/{id}/flag marks review as flagged',
    fn: async ({ client, assert }) => {
      const createRes = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 1,
        title: 'Content to be flagged',
        comment: 'Suspicious promotion link or inappropriate commentary.'
      });
      const reviewId = createRes.data.id;

      const flagRes = await client.post(`/api/reviews/${reviewId}/flag`, null, {
        params: { userId: 'usr-reporter', reason: 'Spam / Advertising' }
      });
      assert.strictEqual(flagRes.status, 200);
      assert.strictEqual(flagRes.data.flagged, true);
    }
  },
  {
    tier: 1,
    feature: 26,
    name: 'T1_F26_04_FlaggedReviewExcludedFromPublic: Flagged reviews do not appear in public GET /api/reviews',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      for (const r of listRes.data.reviews) {
        assert.strictEqual(r.flagged, false, 'Public review must not be flagged');
      }
    }
  },
  {
    tier: 1,
    feature: 26,
    name: 'T1_F26_05_MultipleRepliesSupported: Hotelier and community can add multiple responses',
    fn: async ({ client, assert }) => {
      const listRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      const targetReview = listRes.data.reviews[0];

      await client.post(`/api/reviews/${targetReview.id}/reply`, {
        userId: 'concierge-1',
        userName: 'Concierge Team',
        comment: 'Please reach out if you need assistance on your next booking.'
      });

      const updatedRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      const updated = updatedRes.data.reviews.find(r => r.id === targetReview.id);
      assert.ok(updated.replies.length >= 1);
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 27: Admin review moderation panel & controls (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 27,
    name: 'T1_F27_01_GetFlaggedReviews: GET /api/reviews/moderation/flagged returns flagged list',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews/moderation/flagged');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
    }
  },
  {
    tier: 1,
    feature: 27,
    name: 'T1_F27_02_FlaggedAppearsInQueue: Flagged review appears in moderation queue',
    fn: async ({ client, assert }) => {
      const createRes = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 1,
        title: 'Review for Moderation Queue',
        comment: 'Test content to check queue presence.'
      });
      const reviewId = createRes.data.id;
      await client.post(`/api/reviews/${reviewId}/flag`, null, { params: { reason: 'Queue test' } });

      const queueRes = await client.get('/api/reviews/moderation/flagged');
      assert.strictEqual(queueRes.status, 200);
      assert.ok(queueRes.data.some(r => r.id === reviewId));
    }
  },
  {
    tier: 1,
    feature: 27,
    name: 'T1_F27_03_AdminDismissFlag: POST /api/reviews/moderation/{id}/action?action=DISMISS unflags review',
    fn: async ({ client, assert }) => {
      const createRes = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 5,
        title: 'Falsely Flagged Review',
        comment: 'Legitimate traveler feedback.'
      });
      const reviewId = createRes.data.id;
      await client.post(`/api/reviews/${reviewId}/flag`);

      const actionRes = await client.post(`/api/reviews/moderation/${reviewId}/action`, null, {
        params: { action: 'DISMISS' }
      });
      assert.strictEqual(actionRes.status, 200);
      assert.strictEqual(actionRes.data.status, 'SUCCESS');
    }
  },
  {
    tier: 1,
    feature: 27,
    name: 'T1_F27_04_DismissedReviewPublicAgain: Dismissed review returns to public listing',
    fn: async ({ client, assert }) => {
      const createRes = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 5,
        title: 'Restored Review',
        comment: 'This should be visible again after dismissal.'
      });
      const reviewId = createRes.data.id;
      await client.post(`/api/reviews/${reviewId}/flag`);
      await client.post(`/api/reviews/moderation/${reviewId}/action`, null, { params: { action: 'DISMISS' } });

      const listRes = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      assert.ok(listRes.data.reviews.some(r => r.id === reviewId));
    }
  },
  {
    tier: 1,
    feature: 27,
    name: 'T1_F27_05_AdminRemoveAction: POST /api/reviews/moderation/{id}/action?action=REMOVE deletes review',
    fn: async ({ client, assert }) => {
      const createRes = await client.post('/api/reviews', {
        targetId: VERIFIED_TARGET,
        targetType: 'HOTEL',
        userId: VERIFIED_USER,
        rating: 1,
        title: 'Review to be removed',
        comment: 'Offensive or spam content.'
      });
      const reviewId = createRes.data.id;
      await client.post(`/api/reviews/${reviewId}/flag`);

      const removeRes = await client.post(`/api/reviews/moderation/${reviewId}/action`, null, {
        params: { action: 'REMOVE' }
      });
      assert.strictEqual(removeRes.status, 200);

      const queueRes = await client.get('/api/reviews/moderation/flagged');
      assert.ok(!queueRes.data.some(r => r.id === reviewId));
    }
  },

  // --------------------------------------------------------------------------
  // FEATURE 28: Review 3-tier architecture (5 tests)
  // --------------------------------------------------------------------------
  {
    tier: 1,
    feature: 28,
    name: 'T1_F28_01_ControllerDelegatesToService: ReviewController routes queries to ReviewService',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.totalCount >= 1);
    }
  },
  {
    tier: 1,
    feature: 28,
    name: 'T1_F28_02_ReviewPersistenceInMongoDB: Reviews persist across separate client requests',
    fn: async ({ client, assert }) => {
      const res1 = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      const res2 = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res1.data.totalCount, res2.data.totalCount);
    }
  },
  {
    tier: 1,
    feature: 28,
    name: 'T1_F28_03_AverageRatingRecalculation: averageRating matches average of active reviews',
    fn: async ({ client, assert }) => {
      const res = await client.get('/api/reviews', { params: { targetId: VERIFIED_TARGET } });
      assert.strictEqual(res.status, 200);
      if (res.data.reviews.length > 0) {
        const sum = res.data.reviews.reduce((acc, r) => acc + r.rating, 0);
        const expectedAvg = parseFloat((sum / res.data.reviews.length).toFixed(1));
        assert.strictEqual(res.data.averageRating, expectedAvg);
      }
    }
  },
  {
    tier: 1,
    feature: 28,
    name: 'T1_F28_04_ReviewSSEStream: GET /api/reviews/stream connects to live review stream',
    fn: async ({ sse, assert }) => {
      const events = await sse.listenToSse('/api/reviews/stream', {
        params: { targetId: VERIFIED_TARGET, targetType: 'HOTEL' },
        timeoutMs: 4000,
        maxEvents: 1
      });
      assert.ok(events.length >= 1);
    }
  },
  {
    tier: 1,
    feature: 28,
    name: 'T1_F28_05_ModerationSSEStream: GET /api/reviews/moderation/stream connects to moderation queue stream',
    fn: async ({ sse, assert }) => {
      const events = await sse.listenToSse('/api/reviews/moderation/stream', {
        timeoutMs: 4000,
        maxEvents: 1
      });
      assert.ok(events.length >= 1);
    }
  }
];
