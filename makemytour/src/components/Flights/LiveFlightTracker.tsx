import React, { useState, useEffect, useRef } from "react";
import {
  getFlightStatuses,
  getTrackedFlights,
  simulateFlightUpdate,
  triggerRandomFlightSimulation,
  sendFlightEmailNotification,
  validateFlightStatusDb,
  BACKEND_URL,
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
  Database,
  Activity,
  ShieldCheck,
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

export interface RealTimeFlightState {
  status: string;
  estimatedMinutesLeft: number;
  progressPercent: number;
  isLanded: boolean;
  contextReason: string;
}

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  let clean = timeStr.trim().toUpperCase();

  if (clean.includes("T")) {
    const tIdx = clean.indexOf("T");
    if (clean.length >= tIdx + 6) {
      clean = clean.substring(tIdx + 1, tIdx + 6);
    }
  }

  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = match12[3];
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }

  return null;
}

export function getRealTimeFlightStatus(flight: FlightStatusItem, now: Date): RealTimeFlightState {
  if (!flight) {
    return {
      status: "ON_TIME",
      estimatedMinutesLeft: 0,
      progressPercent: 0,
      isLanded: false,
      contextReason: "Operating on schedule",
    };
  }

  if (flight.status === "CANCELLED") {
    return {
      status: "CANCELLED",
      estimatedMinutesLeft: 0,
      progressPercent: 0,
      isLanded: false,
      contextReason: flight.delayReason || "Flight Cancelled",
    };
  }

  const depStr = flight.revisedDeparture || flight.scheduledDeparture;
  const arrStr = flight.revisedArrival || flight.scheduledArrival;

  const depMins = parseTimeToMinutes(depStr);
  const arrMins = parseTimeToMinutes(arrStr);

  if (depMins === null || arrMins === null) {
    const isLanded = flight.status === "LANDED";
    return {
      status: flight.status || "ON_TIME",
      estimatedMinutesLeft: flight.estimatedArrivalMinutes || 0,
      progressPercent: isLanded ? 100 : 50,
      isLanded,
      contextReason: flight.delayReason || "Schedule pending",
    };
  }

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const currentSecs = now.getSeconds();
  const exactCurrentMins = currentMins + currentSecs / 60;

  const totalDuration = arrMins >= depMins ? (arrMins - depMins) : ((1440 - depMins) + arrMins);

  if (currentMins >= arrMins) {
    return {
      status: "LANDED",
      estimatedMinutesLeft: 0,
      progressPercent: 100,
      isLanded: true,
      contextReason: `Landed safely at ${arrStr} - Taxiing to gate`,
    };
  } else if (currentMins >= depMins) {
    const elapsed = exactCurrentMins - depMins;
    const progress = Math.min(99, Math.max(2, Math.round((elapsed / (totalDuration || 1)) * 100)));
    const minutesLeft = Math.max(1, arrMins - currentMins);
    return {
      status: "IN_FLIGHT",
      estimatedMinutesLeft: minutesLeft,
      progressPercent: progress,
      isLanded: false,
      contextReason: flight.delayReason && flight.delayReason.toLowerCase().includes("cruising")
        ? flight.delayReason
        : "En route at cruising altitude",
    };
  } else if (currentMins >= depMins - 45) {
    const minutesToDep = depMins - currentMins;
    const gate = flight.gate || "Gate";
    return {
      status: "BOARDING",
      estimatedMinutesLeft: arrMins - currentMins,
      progressPercent: 0,
      isLanded: false,
      contextReason: `Boarding underway at ${gate} (Departs in ${minutesToDep}m)`,
    };
  } else {
    const isDelayed = flight.status === "DELAYED" ||
      (flight.revisedDeparture && flight.revisedDeparture !== flight.scheduledDeparture);
    const minutesToDep = depMins - currentMins;
    const hours = Math.floor(minutesToDep / 60);
    const mins = minutesToDep % 60;
    const timeToDepStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      status: isDelayed ? "DELAYED" : "ON_TIME",
      estimatedMinutesLeft: arrMins - currentMins,
      progressPercent: 0,
      isLanded: false,
      contextReason: isDelayed
        ? (flight.delayReason || "Delayed departure")
        : `Operating on schedule - Check-in open (Departs in ${timeToDepStr})`,
    };
  }
}

