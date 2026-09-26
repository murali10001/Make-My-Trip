import React, { useState, useEffect, useRef } from "react";
import {
  getFlightStatuses,
  getTrackedFlights,
  simulateFlightUpdate,
  triggerRandomFlightSimulation,
  sendFlightEmailNotification,
} from "@/api";
import {
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle,
  Bell,
  Search,
  RefreshCw,
  MapPin,
  Bookmark,
  BookmarkCheck,
  Info,
  Radio,
  SlidersHorizontal,
  X,
  Sparkles,
  Mail,
  Send,
  Check,
  AlertCircle,
} from "lucide-react";
import Loader from "../Loader";
import { Button } from "../ui/button";

export interface FlightStatusItem {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  revisedDeparture: string;
  revisedArrival: string;
  status: "ON_TIME" | "DELAYED" | "BOARDING" | "IN_FLIGHT" | "LANDED" | "CANCELLED" | string;
  delayReason: string;
  gate: string;
  terminal: string;
  estimatedArrivalMinutes: number;
  lastUpdated: string;
}

export interface PushNotification {
  id: string;
  flightNumber: string;
  title: string;
  message: string;
  timestamp: string;
  type: "delay" | "boarding" | "gate" | "info" | "email";
}

const LiveFlightTracker: React.FC = () => {
  const [flights, setFlights] = useState<FlightStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  
  // Tracked flight numbers (Multi-flight tracking)
  const [trackedNumbers, setTrackedNumbers] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tracked_flights");
      if (saved) {
        try {
          setTrackedNumbers(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse tracked_flights from localStorage", e);
        }
      }
    }
  }, []);

  // Push notifications state
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightStatusItem | null>(null);
  const [simulationLoading, setSimulationLoading] = useState<boolean>(false);
  const [autoSimulate, setAutoSimulate] = useState<boolean>(false);
  const [testEmailInput, setTestEmailInput] = useState<string>("");
  const [emailSending, setEmailSending] = useState<boolean>(false);
  const [emailFeedback, setEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [webPushPermission, setWebPushPermission] = useState<string>("default");

  // Check initial Notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setWebPushPermission(Notification.permission);
    }
  }, []);

  const requestWebPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setWebPushPermission(perm);
        if (perm === "granted") {
          new window.Notification("🔔 Web Push Notifications Enabled!", {
            body: "You will now receive desktop and mobile status updates for tracked flights.",
          });
        }
      } catch (err) {
        console.error("Failed to request Web Push permission", err);
      }
    }
  };

  // Fetch flights
  const fetchFlights = async () => {
    try {
      const data = await getFlightStatuses(searchQuery, selectedStatus);
      setFlights(data || []);
    } catch (err) {
      console.error("Error fetching flight statuses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, [searchQuery, selectedStatus]);

  const trackedNumbersRef = useRef(trackedNumbers);
  useEffect(() => {
    trackedNumbersRef.current = trackedNumbers;
  }, [trackedNumbers]);

  // Server-Sent Events (SSE) Real-Time Flight Stream Listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    if (typeof window !== "undefined") {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
        eventSource = new EventSource(`${apiBase}/api/flight-status/stream`);

        eventSource.addEventListener("flight-update", (event: MessageEvent) => {
          try {
            const updatedFlight: FlightStatusItem = JSON.parse(event.data);
            if (updatedFlight) {
              fetchFlights();
              const isTracked = trackedNumbersRef.current.includes(updatedFlight.flightNumber);
              let notifType: "delay" | "boarding" | "gate" | "info" = "info";
              let title = `Radar SSE Update: ${updatedFlight.flightNumber}`;

              if (updatedFlight.status === "DELAYED") {
                notifType = "delay";
                title = `🚨 Live Delay Alert: ${updatedFlight.flightNumber}`;
              } else if (updatedFlight.status === "BOARDING") {
                notifType = "boarding";
                title = `✈️ Live Boarding Alert: ${updatedFlight.flightNumber}`;
              }

              addNotification({
                id: Date.now().toString(),
                flightNumber: updatedFlight.flightNumber,
                title: isTracked ? `[WATCHLIST STREAM] ${title}` : title,
                message: `${updatedFlight.airline} (${updatedFlight.origin} ➔ ${updatedFlight.destination}): ${updatedFlight.delayReason}`,
                timestamp: new Date().toLocaleTimeString(),
                type: notifType,
              });
            }
          } catch (e) {
            console.error("Failed to parse SSE payload", e);
          }
        });
      } catch (err) {
        console.error("Failed to initialize SSE EventSource", err);
      }
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Save tracked flights to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isMounted) {
      localStorage.setItem("tracked_flights", JSON.stringify(trackedNumbers));
    }
  }, [trackedNumbers, isMounted]);

  // Auto polling simulation if enabled
  useEffect(() => {
    let interval: any = null;
    if (autoSimulate) {
      interval = setInterval(async () => {
        await handleRandomSimulation(true);
      }, 7000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoSimulate, trackedNumbers]);

  // Toggle tracking a flight
  const toggleTrackFlight = (flightNumber: string) => {
    if (trackedNumbers.includes(flightNumber)) {
      setTrackedNumbers((prev) => prev.filter((num) => num !== flightNumber));
      addNotification({
        id: Date.now().toString(),
        flightNumber,
        title: "Flight Untracked",
        message: `Removed ${flightNumber} from your active tracking list.`,
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
      });
    } else {
      setTrackedNumbers((prev) => [...prev, flightNumber]);
      addNotification({
        id: Date.now().toString(),
        flightNumber,
        title: "Flight Tracked!",
        message: `You are now receiving live push updates for ${flightNumber}.`,
        timestamp: new Date().toLocaleTimeString(),
        type: "boarding",
      });
    }
  };

  // Add push notification (In-App Drawer + Native OS/Browser Web Push)
  const addNotification = (notif: PushNotification) => {
    setNotifications((prev) => [notif, ...prev.slice(0, 9)]);

    // Trigger Native OS/Browser Push Notification if permission granted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new window.Notification(notif.title, {
          body: notif.message,
          icon: "/favicon.ico",
        });
      } catch (e) {
        console.error("Error firing native push notification", e);
      }
    }
  };

  // Dismiss notification
  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Run random simulation
  const handleRandomSimulation = async (isBackground = false) => {
    if (!isBackground) setSimulationLoading(true);
    try {
      const updatedFlight: FlightStatusItem = await triggerRandomFlightSimulation();
      if (updatedFlight) {
        // Refresh list
        await fetchFlights();

        // Check if tracked or notify anyway
        const isTracked = trackedNumbers.includes(updatedFlight.flightNumber);
        
        let notifType: "delay" | "boarding" | "gate" | "info" = "info";
        let title = `Update for ${updatedFlight.flightNumber}`;

        if (updatedFlight.status === "DELAYED") {
          notifType = "delay";
          title = `🚨 Delay Alert: ${updatedFlight.flightNumber}`;
        } else if (updatedFlight.status === "BOARDING") {
          notifType = "boarding";
          title = `✈️ Boarding Started: ${updatedFlight.flightNumber}`;
        } else if (updatedFlight.status === "IN_FLIGHT") {
          notifType = "info";
          title = `🛫 In Flight: ${updatedFlight.flightNumber}`;
        } else if (updatedFlight.status === "LANDED") {
          notifType = "boarding";
          title = `🛬 Landed: ${updatedFlight.flightNumber}`;
        }

        addNotification({
          id: Date.now().toString(),
          flightNumber: updatedFlight.flightNumber,
          title: isTracked ? `[TRACKED] ${title}` : title,
          message: `${updatedFlight.airline} (${updatedFlight.origin} ➔ ${updatedFlight.destination}): ${updatedFlight.delayReason}`,
          timestamp: new Date().toLocaleTimeString(),
          type: notifType,
        });

        if (selectedFlight && selectedFlight.flightNumber === updatedFlight.flightNumber) {
          setSelectedFlight(updatedFlight);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setSimulationLoading(false);
    }
  };

  // Real-Time Email Notification Handler
  const handleSendEmailNotification = async (flightNumber: string) => {
    setEmailSending(true);
    setEmailFeedback(null);
    const targetEmail = testEmailInput.trim() || "traveler-test@makemytour.com";
    try {
      const res = await sendFlightEmailNotification(flightNumber, targetEmail);
      if (res && res.success === true) {
        setEmailFeedback({
          success: true,
          message: res.message || `Flight update successfully sent to ${targetEmail}`,
        });
        addNotification({
          id: Date.now().toString(),
          flightNumber,
          title: `✅ Flight Alert Email Sent`,
          message: `Sent status update for ${flightNumber} to ${targetEmail}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "email",
        });
      } else {
        const failMsg = res?.message || "Email notifications are currently unavailable. Please try again later.";
        setEmailFeedback({
          success: false,
          message: failMsg,
        });
        addNotification({
          id: Date.now().toString(),
          flightNumber,
          title: `⚠️ Email Service Currently Unavailable`,
          message: failMsg,
          timestamp: new Date().toLocaleTimeString(),
          type: "delay",
        });
      }
    } catch (err) {
      console.error("Email send failed:", err);
      const errText = "Email notifications are currently unavailable. Please try again later.";
      setEmailFeedback({
        success: false,
        message: errText,
      });
      addNotification({
        id: Date.now().toString(),
        flightNumber,
        title: `⚠️ Email Service Unavailable`,
        message: errText,
        timestamp: new Date().toLocaleTimeString(),
        type: "delay",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ON_TIME":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> On Time
          </span>
        );
      case "DELAYED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" /> Delayed
          </span>
        );
      case "BOARDING":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Radio className="w-3 h-3 mr-1 text-blue-600 animate-ping" /> Boarding
          </span>
        );
      case "IN_FLIGHT":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Plane className="w-3 h-3 mr-1 text-indigo-600" /> In Flight
          </span>
        );
      case "LANDED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <CheckCircle className="w-3 h-3 mr-1 text-slate-600" /> Landed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Dashboard Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
          <Plane className="w-96 h-96 text-white" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/30 text-blue-200 text-xs px-2.5 py-1 rounded-md uppercase font-mono tracking-wider font-semibold border border-blue-400/20">
                Live Flight Status Radar
              </span>
              {autoSimulate && (
                <span className="flex items-center text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                  Auto Live Feed Active
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold mt-2 tracking-tight">
              Real-Time Flight Tracker & Push Notifications
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Track multiple flights simultaneously, receive instant delay alerts, view revised schedules, and monitor dynamic estimated arrival times.
            </p>
          </div>

          {/* Action Simulation Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={requestWebPushPermission}
              variant="outline"
              className={`text-xs md:text-sm font-semibold border border-white/20 ${
                webPushPermission === "granted"
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Bell className="w-4 h-4 mr-1.5 text-amber-300" />
              {webPushPermission === "granted" ? "Web Push Enabled" : "Enable Web Push Alerts"}
            </Button>

            <Button
              onClick={() => handleRandomSimulation(false)}
              disabled={simulationLoading}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md hover:shadow-lg transition-all text-xs md:text-sm"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {simulationLoading ? "Simulating Update..." : "Simulate Live Status Change"}
            </Button>

            <Button
              onClick={() => setAutoSimulate(!autoSimulate)}
              variant="outline"
              className={`text-xs md:text-sm font-semibold border border-white/20 ${
                autoSimulate
                  ? "bg-emerald-600 text-white border-emerald-400"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${autoSimulate ? "animate-spin" : ""}`} />
              {autoSimulate ? "Auto Radar ON" : "Turn Auto Radar ON"}
            </Button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-slate-400 font-medium">Active Flights</p>
            <p className="text-2xl font-bold text-white mt-0.5">{flights.length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-emerald-400 font-medium">On Time</p>
            <p className="text-2xl font-bold text-emerald-300 mt-0.5">{flights.filter(f => f.status === "ON_TIME").length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-amber-400 font-medium">Delayed</p>
            <p className="text-2xl font-bold text-amber-300 mt-0.5">{flights.filter(f => f.status === "DELAYED").length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-blue-400 font-medium">Tracked by You</p>
            <p className="text-2xl font-bold text-blue-300 mt-0.5">{trackedNumbers.length}</p>
          </div>
        </div>
      </div>

      {/* Push Notification Alert Drawer */}
      {notifications.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-lg border border-slate-800">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="w-5 h-5 text-amber-400" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                Live Push Notifications ({notifications.length})
              </h3>
            </div>
            <button
              onClick={() => setNotifications([])}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between p-3 rounded-lg border text-xs transition-all ${
                  n.type === "delay"
                    ? "bg-amber-950/40 border-amber-800/50 text-amber-200"
                    : n.type === "boarding"
                    ? "bg-blue-950/40 border-blue-800/50 text-blue-200"
                    : n.type === "email"
                    ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200"
                    : "bg-slate-800/60 border-slate-700 text-slate-300"
                }`}
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <span>{n.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {n.timestamp}
                    </span>
                  </div>
                  <p className="text-xs opacity-90">{n.message}</p>
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Flight Simultaneous Tracking Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-base">
              Multi-Flight Simultaneous Watchlist ({trackedNumbers.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Pin flights below to track multiple flights live simultaneously
          </span>
        </div>

        {trackedNumbers.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No flights in your active watchlist. Click the bookmark icon on any flight card to track it live!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {trackedNumbers.map((num) => {
              const matched = flights.find((f) => f.flightNumber === num);
              return (
                <div
                  key={num}
                  className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {num}
                      </span>
                      {matched && getStatusBadge(matched.status)}
                    </div>
                    {matched ? (
                      <p className="text-xs text-slate-600 mt-1 truncate">
                        {matched.origin.split(" ")[0]} ➔ {matched.destination.split(" ")[0]}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">Loading status...</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleTrackFlight(num)}
                    title="Remove from watchlist"
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search Flight # (AI-101), Airline, or Airport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-1 hidden md:block" />
          {["ALL", "ON_TIME", "DELAYED", "BOARDING", "IN_FLIGHT", "LANDED"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedStatus === st
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "All Flights" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Flight Cards Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader />
        </div>
      ) : flights.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700">No flights matched your search</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or search by flight number (e.g. AI-101, 6E-204)</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flights.map((flight) => {
            const isTracked = trackedNumbers.includes(flight.flightNumber);
            return (
              <div
                key={flight.id || flight.flightNumber}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between overflow-hidden ${
                  isTracked ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"
                }`}
              >
                {/* Card Top Header */}
                <div className="p-5 pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-lg text-slate-900 tracking-wider">
                          {flight.flightNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          • {flight.airline}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {flight.terminal} • {flight.gate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(flight.status)}
                      <button
                        onClick={() => toggleTrackFlight(flight.flightNumber)}
                        title={isTracked ? "Untrack flight" : "Track flight simultaneously"}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isTracked
                            ? "bg-blue-50 border-blue-300 text-blue-600"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-blue-600"
                        }`}
                      >
                        {isTracked ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Route & Times */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3">
                    <div className="flex items-center justify-between text-center">
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">{flight.origin.split("(")[0]}</p>
                        <p className="text-xs text-slate-400 font-mono">{flight.origin.match(/\(([^)]+)\)/)?.[0] || ""}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-1">{flight.revisedDeparture}</p>
                        {flight.revisedDeparture !== flight.scheduledDeparture && (
                          <p className="text-[10px] text-slate-400 line-through">Sched: {flight.scheduledDeparture}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-center px-2">
                        <div className="relative flex items-center justify-center w-16">
                          <div className="w-full h-0.5 bg-slate-300" />
                          <Plane className="w-4 h-4 text-blue-600 absolute transform rotate-90" />
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 mt-1 font-mono">
                          {flight.estimatedArrivalMinutes > 0 ? `${flight.estimatedArrivalMinutes}m left` : "Arrived"}
                        </span>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-800">{flight.destination.split("(")[0]}</p>
                        <p className="text-xs text-slate-400 font-mono">{flight.destination.match(/\(([^)]+)\)/)?.[0] || ""}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-1">{flight.revisedArrival}</p>
                        {flight.revisedArrival !== flight.scheduledArrival && (
                          <p className="text-[10px] text-slate-400 line-through">Sched: {flight.scheduledArrival}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Delay Context */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                    <div className="flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-800">Status Context: </span>
                        <span>{flight.delayReason}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[10px]">
                    Updated: {flight.lastUpdated}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFlight(flight);
                        setEmailFeedback(null);
                      }}
                      title="Send email alert notification"
                      className="text-slate-700 hover:text-emerald-700 font-semibold flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs text-xs"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-600" /> Mail Alerts
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFlight(flight);
                        setEmailFeedback(null);
                      }}
                      className="font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      Details ➔
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flight Detail & Real-Time Email Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setSelectedFlight(null);
                setEmailFeedback(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Plane className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {selectedFlight.flightNumber} • {selectedFlight.airline}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedFlight.origin} ➔ {selectedFlight.destination}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Status Banner */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Current Radar Status</span>
                {getStatusBadge(selectedFlight.status)}
              </div>

              {/* Schedule breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-slate-400 font-medium">Scheduled Departure</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedFlight.scheduledDeparture}</p>
                  <p className="text-blue-600 font-semibold mt-1">Revised: {selectedFlight.revisedDeparture}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-slate-400 font-medium">Scheduled Arrival</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedFlight.scheduledArrival}</p>
                  <p className="text-blue-600 font-semibold mt-1">Revised: {selectedFlight.revisedArrival}</p>
                </div>
              </div>

              {/* Gate & Delay Reason */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-2">
                <div className="flex justify-between border-b border-blue-100 pb-2">
                  <span className="text-slate-600 font-semibold">Terminal & Gate:</span>
                  <span className="font-bold text-slate-900">{selectedFlight.terminal} / {selectedFlight.gate}</span>
                </div>
                <div className="flex justify-between border-b border-blue-100 pb-2">
                  <span className="text-slate-600 font-semibold">Dynamic ETA:</span>
                  <span className="font-bold text-blue-700">{selectedFlight.estimatedArrivalMinutes} minutes remaining</span>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold block mb-0.5">Delay & Context Reason:</span>
                  <p className="text-slate-800 italic bg-white p-2 rounded border border-blue-200">
                    "{selectedFlight.delayReason}"
                  </p>
                </div>
              </div>

              {/* Real-Time Email Notification Hub */}
              <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-3 shadow-md border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span>Get Live Flight Alerts via Email</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                    Instant Alerts
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email address..."
                    value={testEmailInput}
                    onChange={(e) => {
                      setTestEmailInput(e.target.value);
                      setEmailFeedback(null);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Button
                    onClick={() => handleSendEmailNotification(selectedFlight.flightNumber)}
                    disabled={emailSending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 h-auto flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {emailSending ? "Sending..." : "Send Email"}
                  </Button>
                </div>

                {/* Real-Time Application Feedback Response Banner */}
                {emailFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 animate-in fade-in zoom-in-95 ${
                      emailFeedback.success
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                        : "bg-amber-950/80 border-amber-500 text-amber-200"
                    }`}
                  >
                    {emailFeedback.success ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-bold">
                        {emailFeedback.success ? "Success" : "Notice"}
                      </p>
                      <p className="opacity-95">{emailFeedback.message}</p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 leading-normal">
                  Enter your email address to receive live flight updates, delay warnings, and gate change notifications.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => toggleTrackFlight(selectedFlight.flightNumber)}
                className="text-xs"
              >
                {trackedNumbers.includes(selectedFlight.flightNumber) ? "Remove from Watchlist" : "Pin & Track Live"}
              </Button>
              <Button onClick={() => setSelectedFlight(null)} className="bg-blue-600 text-xs">
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFlightTracker;
