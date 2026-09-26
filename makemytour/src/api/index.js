import axios from "axios";

const BACKEND_URL = "http://localhost:8081";

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  validateStatus: (status) => status >= 200 && status < 600,
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

export const getflight = async () => {
  try {
    const res = await apiClient.get(`/flight`);
    if (res.status === 200 && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (error) {
    console.error("Get flight list failed:", error);
    return [];
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

export const gethotel = async () => {
  try {
    const res = await apiClient.get(`/hotel`);
    if (res.status === 200 && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (error) {
    console.error("Get hotel list failed:", error);
    return [];
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

export const handleflightbooking = async (userId, flightId, seats, price) => {
  try {
    const url = `/booking/flight?userId=${encodeURIComponent(userId)}&flightId=${encodeURIComponent(flightId)}&seats=${seats}&price=${price}`;
    const res = await apiClient.post(url);
    return res.data;
  } catch (error) {
    console.error("Flight booking failed:", error);
    throw error;
  }
};

export const handlehotelbooking = async (userId, hotelId, rooms, price) => {
  try {
    const url = `/booking/hotel?userId=${encodeURIComponent(userId)}&hotelId=${encodeURIComponent(hotelId)}&rooms=${rooms}&price=${price}`;
    const res = await apiClient.post(url);
    return res.data;
  } catch (error) {
    console.error("Hotel booking failed:", error);
    throw error;
  }
};

/* --- TASK 1: LIVE FLIGHT STATUS API METHODS --- */

export const getFlightStatuses = async (query = "", status = "ALL") => {
  try {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (status && status !== "ALL") params.append("status", status);

    const res = await apiClient.get(`/api/flight-status?${params.toString()}`);
    if (res.status === 200 && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch flight statuses:", error);
    return [];
  }
};

export const getFlightStatusByNumber = async (flightNumber) => {
  try {
    const res = await apiClient.get(`/api/flight-status/${encodeURIComponent(flightNumber)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to fetch flight status for ${flightNumber}:`, error);
    return null;
  }
};

export const getTrackedFlights = async (flightNumbers = []) => {
  try {
    const res = await apiClient.post(`/api/flight-status/tracked`, flightNumbers);
    if (res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Failed to fetch tracked flights:", error);
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

/* --- DYNAMIC PRICING ENGINE & E-CART OFFERS API METHODS --- */

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
    return res.data;
  } catch (error) {
    console.error("Failed to apply coupon:", error);
    throw error;
  }
};

export const getAppNotifications = async (userId = "") => {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    const res = await apiClient.get(`/api/notifications?${params.toString()}`);
    if (res.status === 200 && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Failed to fetch app notifications:", error);
    return [];
  }
};

export const deleteAppNotification = async (id) => {
  try {
    const res = await apiClient.delete(`/api/notifications/${encodeURIComponent(id)}`);
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.error(`Failed to delete notification ${id}:`, error);
    return null;
  }
};


