import {
  apiClient,
  isSuccess,
  extractErrorMessage,
  login,
  signup,
  getuserbyemail,
  editprofile,
  getflight,
  getflightbyid,
  addflight,
  editflight,
  gethotel,
  gethotelbyid,
  getHomeContent,
  addhotel,
  edithotel,
  handleflightbooking,
  handlehotelbooking,
  getUserBookings,
  getFlightStatuses,
  getFlightStatusByNumber,
  getTrackedFlights,
  simulateFlightUpdate,
  triggerRandomFlightSimulation,
  validateFlightStatusDb,
  getDynamicPricing,
  getPriceHistory,
  freezePrice,
  getFreezeStatus,
  getUserPriceFreezes,
  removePriceFreeze,
  getPromotionalOffers,
  applyCouponCode,
  getAppNotifications,
  deleteAppNotification,
  clearAllAppNotifications,
  markAllAppNotificationsRead,
  calculateRefundPreview,
  submitCancellationAndRefund,
  getUserRefunds,
  getRefundStatus,
  getSeatMap,
  reserveSeat,
  getHotelRoomOptions,
  saveUserPreferences,
  getUserPreferences,
  getReviews,
  createReview,
  addReviewReply,
  toggleReviewHelpful,
  flagReview,
  getFlaggedReviews,
  moderateReview,
  getRecommendations,
  getRecommendationById,
  submitRecommendationFeedback,
  seedRecommendations,
} from "../../makemytour/src/api/index.js";

console.log("===============================================================");
console.log("DEEP FRONTEND API INTEGRATION AUDIT & RESILIENCE DRILL");
console.log("===============================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName} - ${details}`);
  }
}