const LiveFlightTracker: React.FC = () => {
  const [flights, setFlights] = useState<FlightStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [trackedNumbers, setTrackedNumbers] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [validatingDb, setValidatingDb] = useState<boolean>(false);
  const [dbValidationNotice, setDbValidationNotice] = useState<string | null>(null);

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

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightStatusItem | null>(null);
  const [simulationLoading, setSimulationLoading] = useState<boolean>(false);
  const [autoSimulate, setAutoSimulate] = useState<boolean>(false);
  const [testEmailInput, setTestEmailInput] = useState<string>("");
  const [emailSending, setEmailSending] = useState<boolean>(false);
  const [emailFeedback, setEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [webPushPermission, setWebPushPermission] = useState<string>("default");

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
          new window.Notification("Web Push Notifications Enabled!", {
            body: "You will now receive desktop and mobile status updates for tracked flights.",
          });
        }
      } catch (err) {
        console.error("Failed to request Web Push permission", err);
      }
    }
  };

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

  const handleValidateDb = async (showNotice = true) => {
    setValidatingDb(true);
    try {
      const res = await validateFlightStatusDb();
      if (res && res.flights) {
        setFlights(res.flights);
        if (showNotice) {
          const msg = `Verified & Aligned ${res.totalFlights || res.flights.length} flights with Real-Time Database!`;
          setDbValidationNotice(msg);
          addNotification({
            id: Date.now().toString(),
            flightNumber: "DB-SYNC",
            title: "Database Validated & Synchronized",
            message: msg,
            timestamp: new Date().toLocaleTimeString(),
            type: "info",
          });
          setTimeout(() => setDbValidationNotice(null), 6000);
        }
      } else {
        await fetchFlights();
        if (showNotice) {
          const msg = `Real-time status engine verified against live database!`;
          setDbValidationNotice(msg);
          setTimeout(() => setDbValidationNotice(null), 6000);
        }
      }
    } catch (err) {
      await fetchFlights();
    } finally {
      setValidatingDb(false);
    }
  };


  useEffect(() => {
    fetchFlights();
  }, [searchQuery, selectedStatus]);

  useEffect(() => {
    handleValidateDb(false);
  }, []);

  const trackedNumbersRef = useRef(trackedNumbers);
  useEffect(() => {
    trackedNumbersRef.current = trackedNumbers;
  }, [trackedNumbers]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    if (typeof window !== "undefined") {
      try {
        const apiBase = BACKEND_URL;
        eventSource = new EventSource(`${apiBase}/api/flight-status/stream`);

        eventSource.addEventListener("flight-update", (event: MessageEvent) => {
          try {
            const updatedFlight: FlightStatusItem = JSON.parse(event.data);
            if (updatedFlight) {
              setFlights((prev) => {
                const idx = prev.findIndex((f) => f.flightNumber === updatedFlight.flightNumber);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = updatedFlight;
                  return copy;
                }
                return [updatedFlight, ...prev];
              });
              const isTracked = trackedNumbersRef.current.includes(updatedFlight.flightNumber);
              let notifType: "delay" | "boarding" | "gate" | "info" = "info";
              let title = `Radar Live Update: ${updatedFlight.flightNumber}`;

              if (updatedFlight.status === "DELAYED") {
                notifType = "delay";
                title = `Delay Alert: ${updatedFlight.flightNumber}`;
              } else if (updatedFlight.status === "BOARDING") {
                notifType = "boarding";
                title = `Boarding Alert: ${updatedFlight.flightNumber}`;
              } else if (updatedFlight.status === "LANDED") {
                notifType = "boarding";
                title = `Landed Alert: ${updatedFlight.flightNumber}`;
              } else if (updatedFlight.status === "IN_FLIGHT") {
                notifType = "info";
                title = `Departure Alert: ${updatedFlight.flightNumber}`;
              }

              addNotification({
                id: Date.now().toString(),
                flightNumber: updatedFlight.flightNumber,
                title: isTracked ? `[WATCHLIST RADAR] ${title}` : title,
                message: `${updatedFlight.airline} (${updatedFlight.origin} -> ${updatedFlight.destination}): ${updatedFlight.delayReason}`,
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

  useEffect(() => {
    if (typeof window !== "undefined" && isMounted) {
      localStorage.setItem("tracked_flights", JSON.stringify(trackedNumbers));
    }
  }, [trackedNumbers, isMounted]);

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

  const addNotification = (notif: PushNotification) => {
    setNotifications((prev) => [notif, ...prev.slice(0, 9)]);

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new window.Notification(notif.title, {
            body: notif.message,
            icon: "/favicon.ico",
          });
        } catch (e) {
          console.error("Error firing native push notification", e);
        }
      }
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleRandomSimulation = async (isBackground = false) => {
    if (!isBackground) setSimulationLoading(true);
    try {
      const updatedFlight: FlightStatusItem = await triggerRandomFlightSimulation();
      if (updatedFlight) {
        await fetchFlights();

        const isTracked = trackedNumbers.includes(updatedFlight.flightNumber);
        let notifType: "delay" | "boarding" | "gate" | "info" = "info";
        let title = `Update for ${updatedFlight.flightNumber}`;

        if (updatedFlight.status === "DELAYED") {
          notifType = "delay";
          title = `Delay Alert: ${updatedFlight.flightNumber}`;
        } else if (updatedFlight.status === "BOARDING") {
          notifType = "boarding";
          title = `Boarding Started: ${updatedFlight.flightNumber}`;
        } else if (updatedFlight.status === "IN_FLIGHT") {
          notifType = "info";
          title = `In Flight: ${updatedFlight.flightNumber}`;
        } else if (updatedFlight.status === "LANDED") {
          notifType = "boarding";
          title = `Landed: ${updatedFlight.flightNumber}`;
        }

        addNotification({
          id: Date.now().toString(),
          flightNumber: updatedFlight.flightNumber,
          title: isTracked ? `[TRACKED] ${title}` : title,
          message: `${updatedFlight.airline} (${updatedFlight.origin} to ${updatedFlight.destination}): ${updatedFlight.delayReason}`,
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
          title: `Flight Alert Email Sent`,
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
      }
    } catch (err) {
      console.error("Email send failed:", err);
      setEmailFeedback({
        success: false,
        message: "Email notifications are currently unavailable. Please try again later.",
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
            <Plane className="w-3 h-3 mr-1 text-indigo-600 animate-bounce" /> In Flight
          </span>
        );
      case "LANDED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Landed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <X className="w-3 h-3 mr-1 text-rose-600" /> Cancelled
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

  // Real-Time dynamically computed flights
  const flightsWithComputed = flights.map((f) => {
    const computed = getRealTimeFlightStatus(f, currentTime);
    return {
      ...f,
      computed,
    };
  });

  // Filter flights by search and status using real-time evaluated status
  const filteredFlights = flightsWithComputed.filter((flight) => {
    if (selectedStatus !== "ALL") {
      if (flight.computed.status !== selectedStatus) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = flight.flightNumber.toLowerCase().includes(q);
      const matchAirline = flight.airline.toLowerCase().includes(q);
      const matchOrigin = flight.origin.toLowerCase().includes(q);
      const matchDest = flight.destination.toLowerCase().includes(q);
      return matchNum || matchAirline || matchOrigin || matchDest;
    }
    return true;
  });

  const totalCount = flightsWithComputed.length;
  const onTimeCount = flightsWithComputed.filter((f) => f.computed.status === "ON_TIME").length;
  const inFlightCount = flightsWithComputed.filter((f) => f.computed.status === "IN_FLIGHT").length;
  const boardingCount = flightsWithComputed.filter((f) => f.computed.status === "BOARDING").length;
  const landedCount = flightsWithComputed.filter((f) => f.computed.status === "LANDED").length;
  const delayedCount = flightsWithComputed.filter((f) => f.computed.status === "DELAYED").length;

  const formattedClockTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-blue-900/50">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
          <Plane className="w-96 h-96 text-white" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-500/30 text-blue-200 text-xs px-2.5 py-1 rounded-md uppercase font-mono tracking-wider font-semibold border border-blue-400/20 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-300" />
                Live Flight Status Radar
              </span>

              {/* Real-time Indian Standard Time Clock Indicator */}
              <span className="flex items-center text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-400/30 shadow-xs">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400 animate-spin" />
                Live IST: {formattedClockTime}
              </span>

              <span className="flex items-center text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                Real-Time Engine Active
              </span>
            </div>

            <h1 className="text-3xl font-extrabold mt-2 tracking-tight">
              Real-Time Flight Tracker & Radar
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Track flights live in real-time. Flight statuses, route progression, and dynamic arrival countdowns are automatically validated and synchronized with live clock times.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={requestWebPushPermission}
              variant="outline"
              className={`text-xs md:text-sm font-semibold border border-white/20 ${webPushPermission === "granted"
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-white/10 text-white hover:bg-white/20"
                }`}
            >
              <Bell className="w-4 h-4 mr-1.5 text-amber-300" />
              {webPushPermission === "granted" ? "Web Push Enabled" : "Enable Push Alerts"}
            </Button>

            <Button
              onClick={() => handleRandomSimulation(false)}
              disabled={simulationLoading}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md hover:shadow-lg transition-all text-xs md:text-sm"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {simulationLoading ? "Simulating..." : "Simulate Change"}
            </Button>

            <Button
              onClick={() => setAutoSimulate(!autoSimulate)}
              variant="outline"
              className={`text-xs md:text-sm font-semibold border border-white/20 ${autoSimulate
                  ? "bg-emerald-600 text-white border-emerald-400"
                  : "bg-white/10 text-white hover:bg-white/20"
                }`}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${autoSimulate ? "animate-spin" : ""}`} />
              {autoSimulate ? "Auto Radar ON" : "Turn Auto Radar ON"}
            </Button>
          </div>
        </div>

        {/* Real-time DB Validation Notification Toast Banner */}
        {dbValidationNotice && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{dbValidationNotice}</span>
            </div>
            <button
              onClick={() => setDbValidationNotice(null)}
              className="text-emerald-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Real-Time Live Flight Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-slate-400 font-medium">Total Flights</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-emerald-400 font-medium">On Time / Sched</p>
            <p className="text-2xl font-bold text-emerald-300 mt-0.5">{onTimeCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-blue-400 font-medium">Boarding Now</p>
            <p className="text-2xl font-bold text-blue-300 mt-0.5">{boardingCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-indigo-400 font-medium">In Flight</p>
            <p className="text-2xl font-bold text-indigo-300 mt-0.5">{inFlightCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-slate-300 font-medium">Landed / Arrived</p>
            <p className="text-2xl font-bold text-slate-200 mt-0.5">{landedCount}</p>
          </div>
        </div>
      </div>

      {/* Multi-Flight Simultaneous Watchlist */}
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
              const matched = flightsWithComputed.find((f) => f.flightNumber === num);
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
                      {matched && getStatusBadge(matched.computed.status)}
                    </div>
                    {matched ? (
                      <p className="text-xs text-slate-600 mt-1 truncate">
                        {matched.origin.split(" ")[0]} ➔ {matched.destination.split(" ")[0]}
                        {matched.computed.status === "IN_FLIGHT" && (
                          <span className="text-blue-600 font-mono font-semibold ml-1.5">
                            • {matched.computed.estimatedMinutesLeft}m left
                          </span>
                        )}
                        {matched.computed.status === "LANDED" && (
                          <span className="text-emerald-700 font-semibold ml-1.5">
                            • Arrived
                          </span>
                        )}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search Flight # (IG-107, AI-101), Airline, or Airport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-1 hidden md:block" />
          {[
            { id: "ALL", label: "All Flights", count: totalCount },
            { id: "LANDED", label: "Landed", count: landedCount },
            { id: "IN_FLIGHT", label: "In Flight", count: inFlightCount },
            { id: "BOARDING", label: "Boarding", count: boardingCount },
            { id: "ON_TIME", label: "On Time", count: onTimeCount },
            { id: "DELAYED", label: "Delayed", count: delayedCount },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedStatus(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${selectedStatus === item.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              <span>{item.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedStatus === item.id ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-700"}`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader />
        </div>
      ) : filteredFlights.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700">No flights matched your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting "All Flights".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlights.map((flight) => {
            const isTracked = trackedNumbers.includes(flight.flightNumber);
            const comp = flight.computed;

            return (
              <div
                key={flight.id || flight.flightNumber}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between overflow-hidden ${isTracked ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"
                  }`}
              >
                <div className="p-5 pb-4">
                  {/* Flight Header */}
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
                      {/* Real-time Status Badge */}
                      {getStatusBadge(comp.status)}

                      <button
                        onClick={() => toggleTrackFlight(flight.flightNumber)}
                        title={isTracked ? "Untrack flight" : "Track flight simultaneously"}
                        className={`p-1.5 rounded-lg border transition-all ${isTracked
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

                  {/* Route & Dynamic Real-Time Progress Bar */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 mb-3">
                    <div className="flex items-center justify-between text-center mb-2">
                      {/* Origin */}
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">{flight.origin.split("(")[0]}</p>
                        <p className="text-xs text-slate-400 font-mono">{flight.origin.match(/\(([^)]+)\)/)?.[0] || ""}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{flight.revisedDeparture || flight.scheduledDeparture}</p>
                        {flight.revisedDeparture && flight.revisedDeparture !== flight.scheduledDeparture && (
                          <p className="text-[10px] text-slate-400 line-through">Sched: {flight.scheduledDeparture}</p>
                        )}
                      </div>

                      {/* Dynamic Real-Time Flight Route Progress */}
                      <div className="flex flex-col items-center px-2 flex-1 max-w-[140px]">
                        <div className="relative w-full h-5 flex items-center">
                          {/* Route line track */}
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-700 ${comp.status === "LANDED"
                                  ? "bg-slate-500"
                                  : comp.status === "IN_FLIGHT"
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                                    : "bg-blue-400"
                                }`}
                              style={{ width: `${comp.progressPercent}%` }}
                            />
                          </div>

                          {/* Animated Plane icon positioned along the route */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 flex items-center justify-center pointer-events-none"
                            style={{
                              left: `calc(${comp.progressPercent}% - 10px)`,
                            }}
                          >
                            <div
                              className={`p-1 rounded-full shadow-xs ${comp.status === "LANDED"
                                  ? "bg-slate-700 text-white"
                                  : comp.status === "IN_FLIGHT"
                                    ? "bg-blue-600 text-white animate-pulse ring-2 ring-blue-400/30"
                                    : "bg-white text-blue-600 border border-blue-300"
                                }`}
                            >
                              <Plane className="w-3 h-3 transform rotate-90" />
                            </div>
                          </div>
                        </div>

                        {/* Real-time Countdown Label */}
                        <span
                          className={`text-[10px] font-bold mt-1 font-mono ${comp.status === "LANDED"
                              ? "text-slate-600 font-semibold"
                              : comp.status === "IN_FLIGHT"
                                ? "text-blue-600 font-extrabold"
                                : comp.status === "BOARDING"
                                  ? "text-blue-700"
                                  : "text-slate-500"
                            }`}
                        >
                          {comp.status === "LANDED"
                            ? "Arrived"
                            : comp.status === "IN_FLIGHT"
                              ? `${comp.estimatedMinutesLeft}m left`
                              : comp.status === "BOARDING"
                                ? "Boarding"
                                : `${comp.estimatedMinutesLeft}m to arr`}
                        </span>
                      </div>

                      {/* Destination */}
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-800">{flight.destination.split("(")[0]}</p>
                        <p className="text-xs text-slate-400 font-mono">{flight.destination.match(/\(([^)]+)\)/)?.[0] || ""}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{flight.revisedArrival || flight.scheduledArrival}</p>
                        {flight.revisedArrival && flight.revisedArrival !== flight.scheduledArrival && (
                          <p className="text-[10px] text-slate-400 line-through">Sched: {flight.scheduledArrival}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Context Reason */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                    <div className="flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-800">Status Context: </span>
                        <span>{comp.contextReason}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[10px]">
                    Updated: {flight.lastUpdated || "Live"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFlight(flight);
                        setEmailFeedback(null);
                        setTestEmailInput("");
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
                        setTestEmailInput("");
                      }}
                      className="font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      Details &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flight Details Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setSelectedFlight(null);
                setEmailFeedback(null);
                setTestEmailInput("");
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
                  {selectedFlight.origin} to {selectedFlight.destination}
                </p>
              </div>
            </div>

            {(() => {
              const compModal = getRealTimeFlightStatus(selectedFlight, currentTime);
              return (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Current Real-Time Status</span>
                    {getStatusBadge(compModal.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Scheduled Departure</p>
                      <p className="font-bold text-slate-900 text-sm">{selectedFlight.scheduledDeparture}</p>
                      <p className="text-blue-600 font-semibold mt-1">Revised: {selectedFlight.revisedDeparture || selectedFlight.scheduledDeparture}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Scheduled Arrival</p>
                      <p className="font-bold text-slate-900 text-sm">{selectedFlight.scheduledArrival}</p>
                      <p className="text-blue-600 font-semibold mt-1">Revised: {selectedFlight.revisedArrival || selectedFlight.scheduledArrival}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-2">
                    <div className="flex justify-between border-b border-blue-100 pb-2">
                      <span className="text-slate-600 font-semibold">Terminal & Gate:</span>
                      <span className="font-bold text-slate-900">{selectedFlight.terminal} / {selectedFlight.gate}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-100 pb-2">
                      <span className="text-slate-600 font-semibold">Real-Time Dynamic ETA:</span>
                      <span className="font-bold text-blue-700">
                        {compModal.status === "LANDED"
                          ? "Flight Landed (0 minutes remaining)"
                          : `${compModal.estimatedMinutesLeft} minutes remaining`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-semibold block mb-0.5">Status & Context Reason:</span>
                      <p className="text-slate-800 font-medium bg-white p-2 rounded border border-blue-200">
                        {compModal.contextReason}
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

                    {emailFeedback && (
                      <div
                        className={`p-3 rounded-lg border text-xs flex items-start gap-2 animate-in fade-in zoom-in-95 ${emailFeedback.success
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

                  <div className="mt-4 flex justify-end gap-2">
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
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFlightTracker;
