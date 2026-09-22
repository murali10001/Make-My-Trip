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
    throw new Error(res.data?.message || "Login failed");
  } catch (error) {
    console.error("Login failed:", error);
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
    throw new Error(res.data?.message || "Signup failed");
  } catch (error) {
    console.error("Signup failed:", error);
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

export const addflight = async (flightData) => {
  try {
    const payload = typeof flightData === "object" ? flightData : {
      flightName: arguments[0],
      from: arguments[1],
      to: arguments[2],
      departureTime: arguments[3],
      arrivalTime: arguments[4],
      price: arguments[5],
      availableSeats: arguments[6],
    };
    const res = await apiClient.post(`/admin/flight`, payload);
    return res.data;
  } catch (error) {
    console.error("Add flight failed:", error);
    throw error;
  }
};

export const editflight = async (id, flightData) => {
  try {
    const payload = typeof flightData === "object" ? flightData : {
      flightName: arguments[1],
      from: arguments[2],
      to: arguments[3],
      departureTime: arguments[4],
      arrivalTime: arguments[5],
      price: arguments[6],
      availableSeats: arguments[7],
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

export const addhotel = async (hotelData) => {
  try {
    const payload = typeof hotelData === "object" ? hotelData : {
      hotelName: arguments[0],
      location: arguments[1],
      pricePerNight: arguments[2],
      availableRooms: arguments[3],
      amenities: arguments[4],
    };
    const res = await apiClient.post(`/admin/hotel`, payload);
    return res.data;
  } catch (error) {
    console.error("Add hotel failed:", error);
    throw error;
  }
};

export const edithotel = async (id, hotelData) => {
  try {
    const payload = typeof hotelData === "object" ? hotelData : {
      hotelName: arguments[1],
      location: arguments[2],
      pricePerNight: arguments[3],
      availableRooms: arguments[4],
      amenities: arguments[5],
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
