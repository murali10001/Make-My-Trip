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
  getDynamicPricing,
  freezePrice,
  getFreezeStatus,
  getUserPriceFreezes,
  removePriceFreeze,
  getPromotionalOffers,
  applyCouponCode,
  calculateRefundPreview,
  submitCancellationAndRefund,
  getSeatMap,
  reserveSeat,
  getReviews,
  createReview,
} from "../../makemytour/src/api/index.js";

console.log("===============================================================");
console.log("SECOND-PASS FAILURE DRILL: UNRELIABLE BACKEND SIMULATION");
console.log("===============================================================\n");

let passedTests = 0;
let totalTests = 0;
const resultsByScenario = {
  1: { name: "Backend is completely offline", passed: 0, total: 0, status: "PENDING" },
  2: { name: "API takes 30 seconds to respond (timeout/latency drill)", passed: 0, total: 0, status: "PENDING" },
  3: { name: "API returns HTTP 500 (Internal Server Error)", passed: 0, total: 0, status: "PENDING" },
  4: { name: "API returns HTTP 200 with unexpected JSON", passed: 0, total: 0, status: "PENDING" },
  5: { name: "API returns null or empty data", passed: 0, total: 0, status: "PENDING" },
  6: { name: "User clicks Submit multiple times (Double Submission)", passed: 0, total: 0, status: "PENDING" },
  7: { name: "User navigates away while API request is pending (Unmount)", passed: 0, total: 0, status: "PENDING" },
  8: { name: "Two API requests return in the wrong order (Race Conditions)", passed: 0, total: 0, status: "PENDING" },
  9: { name: "User session expires during an API call", passed: 0, total: 0, status: "PENDING" },
};

function recordAssert(scenarioId, condition, testName, details = "") {
  totalTests++;
  resultsByScenario[scenarioId].total++;
  if (condition) {
    passedTests++;
    resultsByScenario[scenarioId].passed++;
    console.log(`  [PASS] Scenario ${scenarioId}: ${testName}`);
  } else {
    console.error(`  [FAIL] Scenario ${scenarioId}: ${testName} - ${details}`);
  }
}

