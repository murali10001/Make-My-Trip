import axios from "axios";

const BACKEND_URL = "http://localhost:8081";

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  validateStatus: (status) => status >= 200 && status < 300,
});

export const login = async (email, password) => {
  try {
    const url = `/user/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const res = await apiClient.post(url);
    if (res.status === 200) return res.data;
    const errorMsg = typeof res.data === "string" ? res.data : (res.data?.message || res.data?.error || "Invalid email or password");
    throw new Error(errorMsg);
  } catch (error) {
    console.error("Login failed:", error);
    if (error.response && error.response.data) {
      const msg = typeof error.response.data === "string" ? error.response.data : (error.response.data.message || error.response.data.error || "Invalid email or password");
      throw new Error(msg);
    }
    throw error;
  }
};

export const signup = async (
  firstName,
  lastName,
  email,
  phoneNumber,
  password
) => {
  try {
    const res = await apiClient.post(`/user/signup`, {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
    });
    if (res.status === 200) return res.data;
    const errorMsg = typeof res.data === "string" ? res.data : (res.data?.message || res.data?.error || "Signup failed");
    throw new Error(errorMsg);
  } catch (error) {
    console.error("Signup failed:", error);
    if (error.response && error.response.data) {
      const msg = typeof error.response.data === "string" ? error.response.data : (error.response.data.message || error.response.data.error || "Signup failed");
      throw new Error(msg);
    }
    throw error;
  }
};

export const getuserbyemail = async (email) => {
  try {
    const res = await apiClient.get(`/user/email?email=${encodeURIComponent(email)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error("Get user by email failed:", error);
    return null;
  }
};

export const editprofile = async (
  id,
  firstName,
  lastName,
  email,
  phoneNumber
) => {
  try {
    const res = await apiClient.post(`/user/edit?id=${encodeURIComponent(id)}`, {
      firstName,
      lastName,
      email,
      phoneNumber,
    });
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error("Edit profile failed:", error);
    return null;
  }
};

export const getflight = async (from = "", to = "") => {
  try {
    const params = new URLSearchParams();
    if (from && typeof from === "string" && from.trim()) params.append("from", from.trim());
    if (to && typeof to === "string" && to.trim()) params.append("to", to.trim());
    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.get(`/flight${queryStr}`);
    if (res.status === 200 && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (error) {
    console.error("Get flight list failed:", error);
    return [];
  }
};

export const getflightbyid = async (id) => {
  try {
    const res = await apiClient.get(`/flight/${encodeURIComponent(id)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Get flight by id failed for ${id}:`, error);
    return null;
  }
};

export const addflight = async (...args) => {
  try {
    const flightData = args[0];
    const payload = typeof flightData === "object" && flightData !== null ? flightData : {
      flightName: args[0],
      from: args[1],
      to: args[2],
      departureTime: args[3],
      arrivalTime: args[4],
      price: args[5],
      availableSeats: args[6],
    };
    const res = await apiClient.post(`/admin/flight`, payload);
    return res.data;
  } catch (error) {
    console.error("Add flight failed:", error);
    throw error;
  }
};

export const editflight = async (...args) => {
  try {
    const id = args[0];
    const flightData = args[1];
    const payload = typeof flightData === "object" && flightData !== null ? flightData : {
      flightName: args[1],
      from: args[2],
      to: args[3],
      departureTime: args[4],
      arrivalTime: args[5],
      price: args[6],
      availableSeats: args[7],
    };
    const res = await apiClient.put(`/admin/flight/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("Edit flight failed:", error);
    throw error;
  }
};

export const gethotel = async (location = "", query = "") => {
  try {
    const params = new URLSearchParams();
    if (location && typeof location === "string" && location.trim()) params.append("location", location.trim());
    if (query && typeof query === "string" && query.trim()) params.append("query", query.trim());
    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.get(`/hotel${queryStr}`);
    if (res.status === 200 && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (error) {
    console.error("Get hotel list failed:", error);
    return [];
  }
};

export const gethotelbyid = async (id) => {
  try {
    const res = await apiClient.get(`/hotel/${encodeURIComponent(id)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Get hotel by id failed for ${id}:`, error);
    return null;
  }
};

export const getHomeContent = async () => {
  try {
    const res = await apiClient.get(`/api/home-content`);
    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.error("Get home content failed:", error);
    return null;
  }
};

export const addhotel = async (...args) => {
  try {
    const hotelData = args[0];
    const payload = typeof hotelData === "object" && hotelData !== null ? hotelData : {
      hotelName: args[0],
      location: args[1],
      pricePerNight: args[2],
      availableRooms: args[3],
      amenities: args[4],
    };
    const res = await apiClient.post(`/admin/hotel`, payload);
    return res.data;
  } catch (error) {
    console.error("Add hotel failed:", error);
    throw error;
  }
};

export const edithotel = async (...args) => {
  try {
    const id = args[0];
    const hotelData = args[1];
    const payload = typeof hotelData === "object" && hotelData !== null ? hotelData : {
      hotelName: args[1],
      location: args[2],
      pricePerNight: args[3],
      availableRooms: args[4],
      amenities: args[5],
    };
    const res = await apiClient.put(`/admin/hotel/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("Edit hotel failed:", error);
    throw error;
  }
};

export const handleflightbooking = async (userId, flightId, seats, price, freezeId = "") => {
  try {
    const freezeParam = freezeId ? `&freezeId=${encodeURIComponent(freezeId)}` : "";
    const url = `/booking/flight?userId=${encodeURIComponent(userId)}&flightId=${encodeURIComponent(flightId)}&seats=${seats}&price=${price}${freezeParam}`;
    const res = await apiClient.post(url);
    return res.data;
  } catch (error) {
    console.error("Flight booking failed:", error);
    throw error;
  }
};

export const handlehotelbooking = async (userId, hotelId, rooms, price, freezeId = "") => {
  try {
    const freezeParam = freezeId ? `&freezeId=${encodeURIComponent(freezeId)}` : "";
    const url = `/booking/hotel?userId=${encodeURIComponent(userId)}&hotelId=${encodeURIComponent(hotelId)}&rooms=${rooms}&price=${price}${freezeParam}`;
    const res = await apiClient.post(url);
    return res.data;
  } catch (error) {
    console.error("Hotel booking failed:", error);
    throw error;
  }
};

export const getFlightStatuses = async (query = "", status = "ALL") => {
  try {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (status && status !== "ALL") params.append("status", status);

    const res = await apiClient.get(`/api/flight-status?${params.toString()}`);
    if (res && res.status === 200 && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const getFlightStatusByNumber = async (flightNumber) => {
  try {
    const res = await apiClient.get(`/api/flight-status/${encodeURIComponent(flightNumber)}`);
    if (res && res.status === 200) return res.data;
    return null;
  } catch (error) {
    return null;
  }
};

export const getTrackedFlights = async (flightNumbers = []) => {
  try {
    const res = await apiClient.post(`/api/flight-status/tracked`, flightNumbers);
    if (res && res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    return [];
  }
};

export const simulateFlightUpdate = async (payload = {}) => {
  try {
    const res = await apiClient.post(`/api/flight-status/simulate`, payload);
    return res.data;
  } catch (error) {
    console.error("Failed to simulate flight update:", error);
    throw error;
  }
};

export const triggerRandomFlightSimulation = async () => {
  try {
    const res = await apiClient.get(`/api/flight-status/simulate-random`);
    return res.data;
  } catch (error) {
    console.error("Failed to trigger random flight simulation:", error);
    throw error;
  }
};

export const sendFlightEmailNotification = async (flightNumber, email) => {
  try {
    const res = await apiClient.post(`/api/flight-status/notify-email`, {
      flightNumber,
      email,
    });
    return res.data;
  } catch (error) {
    console.error("Failed to send flight email notification:", error);
    throw error;
  }
};

export const getDynamicPricing = async (
  itemId = "FL-101",
  itemType = "FLIGHT",
  basePrice = 5500,
  demand = "HIGH",
  season = "HOLIDAY_PEAK"
) => {
  try {
    const params = new URLSearchParams({
      itemId,
      itemType,
      basePrice: basePrice.toString(),
      demand,
      season,
    });
    const res = await apiClient.get(`/api/pricing/calculate?${params.toString()}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error("Failed to fetch dynamic price:", error);
    return null;
  }
};

export const freezePrice = async (itemId, itemTitle, currentPrice, hours = 24, userId = "") => {
  try {
    const res = await apiClient.post(`/api/pricing/freeze`, {
      itemId,
      itemTitle,
      currentPrice,
      hours,
      userId,
    });
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error("Failed to freeze price:", error);
    throw error;
  }
};

export const getFreezeStatus = async (freezeId) => {
  try {
    const res = await apiClient.get(`/api/pricing/freeze/${encodeURIComponent(freezeId)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to fetch freeze status for ${freezeId}:`, error);
    return null;
  }
};

export const getUserPriceFreezes = async (userId = "") => {
  try {
    const res = await apiClient.get(`/api/pricing/user-freezes?userId=${encodeURIComponent(userId)}`);
    if (res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Failed to fetch user price freezes:", error);
    return [];
  }
};

export const removePriceFreeze = async (freezeId) => {
  try {
    const res = await apiClient.delete(`/api/pricing/freeze/${encodeURIComponent(freezeId)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to delete price freeze ${freezeId}:`, error);
    return null;
  }
};

export const getPromotionalOffers = async () => {
  try {
    const res = await apiClient.get(`/api/pricing/offers`);
    if (res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Failed to fetch promotional offers:", error);
    return [];
  }
};

export const applyCouponCode = async (code, amount = 5500) => {
  try {
    const res = await apiClient.post(`/api/pricing/apply-coupon`, {
      code,
      amount,
    });
    if (res && res.data) {
      return res.data;
    }
    return {
      success: false,
      code,
      discountAmount: 0,
      finalAmount: amount,
      message: "Unable to apply coupon code.",
    };
  } catch (error) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Invalid or ineligible coupon code for this booking.";
    return {
      success: false,
      code,
      discountAmount: 0,
      finalAmount: amount,
      message: errorMsg,
    };
  }
};

export const getAppNotifications = async (userId = "") => {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    const res = await apiClient.get(`/api/notifications?${params.toString()}`);
    if (res && res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    return [];
  }
};

export const deleteAppNotification = async (id, userId = "") => {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.delete(`/api/notifications/${encodeURIComponent(id)}${query}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to delete notification ${id}:`, error);
    return null;
  }
};

export const calculateRefundPreview = async (userId, bookingId) => {
  try {
    const res = await apiClient.get(`/refund/calculate?userId=${encodeURIComponent(userId)}&bookingId=${encodeURIComponent(bookingId)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error("Failed to calculate refund preview:", error);
    throw error;
  }
};

export const submitCancellationAndRefund = async (userId, bookingId, reason, comment = "") => {
  try {
    const params = new URLSearchParams();
    params.append("userId", userId);
    params.append("bookingId", bookingId);
    params.append("reason", reason);
    if (comment) params.append("comment", comment);

    const res = await apiClient.post(`/refund/cancel-and-request?${params.toString()}`);
    if (res.status === 200) return res.data;
    const errorMsg = typeof res.data === "string" ? res.data : (res.data?.message || res.data?.error || "Cancellation failed");
    throw new Error(errorMsg);
  } catch (error) {
    console.error("Failed to submit cancellation & refund:", error);
    if (error.response && error.response.data) {
      const msg = typeof error.response.data === "string" ? error.response.data : (error.response.data.message || error.response.data.error || "Cancellation failed");
      throw new Error(msg);
    }
    throw error;
  }
};

export const getUserRefunds = async (userId) => {
  try {
    const res = await apiClient.get(`/refund/user/${encodeURIComponent(userId)}`);
    if (res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Failed to fetch user refunds:", error);
    return [];
  }
};

export const getRefundStatus = async (refundId) => {
  try {
    const res = await apiClient.get(`/refund/status/${encodeURIComponent(refundId)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to fetch refund status for ${refundId}:`, error);
    return null;
  }
};

export const getSeatMap = async (flightId) => {
  try {
    const res = await apiClient.get(`/api/selection/seatmap/${encodeURIComponent(flightId)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to fetch seat map for flight ${flightId}:`, error);
    return null;
  }
};

export const reserveSeat = async (flightId, seatNo, userId = "") => {
  try {
    const params = new URLSearchParams();
    params.append("flightId", flightId);
    params.append("seatNo", seatNo);
    if (userId) params.append("userId", userId);

    const res = await apiClient.post(`/api/selection/reserve-seat?${params.toString()}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to reserve seat ${seatNo}:`, error);
    throw error;
  }
};

export const getHotelRoomOptions = async (hotelId) => {
  try {
    const res = await apiClient.get(`/api/selection/hotel-rooms/${encodeURIComponent(hotelId)}`);
    if (res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error(`Failed to fetch hotel rooms for ${hotelId}:`, error);
    return [];
  }
};

export const saveUserPreferences = async (preferences) => {
  try {
    const res = await apiClient.post(`/api/selection/preferences`, preferences);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error("Failed to save user preferences:", error);
    throw error;
  }
};

export const getUserPreferences = async (userId) => {
  try {
    const res = await apiClient.get(`/api/selection/preferences/${encodeURIComponent(userId)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to fetch user preferences for ${userId}:`, error);
    return null;
  }
};

export const getReviews = async (targetId, targetType = "HOTEL", sort = "helpful", minRating = 0, withPhotosOnly = false) => {
  try {
    const params = new URLSearchParams();
    params.append("targetId", targetId);
    params.append("targetType", targetType);
    if (sort) params.append("sort", sort);
    if (minRating > 0) params.append("minRating", minRating);
    if (withPhotosOnly) params.append("withPhotosOnly", "true");

    const res = await apiClient.get(`/api/reviews?${params.toString()}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return null;
  }
};

export const createReview = async (reviewData) => {
  try {
    const res = await apiClient.post("/api/reviews", reviewData);
    if (res.status === 200) return res.data;
    throw new Error(res.data?.message || "Failed to create review");
  } catch (error) {
    console.error("Failed to post review:", error);
    throw error;
  }
};

export const addReviewReply = async (reviewId, replyData) => {
  try {
    const res = await apiClient.post(`/api/reviews/${encodeURIComponent(reviewId)}/reply`, replyData);
    if (res.status === 200) return res.data;
    throw new Error(res.data?.message || "Failed to add reply");
  } catch (error) {
    console.error("Failed to add reply:", error);
    throw error;
  }
};

export const toggleReviewHelpful = async (reviewId, userId = "") => {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    const res = await apiClient.post(`/api/reviews/${encodeURIComponent(reviewId)}/helpful?${params.toString()}`);
    if (res.status === 200) return res.data;
    throw new Error(res.data?.message || "Failed to toggle helpful vote");
  } catch (error) {
    console.error("Failed to toggle helpful vote:", error);
    throw error;
  }
};

export const flagReview = async (reviewId, userId = "", reason = "Inappropriate content") => {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    params.append("reason", reason);
    const res = await apiClient.post(`/api/reviews/${encodeURIComponent(reviewId)}/flag?${params.toString()}`);
    if (res.status === 200) return res.data;
    throw new Error(res.data?.message || "Failed to flag review");
  } catch (error) {
    console.error("Failed to flag review:", error);
    throw error;
  }
};

export const getFlaggedReviews = async () => {
  try {
    const res = await apiClient.get("/api/reviews/moderation/flagged");
    if (res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Failed to fetch flagged reviews for moderation:", error);
    return [];
  }
};

export const moderateReview = async (reviewId, action) => {
  try {
    const params = new URLSearchParams();
    params.append("action", action);
    const res = await apiClient.post(`/api/reviews/moderation/${encodeURIComponent(reviewId)}/action?${params.toString()}`);
    if (res.status === 200) return res.data;
    throw new Error(res.data?.message || "Failed to execute moderation action");
  } catch (error) {
    console.error("Failed to moderate review:", error);
    throw error;
  }
};

export const getRecommendations = async (userId = "", category = "ALL") => {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (category) params.append("category", category);
    const res = await apiClient.get(`/api/recommendations?${params.toString()}`);
    if (res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Failed to fetch personalized recommendations:", error);
    return [];
  }
};

export const submitRecommendationFeedback = async (recommendationId, userId = "", feedbackType = "HELPFUL", notes = "") => {
  try {
    const res = await apiClient.post(`/api/recommendations/${encodeURIComponent(recommendationId)}/feedback`, {
      userId,
      feedbackType,
      notes,
    });
    if (res.status === 200) return res.data;
    throw new Error(res.data?.message || "Failed to submit recommendation feedback");
  } catch (error) {
    console.error("Failed to submit recommendation feedback:", error);
    throw error;
  }
};

export const seedRecommendations = async () => {
  try {
    const res = await apiClient.post("/api/recommendations/seed");
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error("Failed to seed recommendations:", error);
    return null;
  }
};