async function runDrill() {
  console.log("--- 1. Testing Offline/Network Error Resilience on Query Methods ---");
  // Queries should return safe fallbacks and NOT throw unhandled exceptions
  try {
    const flights = await getflight("Delhi", "Mumbai");
    assert(Array.isArray(flights) && flights.length === 0, "getflight returns safe empty array when offline");
  } catch (err) {
    assert(false, "getflight should not throw when offline", err.message);
  }

  try {
    const flight = await getflightbyid("INVALID-FLIGHT-ID");
    assert(flight === null, "getflightbyid returns null when offline or not found");
  } catch (err) {
    assert(false, "getflightbyid should not throw when offline", err.message);
  }

  try {
    const hotels = await gethotel("Goa");
    assert(Array.isArray(hotels) && hotels.length === 0, "gethotel returns safe empty array when offline");
  } catch (err) {
    assert(false, "gethotel should not throw when offline", err.message);
  }

  try {
    const hotel = await gethotelbyid("INVALID-HOTEL-ID");
    assert(hotel === null, "gethotelbyid returns null when offline or not found");
  } catch (err) {
    assert(false, "gethotelbyid should not throw when offline", err.message);
  }

  try {
    const homeContent = await getHomeContent();
    assert(homeContent === null, "getHomeContent returns null when offline");
  } catch (err) {
    assert(false, "getHomeContent should not throw when offline", err.message);
  }

  try {
    const flightStatuses = await getFlightStatuses("", "ALL");
    assert(Array.isArray(flightStatuses) && flightStatuses.length === 0, "getFlightStatuses returns safe empty array when offline");
  } catch (err) {
    assert(false, "getFlightStatuses should not throw when offline", err.message);
  }

  try {
    const flightStatus = await getFlightStatusByNumber("AI-101");
    assert(flightStatus === null, "getFlightStatusByNumber returns null when offline");
  } catch (err) {
    assert(false, "getFlightStatusByNumber should not throw when offline", err.message);
  }

  try {
    const tracked = await getTrackedFlights(["AI-101"]);
    assert(Array.isArray(tracked) && tracked.length === 0, "getTrackedFlights returns safe empty array when offline");
  } catch (err) {
    assert(false, "getTrackedFlights should not throw when offline", err.message);
  }

  try {
    const dynamicPrice = await getDynamicPricing("FL-101", "FLIGHT", 5500);
    assert(dynamicPrice === null, "getDynamicPricing returns null when offline");
  } catch (err) {
    assert(false, "getDynamicPricing should not throw when offline", err.message);
  }

  try {
    const priceHistory = await getPriceHistory("FL-101", 5500);
    assert(Array.isArray(priceHistory) && priceHistory.length === 0, "getPriceHistory returns safe empty array when offline");
  } catch (err) {
    assert(false, "getPriceHistory should not throw when offline", err.message);
  }

  try {
    const offers = await getPromotionalOffers();
    assert(Array.isArray(offers) && offers.length === 0, "getPromotionalOffers returns safe empty array when offline");
  } catch (err) {
    assert(false, "getPromotionalOffers should not throw when offline", err.message);
  }

  try {
    const notifs = await getAppNotifications("test-user");
    assert(Array.isArray(notifs) && notifs.length === 0, "getAppNotifications returns safe empty array when offline");
  } catch (err) {
    assert(false, "getAppNotifications should not throw when offline", err.message);
  }

  try {
    const refunds = await getUserRefunds("test-user");
    assert(Array.isArray(refunds) && refunds.length === 0, "getUserRefunds returns safe empty array when offline");
  } catch (err) {
    assert(false, "getUserRefunds should not throw when offline", err.message);
  }

  try {
    const seatMap = await getSeatMap("FL-101");
    assert(seatMap === null, "getSeatMap returns null when offline");
  } catch (err) {
    assert(false, "getSeatMap should not throw when offline", err.message);
  }

  try {
    const rooms = await getHotelRoomOptions("HT-101");
    assert(Array.isArray(rooms) && rooms.length === 0, "getHotelRoomOptions returns safe empty array when offline");
  } catch (err) {
    assert(false, "getHotelRoomOptions should not throw when offline", err.message);
  }

  try {
    const reviews = await getReviews("HT-101", "HOTEL");
    assert(reviews === null, "getReviews returns null when offline");
  } catch (err) {
    assert(false, "getReviews should not throw when offline", err.message);
  }

  try {
    const flagged = await getFlaggedReviews();
    assert(Array.isArray(flagged) && flagged.length === 0, "getFlaggedReviews returns safe empty array when offline");
  } catch (err) {
    assert(false, "getFlaggedReviews should not throw when offline", err.message);
  }

  try {
    const recs = await getRecommendations("test-user", "ALL");
    assert(Array.isArray(recs) && recs.length === 0, "getRecommendations returns safe empty array when offline");
  } catch (err) {
    assert(false, "getRecommendations should not throw when offline", err.message);
  }

  console.log("\n--- 2. Testing Mutation Methods - Parameter Validation & Offline Failure Trapping ---");

  // Booking with missing userId or flightId
  try {
    await handleflightbooking("", "FL-101", 1, 5000);
    assert(false, "handleflightbooking without userId should throw");
  } catch (err) {
    assert(err.message.includes("logged in"), "handleflightbooking throws when userId is empty");
  }

  try {
    await handleflightbooking("user-1", "", 1, 5000);
    assert(false, "handleflightbooking without flightId should throw");
  } catch (err) {
    assert(err.message.includes("flight"), "handleflightbooking throws when flightId is empty");
  }

  // Booking when server is offline
  try {
    await handleflightbooking("valid-user", "FL-101", 1, 5000);
    assert(false, "handleflightbooking when server is offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "handleflightbooking throws descriptive network error when server offline");
  }

  // Hotel booking validation
  try {
    await handlehotelbooking("", "HT-101", 1, 4000);
    assert(false, "handlehotelbooking without userId should throw");
  } catch (err) {
    assert(err.message.includes("logged in"), "handlehotelbooking throws when userId is empty");
  }

  try {
    await handlehotelbooking("valid-user", "HT-101", 1, 4000);
    assert(false, "handlehotelbooking when server is offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "handlehotelbooking throws descriptive network error when server offline");
  }

  // Auth mutations offline
  try {
    await login("test@example.com", "pass123");
    assert(false, "login when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "login throws descriptive network error when offline");
  }

  try {
    await signup("John", "Doe", "test@example.com", "9999999999", "pass123");
    assert(false, "signup when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "signup throws descriptive network error when offline");
  }

  // Admin mutations offline
  try {
    await addflight({ flightName: "Test Flight" });
    assert(false, "addflight when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "addflight throws descriptive network error when offline");
  }

  try {
    await editflight("FL-101", { flightName: "Updated Flight" });
    assert(false, "editflight when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "editflight throws descriptive network error when offline");
  }

  try {
    await addhotel({ hotelName: "Test Hotel" });
    assert(false, "addhotel when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "addhotel throws descriptive network error when offline");
  }

  try {
    await edithotel("HT-101", { hotelName: "Updated Hotel" });
    assert(false, "edithotel when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "edithotel throws descriptive network error when offline");
  }

  // Pricing mutations offline
  try {
    await freezePrice("FL-101", "Air India", 5500, 24, "user-1");
    assert(false, "freezePrice when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "freezePrice throws descriptive network error when offline");
  }

  // Seat reservation offline
  try {
    await reserveSeat("FL-101", "12A", "user-1");
    assert(false, "reserveSeat when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "reserveSeat throws descriptive network error when offline");
  }

  // Review mutations offline
  try {
    await createReview({ targetId: "HT-101", targetType: "HOTEL", rating: 5, title: "Great", comment: "Awesome" });
    assert(false, "createReview when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "createReview throws descriptive network error when offline");
  }

  try {
    await addReviewReply("REV-1", { comment: "Thank you!" });
    assert(false, "addReviewReply when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "addReviewReply throws descriptive network error when offline");
  }

  try {
    await toggleReviewHelpful("REV-1", "user-1");
    assert(false, "toggleReviewHelpful when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "toggleReviewHelpful throws descriptive network error when offline");
  }

  try {
    await flagReview("REV-1", "user-1", "Inappropriate");
    assert(false, "flagReview when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "flagReview throws descriptive network error when offline");
  }

  try {
    await moderateReview("REV-1", "DISMISS");
    assert(false, "moderateReview when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "moderateReview throws descriptive network error when offline");
  }

  // Recommendation feedback offline
  try {
    await submitRecommendationFeedback("REC-1", "user-1", "HELPFUL");
    assert(false, "submitRecommendationFeedback when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "submitRecommendationFeedback throws descriptive network error when offline");
  }

  // Cancellation and refund offline
  try {
    await submitCancellationAndRefund("user-1", "BK-1", "Change of plans");
    assert(false, "submitCancellationAndRefund when server offline should throw");
  } catch (err) {
    assert(err.message.includes("Unable to connect to server"), "submitCancellationAndRefund throws descriptive network error when offline");
  }

  // Coupon code handling offline
  try {
    const couponRes = await applyCouponCode("HDFC10", 5000);
    assert(couponRes && couponRes.success === false, "applyCouponCode returns structured failure object instead of throwing");
    assert(couponRes.finalAmount === 5000, "applyCouponCode maintains original amount on error");
  } catch (err) {
    assert(false, "applyCouponCode should not throw uncaught error", err.message);
  }

  console.log("\n--- 3. Testing extractErrorMessage Helper ---");
  assert(extractErrorMessage({ isNetworkError: true }) === "Unable to connect to server. Please ensure the backend is running.", "extractErrorMessage handles network error");
  assert(extractErrorMessage({ data: "Custom string error" }) === "Custom string error", "extractErrorMessage handles plain string response");
  assert(extractErrorMessage({ data: { message: "JSON error message" } }) === "JSON error message", "extractErrorMessage handles JSON message property");
  assert(extractErrorMessage({ data: { error: "JSON error property" } }) === "JSON error property", "extractErrorMessage handles JSON error property");
  assert(extractErrorMessage(null, "Default fallback") === "Default fallback", "extractErrorMessage handles null response with fallback");

  console.log("\n===============================================================");
  console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("===============================================================");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runDrill();