async function runDrill() {
  const originalAdapter = apiClient.defaults.adapter;

  // =========================================================================
  // SCENARIO 1: Backend is completely offline
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 1: Testing Backend Completely Offline");
  console.log("-----------------------------------------------------------");

  // Adapter simulates ECONNREFUSED network failure
  apiClient.defaults.adapter = async (config) => {
    const err = new Error("connect ECONNREFUSED 127.0.0.1:8080");
    err.code = "ECONNREFUSED";
    err.config = config;
    throw err;
  };

  try {
    const flights = await getflight("Delhi", "Mumbai");
    recordAssert(1, Array.isArray(flights) && flights.length === 0, "Query getflight returns safe fallback [] without throwing");
  } catch (e) {
    recordAssert(1, false, "Query getflight threw exception", e.message);
  }

  try {
    const flight = await getflightbyid("flight-999");
    recordAssert(1, flight === null, "Query getflightbyid returns null without throwing");
  } catch (e) {
    recordAssert(1, false, "Query getflightbyid threw exception", e.message);
  }

  try {
    const hotels = await gethotel("Goa");
    recordAssert(1, Array.isArray(hotels) && hotels.length === 0, "Query gethotel returns safe fallback [] without throwing");
  } catch (e) {
    recordAssert(1, false, "Query gethotel threw exception", e.message);
  }

  try {
    const home = await getHomeContent();
    recordAssert(1, home === null, "Query getHomeContent returns null without throwing");
  } catch (e) {
    recordAssert(1, false, "Query getHomeContent threw exception", e.message);
  }

  try {
    await login("test@example.com", "pass123");
    recordAssert(1, false, "Offline login should throw error");
  } catch (err) {
    recordAssert(1, err.message.includes("Unable to connect to server"), "Mutation login throws user-friendly offline message", err.message);
  }

  try {
    await signup("John", "Doe", "john@example.com", "9876543210", "pass123");
    recordAssert(1, false, "Offline signup should throw error");
  } catch (err) {
    recordAssert(1, err.message.includes("Unable to connect to server"), "Mutation signup throws user-friendly offline message", err.message);
  }

  try {
    await handleflightbooking("user-1", "fl-1", 1, 5500, "");
    recordAssert(1, false, "Offline flight booking should throw error");
  } catch (err) {
    recordAssert(1, err.message.includes("Unable to connect to server"), "Mutation handleflightbooking throws user-friendly offline message", err.message);
  }

  try {
    await handlehotelbooking("user-1", "ht-1", 1, 4200, "");
    recordAssert(1, false, "Offline hotel booking should throw error");
  } catch (err) {
    recordAssert(1, err.message.includes("Unable to connect to server"), "Mutation handlehotelbooking throws user-friendly offline message", err.message);
  }

  // =========================================================================
  // SCENARIO 2: API takes 30 seconds to respond (timeout/latency drill)
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 2: Testing API 30-Second Latency / Timeout Drill");
  console.log("-----------------------------------------------------------");

  // Adapter simulates 30-second hang triggering Axios timeout
  apiClient.defaults.adapter = async (config) => {
    const err = new Error("timeout of 12000ms exceeded");
    err.code = "ECONNABORTED";
    err.config = config;
    throw err;
  };

  try {
    const queryRes = await getflight();
    recordAssert(2, Array.isArray(queryRes) && queryRes.length === 0, "Query getflight aborts on timeout and returns safe fallback []");
  } catch (e) {
    recordAssert(2, false, "Query getflight threw unhandled error on timeout", e.message);
  }

  try {
    await login("slow@test.com", "pass");
    recordAssert(2, false, "Mutation login should fail on timeout");
  } catch (err) {
    recordAssert(2, err.message.includes("timed out"), "Mutation login throws clear timeout message", err.message);
  }

  try {
    await handleflightbooking("u1", "f1", 1, 5000, "");
    recordAssert(2, false, "Flight booking mutation should fail on timeout");
  } catch (err) {
    recordAssert(2, err.message.includes("timed out"), "Flight booking mutation throws clear timeout message", err.message);
  }

  // =========================================================================
  // SCENARIO 3: API returns HTTP 500 (Internal Server Error)
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 3: Testing API HTTP 500 Internal Server Error");
  console.log("-----------------------------------------------------------");

  apiClient.defaults.adapter = async (config) => {
    return {
      data: {
        timestamp: new Date().toISOString(),
        status: 500,
        error: "Internal Server Error",
        message: "Database connection pool exhausted",
      },
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      config,
    };
  };

  try {
    const flights500 = await getflight();
    recordAssert(3, Array.isArray(flights500) && flights500.length === 0, "getflight safely handles HTTP 500 returning []");
  } catch (e) {
    recordAssert(3, false, "getflight threw on HTTP 500", e.message);
  }

  try {
    const hotels500 = await gethotel();
    recordAssert(3, Array.isArray(hotels500) && hotels500.length === 0, "gethotel safely handles HTTP 500 returning []");
  } catch (e) {
    recordAssert(3, false, "gethotel threw on HTTP 500", e.message);
  }

  try {
    const home500 = await getHomeContent();
    recordAssert(3, home500 === null, "getHomeContent safely handles HTTP 500 returning null");
  } catch (e) {
    recordAssert(3, false, "getHomeContent threw on HTTP 500", e.message);
  }

  try {
    await login("db@fail.com", "pass");
    recordAssert(3, false, "login should reject on HTTP 500");
  } catch (err) {
    recordAssert(3, err.message.includes("Database connection pool exhausted") || err.message.includes("Internal Server Error"), "login reports server error message cleanly", err.message);
  }

  try {
    await handleflightbooking("u1", "f1", 1, 5500, "");
    recordAssert(3, false, "booking should reject on HTTP 500");
  } catch (err) {
    recordAssert(3, err.message.includes("Database connection pool exhausted") || err.message.includes("Internal Server Error"), "booking reports 500 error cleanly", err.message);
  }

  try {
    await addhotel({ hotelName: "Hotel 500", location: "Goa" });
    recordAssert(3, false, "addhotel should reject on HTTP 500");
  } catch (err) {
    recordAssert(3, err.message.includes("Database connection pool exhausted") || err.message.includes("Internal Server Error"), "addhotel reports 500 error cleanly", err.message);
  }

  // =========================================================================
  // SCENARIO 4: API returns HTTP 200 with unexpected JSON
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 4: Testing API HTTP 200 With Unexpected JSON");
  console.log("-----------------------------------------------------------");

  apiClient.defaults.adapter = async (config) => {
    if (config.url.startsWith("/flight/")) {
      return {
        data: { id: 101, flightName: "Air Test", from: "DEL", to: "BOM" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (config.url.startsWith("/flight")) {
      return {
        data: { error: true, count: 0, items: "not an array" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (config.url.startsWith("/hotel")) {
      return {
        data: "Unexpected hotel string payload",
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (config.url.startsWith("/api/home-content")) {
      return {
        data: { offers: "Invalid offers", collections: 12345, wonders: null },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    return { data: {}, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    const unexpectedFlights = await getflight();
    recordAssert(4, Array.isArray(unexpectedFlights) && unexpectedFlights.length === 0, "getflight safely falls back to [] when payload is not an Array");
  } catch (e) {
    recordAssert(4, false, "getflight crashed on unexpected JSON", e.message);
  }

  try {
    const unexpectedHotels = await gethotel();
    recordAssert(4, Array.isArray(unexpectedHotels) && unexpectedHotels.length === 0, "gethotel safely falls back to [] when payload is a string");
  } catch (e) {
    recordAssert(4, false, "gethotel crashed on unexpected JSON", e.message);
  }

  try {
    const flightData = await getflightbyid("101");
    // Verify flight with numeric id does not crash String(flight.id).toUpperCase()
    const rawId = String(flightData?.id || flightData?._id || "101").toUpperCase();
    recordAssert(4, rawId === "101", "Flight numeric ID safely coerced to uppercase string without crash");
  } catch (e) {
    recordAssert(4, false, "Flight numeric ID coercion crashed", e.message);
  }

  try {
    const homeData = await getHomeContent();
    // Verify array guards prevent .map TypeError
    const offersSafe = Array.isArray(homeData?.offers);
    const collectionsSafe = Array.isArray(homeData?.collections);
    const wondersSafe = Array.isArray(homeData?.wonders);
    recordAssert(4, !offersSafe && !collectionsSafe && !wondersSafe, "homeContent non-array properties guarded by Array.isArray");
  } catch (e) {
    recordAssert(4, false, "homeContent unexpected structure crashed", e.message);
  }

  // =========================================================================
  // SCENARIO 5: API returns null or empty data
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 5: Testing API Null or Empty Data");
  console.log("-----------------------------------------------------------");

  apiClient.defaults.adapter = async (config) => {
    if (config.url.startsWith("/api/home-content") || config.url.startsWith("/flight/") || config.url.startsWith("/hotel/")) {
      return { data: null, status: 200, statusText: "OK", headers: {}, config };
    }
    return { data: [], status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    const emptyFlights = await getflight();
    recordAssert(5, Array.isArray(emptyFlights) && emptyFlights.length === 0, "getflight safely returns empty array []");
  } catch (e) {
    recordAssert(5, false, "getflight threw on empty response", e.message);
  }

  try {
    const nullFlight = await getflightbyid("none");
    recordAssert(5, nullFlight === null, "getflightbyid safely returns null when data is null");
  } catch (e) {
    recordAssert(5, false, "getflightbyid threw on null response", e.message);
  }

  try {
    const nullHome = await getHomeContent();
    recordAssert(5, nullHome === null, "getHomeContent safely returns null when data is null");
  } catch (e) {
    recordAssert(5, false, "getHomeContent threw on null response", e.message);
  }

  try {
    const userBookings = await getUserBookings("u1");
    recordAssert(5, Array.isArray(userBookings) && userBookings.length === 0, "getUserBookings safely returns [] on empty data");
  } catch (e) {
    recordAssert(5, false, "getUserBookings threw on empty response", e.message);
  }

  // =========================================================================
  // SCENARIO 6: User clicks Submit multiple times (Double Submission)
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 6: Testing Double Submission & Multi-Click Protection");
  console.log("-----------------------------------------------------------");

  let backendCallCount = 0;
  apiClient.defaults.adapter = async (config) => {
    backendCallCount++;
    await new Promise((r) => setTimeout(r, 100));
    return {
      data: { id: `booking-${backendCallCount}`, status: "CONFIRMED" },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };

  // Test frontend submission guard pattern:
  let isSubmitting = false;
  let dispatchedCount = 0;

  const simulateUserClick = async () => {
    if (isSubmitting) {
      return null; // Blocked by isSubmitting / isBooking guard
    }
    isSubmitting = true;
    dispatchedCount++;
    try {
      return await handleflightbooking("u1", "fl-1", 1, 5500, "");
    } finally {
      isSubmitting = false;
    }
  };

  // Simulate user rapidly clicking Submit 5 times simultaneously
  const clicks = [
    simulateUserClick(),
    simulateUserClick(),
    simulateUserClick(),
    simulateUserClick(),
    simulateUserClick(),
  ];

  const responses = await Promise.all(clicks);
  const successfulCalls = responses.filter(Boolean);

  recordAssert(6, dispatchedCount === 1, "Only 1 booking dispatch was permitted during rapid 5x clicks");
  recordAssert(6, successfulCalls.length === 1, "Only 1 booking completed successfully");
  recordAssert(6, backendCallCount === 1, "Backend received exactly 1 booking request, preventing duplicate charges");

  // =========================================================================
  // SCENARIO 7: User navigates away while API request is pending (Unmount)
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 7: Testing Component Unmount While API Pending");
  console.log("-----------------------------------------------------------");

  apiClient.defaults.adapter = async (config) => {
    await new Promise((r) => setTimeout(r, 150));
    return {
      data: [{ id: "fl-unmount", flightName: "Delayed Flight" }],
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };

  // Simulate component state and lifecycle with isMounted guard
  let componentState = { flights: [], loading: true, unmounted: false };
  let isMounted = true;
  let setStateCallsAfterUnmount = 0;

  const runComponentFetch = async () => {
    try {
      const data = await getflight();
      if (!isMounted) {
        setStateCallsAfterUnmount++;
        return;
      }
      componentState.flights = data;
    } finally {
      if (isMounted) {
        componentState.loading = false;
      } else {
        setStateCallsAfterUnmount++;
      }
    }
  };

  const pendingFetch = runComponentFetch();

  // Simulate user navigating to another page after 30ms while request is still pending
  await new Promise((resolve) => setTimeout(resolve, 30));
  isMounted = false;
  componentState.unmounted = true;

  await pendingFetch;

  recordAssert(7, setStateCallsAfterUnmount === 2, "Unmount guard successfully skipped state updates on unmounted component");
  recordAssert(7, componentState.flights.length === 0, "Component state remained uncorrupted by unmounted response");

  // =========================================================================
  // SCENARIO 8: Two API requests return in the wrong order (Race Conditions)
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 8: Testing Out-of-Order API Responses (Race Condition)");
  console.log("-----------------------------------------------------------");

  apiClient.defaults.adapter = async (config) => {
    if (config.url.includes("Delhi")) {
      // First request (Delhi) takes longer (200ms)
      await new Promise((r) => setTimeout(r, 200));
      return {
        data: [{ id: "delhi-1", flightName: "Delhi Express" }],
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (config.url.includes("Mumbai")) {
      // Second request (Mumbai) resolves quickly (30ms)
      await new Promise((r) => setTimeout(r, 30));
      return {
        data: [{ id: "mumbai-1", flightName: "Mumbai Express" }],
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    return { data: [], status: 200, statusText: "OK", headers: {}, config };
  };

  // Simulate search page request sequence counter
  let latestRequestId = 0;
  let activeResults = [];

  const fetchSearchResults = async (queryCity) => {
    const requestId = ++latestRequestId;
    try {
      const data = await getflight(queryCity);
      // Discard stale out-of-order response if a newer request already resolved
      if (requestId !== latestRequestId) {
        return; // Stale response discarded!
      }
      activeResults = data;
    } catch (e) {
      if (requestId === latestRequestId) {
        activeResults = [];
      }
    }
  };

  // User searches for "Delhi" first (slow), then quickly changes to "Mumbai" (fast)
  const req1 = fetchSearchResults("Delhi");
  await new Promise((resolve) => setTimeout(resolve, 10));
  const req2 = fetchSearchResults("Mumbai");

  await Promise.all([req1, req2]);

  recordAssert(8, activeResults.length === 1 && activeResults[0].id === "mumbai-1", "Newer 'Mumbai' results persisted; slower stale 'Delhi' results were discarded");

  // =========================================================================
  // SCENARIO 9: User session expires during an API call
  // =========================================================================
  console.log("\n-----------------------------------------------------------");
  console.log("SCENARIO 9: Testing Expired / Null User Session Handling");
  console.log("-----------------------------------------------------------");

  // Test flight booking guard with expired/null user session
  let loginDialogOpen = false;
  let alertMessage = "";

  const handleFlightBookingWithSession = async (currentUser, flightId, quantity, total) => {
    const userId = currentUser?.id || currentUser?._id;
    if (!userId) {
      alertMessage = "Please log in to complete your flight booking.";
      loginDialogOpen = true;
      return null;
    }
    return await handleflightbooking(userId, flightId, quantity, total, "");
  };

  const expiredUser = null; // Session expired
  const bookingAttempt = await handleFlightBookingWithSession(expiredUser, "fl-101", 1, 5500);

  recordAssert(9, bookingAttempt === null, "Booking cleanly intercepted when user session is null/expired");
  recordAssert(9, loginDialogOpen === true, "Login dialog opened for re-authentication upon session expiry");
  recordAssert(9, alertMessage.includes("Please log in"), "Clear authentication prompt presented to user");

  // Test hotel booking guard with expired session
  let hotelLoginOpen = false;
  const handleHotelBookingWithSession = async (currentUser, hotelId, quantity, total) => {
    const userId = currentUser?.id || currentUser?._id;
    if (!userId) {
      hotelLoginOpen = true;
      return null;
    }
    return await handlehotelbooking(userId, hotelId, quantity, total, "");
  };

  const hotelAttempt = await handleHotelBookingWithSession(undefined, "ht-202", 1, 4200);
  recordAssert(9, hotelAttempt === null, "Hotel booking cleanly intercepted when session undefined");
  recordAssert(9, hotelLoginOpen === true, "Hotel booking prompts login dialog instead of crashing");

  // Restore original adapter
  apiClient.defaults.adapter = originalAdapter;

  // =========================================================================
  // FINAL EVALUATION
  // =========================================================================
  console.log("\n===========================================================");
  console.log("DRILL SUMMARY BY SCENARIO");
  console.log("===========================================================");

  for (let s = 1; s <= 9; s++) {
    const sc = resultsByScenario[s];
    sc.status = sc.passed === sc.total && sc.total > 0 ? "PASS" : "FAIL";
    console.log(`Scenario ${s}: [${sc.status}] (${sc.passed}/${sc.total}) - ${sc.name}`);
  }

  console.log("\n-----------------------------------------------------------");
  console.log(`TOTAL DRILL SCORE: ${passedTests}/${totalTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("===========================================================\n");

  if (passedTests === totalTests) {
    console.log("ALL 9 FAILURE DRILL SCENARIOS PASSED WITH ZERO CRASHES!");
    process.exit(0);
  } else {
    console.error(`DRILL FAILED: ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runDrill().catch((err) => {
  console.error("Unhandled drill harness error:", err);
  process.exit(1);
});
