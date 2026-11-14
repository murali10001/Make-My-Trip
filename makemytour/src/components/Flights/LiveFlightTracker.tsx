import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import {
  getFlightStatuses,
  getTrackedFlights,
  simulateFlightUpdate,
  triggerRandomFlightSimulation,
  validateFlightStatusDb,
  getUserTrackedFlights,
  toggleUserTrackFlight,
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
  Bookmark,
  BookmarkCheck,
  Info,
  Radio,
  SlidersHorizontal,
  X,
  Sparkles,
  Sliders,
  Check,
  AlertCircle,
  ShieldCheck,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
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
  type: "delay" | "boarding" | "gate" | "info" | "flight" | "alert";
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

export function getISTMinutesAndSeconds(date: Date = new Date()): { currentMins: number; currentSecs: number; exactCurrentMins: number } {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const seconds = istDate.getSeconds();
  const currentMins = hours * 60 + minutes;
  const exactCurrentMins = currentMins + seconds / 60;
  return { currentMins, currentSecs: seconds, exactCurrentMins };
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

  const { currentMins, currentSecs } = getISTMinutesAndSeconds(now);
  const totalDuration = arrMins >= depMins ? (arrMins - depMins) : ((1440 - depMins) + arrMins);

  let effectiveArr: number;
  let effectiveCurrent: number;
  const effectiveDep: number = depMins;

  if (arrMins < depMins) {
    effectiveArr = arrMins + 1440;
    if (currentMins < arrMins + 120) {
      effectiveCurrent = currentMins + 1440;
    } else {
      effectiveCurrent = currentMins;
    }
  } else {
    effectiveArr = arrMins;
    effectiveCurrent = currentMins;
  }

  if (effectiveCurrent >= effectiveArr) {
    return {
      status: "LANDED",
      estimatedMinutesLeft: 0,
      progressPercent: 100,
      isLanded: true,
      contextReason: `Landed safely at ${arrStr} - Taxiing to gate`,
    };
  } else if (effectiveCurrent >= effectiveDep) {
    const elapsed = (currentMins + currentSecs / 60) >= depMins
      ? ((currentMins + currentSecs / 60) - depMins)
      : (((currentMins + currentSecs / 60) + 1440) - depMins);
    const progress = Math.min(99, Math.max(2, Math.round((elapsed / (totalDuration || 1)) * 100)));
    const minutesLeft = Math.max(1, effectiveArr - effectiveCurrent);
    return {
      status: "IN_FLIGHT",
      estimatedMinutesLeft: minutesLeft,
      progressPercent: progress,
      isLanded: false,
      contextReason: (flight.delayReason && flight.delayReason.trim().length > 0 && !flight.delayReason.toLowerCase().includes("check-in"))
        ? flight.delayReason
        : "En route at cruising altitude",
    };
  } else if (effectiveCurrent >= effectiveDep - 45) {
    const minutesToDep = Math.max(0, effectiveDep - effectiveCurrent);
    const gate = flight.gate || "Gate";
    return {
      status: "BOARDING",
      estimatedMinutesLeft: Math.max(1, effectiveArr - effectiveCurrent),
      progressPercent: 0,
      isLanded: false,
      contextReason: `Boarding underway at ${gate} (Departs in ${minutesToDep}m)`,
    };
  } else {
    const isDelayed = flight.status === "DELAYED" ||
      (flight.revisedDeparture && flight.revisedDeparture !== flight.scheduledDeparture);
    let minutesToDep = effectiveDep - effectiveCurrent;
    if (minutesToDep < 0) minutesToDep += 1440;
    const hours = Math.floor(minutesToDep / 60);
    const mins = minutesToDep % 60;
    const timeToDepStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    let minutesToArr = effectiveArr - effectiveCurrent;
    if (minutesToArr < 0) minutesToArr += 1440;

    return {
      status: isDelayed ? "DELAYED" : "ON_TIME",
      estimatedMinutesLeft: Math.max(1, minutesToArr),
      progressPercent: 0,
      isLanded: false,
      contextReason: isDelayed
        ? (flight.delayReason || "Delayed departure")
        : `Operating on schedule - Check-in open (Departs in ${timeToDepStr})`,
    };
  }
}

const LiveFlightTracker: React.FC = () => {
  const router = useRouter();
  const user = useSelector((state: any) => state.user.user);
  const userId = user?.id || user?._id || "";

  const [flights, setFlights] = useState<FlightStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [trackedNumbers, setTrackedNumbers] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [validatingDb, setValidatingDb] = useState<boolean>(false);
  const [dbValidationNotice, setDbValidationNotice] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [alertsFeedOpen, setAlertsFeedOpen] = useState<boolean>(true);
  const [selectedFlight, setSelectedFlight] = useState<FlightStatusItem | null>(null);
  const [simulationLoading, setSimulationLoading] = useState<boolean>(false);
  const [autoSimulate, setAutoSimulate] = useState<boolean>(false);
  const [webPushPermission, setWebPushPermission] = useState<string>("default");

  const [customSimModalOpen, setCustomSimModalOpen] = useState<boolean>(false);
  const [simFlightNumber, setSimFlightNumber] = useState<string>("AI-101");
  const [simStatus, setSimStatus] = useState<string>("DELAYED");
  const [simDelayPreset, setSimDelayPreset] = useState<string>("1h");
  const [simCustomReason, setSimCustomReason] = useState<string>("Adverse weather & runway flow control");
  const [simGate, setSimGate] = useState<string>("Gate 14");
  const [simTerminal, setSimTerminal] = useState<string>("T3");
  const [customSimLoading, setCustomSimLoading] = useState<boolean>(false);

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
    if (userId) {
      getUserTrackedFlights(userId).then((dbTracked) => {
        if (dbTracked && Array.isArray(dbTracked) && dbTracked.length > 0) {
          setTrackedNumbers((prev) => Array.from(new Set([...prev, ...dbTracked])));
        }
      });
    }
  }, [userId]);

  useEffect(() => {
    if (router.query.flightNumber && typeof router.query.flightNumber === "string") {
      const target = router.query.flightNumber.trim().toUpperCase();
      setSearchQuery(target);
      const matched = flights.find((f) => f.flightNumber?.toUpperCase() === target);
      if (matched) {
        setSelectedFlight(matched);
      }
    }
  }, [router.query.flightNumber, flights]);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

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
          new window.Notification("Live Flight Push Notifications Enabled!", {
            body: "You will now receive instant desktop and mobile updates for tracked flights.",
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

        eventSource.onerror = () => {
        };

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

              if (isTracked) {
                let notifType: "delay" | "boarding" | "gate" | "info" = "info";
                let title = `Radar Live Update: ${updatedFlight.flightNumber}`;

                if (updatedFlight.status === "DELAYED") {
                  notifType = "delay";
                  title = `Delay Alert: ${updatedFlight.flightNumber}`;
                } else if (updatedFlight.status === "BOARDING") {
                  notifType = "boarding";
                  title = `Boarding Alert: ${updatedFlight.flightNumber}`;
                } else if (updatedFlight.status === "CANCELLED") {
                  notifType = "delay";
                  title = `Cancellation Alert: ${updatedFlight.flightNumber}`;
                } else if (updatedFlight.status === "LANDED") {
                  notifType = "info";
                  title = `Landed Alert: ${updatedFlight.flightNumber}`;
                } else if (updatedFlight.status === "IN_FLIGHT") {
                  notifType = "info";
                  title = `Departure Alert: ${updatedFlight.flightNumber}`;
                }

                addNotification({
                  id: "NOTIF-" + Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6),
                  flightNumber: updatedFlight.flightNumber,
                  title: `[WATCHLIST RADAR] ${title}`,
                  message: `${updatedFlight.airline} (${updatedFlight.origin} -> ${updatedFlight.destination}): ${updatedFlight.delayReason}`,
                  timestamp: new Date().toLocaleTimeString(),
                  type: notifType,
                });
              }
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

  const toggleTrackFlight = async (flightNumber: string) => {
    const isCurrentlyTracked = trackedNumbers.includes(flightNumber);
    const updated = isCurrentlyTracked
      ? trackedNumbers.filter((num) => num !== flightNumber)
      : [...trackedNumbers, flightNumber];

    setTrackedNumbers(updated);

    if (userId) {
      toggleUserTrackFlight(userId, flightNumber).catch((err) =>
        console.error("Failed to persist tracked flight to database:", err)
      );
    }

    if (isCurrentlyTracked) {
      addNotification({
        id: "UNTRACK-" + Date.now().toString(),
        flightNumber,
        title: "Flight Untracked",
        message: `Removed ${flightNumber} from your active tracking watchlist.`,
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
      });
    } else {
      addNotification({
        id: "TRACK-" + Date.now().toString(),
        flightNumber,
        title: "Flight Added to Watchlist!",
        message: `Receiving real-time radar push notifications for ${flightNumber}.`,
        timestamp: new Date().toLocaleTimeString(),
        type: "boarding",
      });
    }
  };

  const addNotification = (notif: PushNotification) => {
    setNotifications((prev) => [notif, ...prev.slice(0, 14)]);

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

  const clearAllNotifications = () => {
    setNotifications([]);
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
          notifType = "info";
          title = `Landed: ${updatedFlight.flightNumber}`;
        }

        addNotification({
          id: "SIM-" + Date.now().toString(),
          flightNumber: updatedFlight.flightNumber,
          title: isTracked ? `[WATCHLIST] ${title}` : title,
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

  const handleCustomSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomSimLoading(true);
    try {
      const delayMinutes = simDelayPreset === "1h" ? 60 : simDelayPreset === "45m" ? 45 : simDelayPreset === "30m" ? 30 : 60;
      const targetFlight = flights.find((f) => f.flightNumber === simFlightNumber) || flights[0];

      let revisedDep = targetFlight ? targetFlight.scheduledDeparture : "11:00 AM";
      let revisedArr = targetFlight ? targetFlight.scheduledArrival : "01:30 PM";

      if (simStatus === "DELAYED") {
        const depM = parseTimeToMinutes(revisedDep);
        const arrM = parseTimeToMinutes(revisedArr);
        if (depM !== null) {
          const nm = (depM + delayMinutes) % 1440;
          const h = Math.floor(nm / 60);
          const m = nm % 60;
          const ampm = h >= 12 ? "PM" : "AM";
          const dh = h % 12 === 0 ? 12 : h % 12;
          revisedDep = `${dh < 10 ? "0" + dh : dh}:${m < 10 ? "0" + m : m} ${ampm}`;
        }
        if (arrM !== null) {
          const nm = (arrM + delayMinutes) % 1440;
          const h = Math.floor(nm / 60);
          const m = nm % 60;
          const ampm = h >= 12 ? "PM" : "AM";
          const dh = h % 12 === 0 ? 12 : h % 12;
          revisedArr = `${dh < 10 ? "0" + dh : dh}:${m < 10 ? "0" + m : m} ${ampm}`;
        }
      }

      const delayLabel = simStatus === "DELAYED" ? `Delayed by ${simDelayPreset}` : simStatus;
      const reasonText = simStatus === "DELAYED"
        ? `${delayLabel} - ${simCustomReason || "Adverse weather & runway clearance"}`
        : simStatus === "BOARDING"
        ? `Boarding underway at ${simGate}`
        : simStatus === "IN_FLIGHT"
        ? "En route at cruising altitude"
        : simStatus === "LANDED"
        ? `Landed safely at ${revisedArr} - Taxiing to gate`
        : "Operating on schedule - Check-in open";

      const payload = {
        flightNumber: simFlightNumber,
        status: simStatus,
        delayReason: reasonText,
        revisedDeparture: revisedDep,
        revisedArrival: revisedArr,
        gate: simGate,
        terminal: simTerminal,
        estimatedArrivalMinutes: simStatus === "LANDED" ? 0 : simStatus === "IN_FLIGHT" ? 45 : 110,
      };

      const updated = await simulateFlightUpdate(payload);
      if (updated) {
        await fetchFlights();
        addNotification({
          id: "CUSTOM-SIM-" + Date.now().toString(),
          flightNumber: updated.flightNumber,
          title: `Simulator: Flight ${updated.flightNumber} ${updated.status}`,
          message: `${updated.airline}: ${updated.delayReason}`,
          timestamp: new Date().toLocaleTimeString(),
          type: updated.status === "DELAYED" ? "delay" : "info",
        });
        if (selectedFlight && selectedFlight.flightNumber === updated.flightNumber) {
          setSelectedFlight(updated);
        }
        setCustomSimModalOpen(false);
      }
    } catch (err) {
      console.error("Custom simulation failed:", err);
    } finally {
      setCustomSimLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ON_TIME":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 inline-block align-middle flex-shrink-0" /> On Time
          </span>
        );
      case "DELAYED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 inline-block align-middle flex-shrink-0" /> Delayed
          </span>
        );
      case "BOARDING":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
            <Radio className="w-3.5 h-3.5 mr-1 text-blue-600 animate-ping inline-block align-middle flex-shrink-0" /> Boarding
          </span>
        );
      case "IN_FLIGHT":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs">
            <Plane className="w-3.5 h-3.5 mr-1 text-indigo-600 animate-bounce inline-block align-middle flex-shrink-0" /> In Flight
          </span>
        );
      case "LANDED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 inline-block align-middle flex-shrink-0" /> Landed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
            <X className="w-3.5 h-3.5 mr-1 text-rose-600 inline-block align-middle flex-shrink-0" /> Cancelled
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

  const flightsWithComputed = flights.map((f) => {
    const computed = getRealTimeFlightStatus(f, currentTime);
    return {
      ...f,
      computed,
    };
  });

  const filteredFlights = flightsWithComputed.filter((flight) => {
    if (selectedStatus !== "ALL") {
      if (flight.computed.status !== selectedStatus) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = (flight.flightNumber || "").toLowerCase().includes(q);
      const matchAirline = (flight.airline || "").toLowerCase().includes(q);
      const matchOrigin = (flight.origin || "").toLowerCase().includes(q);
      const matchDest = (flight.destination || "").toLowerCase().includes(q);
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

              <span className="flex items-center text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-400/30 shadow-xs">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400 animate-spin" />
                Live IST: {formattedClockTime}
              </span>

              <span className="flex items-center text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                Real-Time SSE Stream Active
              </span>
            </div>

            <h1 className="text-3xl font-extrabold mt-2 tracking-tight">
              Real-Time Flight Tracker & Radar
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Track flights live in real-time. Flight statuses, delay reasons, and dynamic arrival countdowns are automatically validated and synchronized with live clock times.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              onClick={requestWebPushPermission}
              variant="outline"
              className={`text-xs md:text-sm font-semibold border border-white/20 justify-center ${webPushPermission === "granted"
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-white/10 text-white hover:bg-white/20"
                }`}
            >
              <Bell className="w-4 h-4 mr-1.5 text-amber-300 flex-shrink-0" />
              {webPushPermission === "granted" ? "Push Alerts Enabled" : "Enable Push Alerts"}
            </Button>

            <Button
              onClick={() => setCustomSimModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs md:text-sm shadow-md"
            >
              <Sliders className="w-4 h-4 mr-1.5 flex-shrink-0" />
              Simulate Delay / Schedule
            </Button>

            <Button
              onClick={() => handleRandomSimulation(false)}
              disabled={simulationLoading}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md hover:shadow-lg transition-all text-xs md:text-sm"
            >
              <Sparkles className="w-4 h-4 mr-1.5 flex-shrink-0" />
              {simulationLoading ? "Advancing..." : "Simulate Next State"}
            </Button>

            <Button
              onClick={() => setAutoSimulate(!autoSimulate)}
              variant="outline"
              className={`text-xs md:text-sm font-semibold border border-white/20 ${autoSimulate
                  ? "bg-emerald-600 text-white border-emerald-400"
                  : "bg-white/10 text-white hover:bg-white/20"
                }`}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 flex-shrink-0 ${autoSimulate ? "animate-spin" : ""}`} />
              {autoSimulate ? "Auto Radar ON" : "Auto Radar"}
            </Button>
          </div>
        </div>

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

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6 pt-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-slate-400 font-medium">Total Flights</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-emerald-400 font-medium">On Time</p>
            <p className="text-2xl font-bold text-emerald-300 mt-0.5">{onTimeCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-amber-400 font-medium">Delayed</p>
            <p className="text-2xl font-bold text-amber-300 mt-0.5">{delayedCount}</p>
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
            <p className="text-xs text-slate-300 font-medium">Landed</p>
            <p className="text-2xl font-bold text-slate-200 mt-0.5">{landedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div
          onClick={() => setAlertsFeedOpen(!alertsFeedOpen)}
          className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bell className="w-5 h-5 text-blue-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Live Flight Push Notifications & Radar Alert Stream
                <span className="text-xs font-mono font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {notifications.length} {notifications.length === 1 ? "alert" : "alerts"}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Live broadcast updates for delays, boarding calls, departure revisions, and dynamic arrival countdowns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAllNotifications();
                }}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
              >
                Clear all
              </button>
            )}
            {alertsFeedOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {alertsFeedOpen && (
          <div className="p-4">
            {notifications.length === 0 ? (
              <div className="py-5 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <Bell className="w-6 h-6 text-slate-300 mb-1" />
                <span>Listening for live flight radar updates via SSE stream... Push notifications active.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-2 shadow-2xs transition-all ${
                      notif.type === "delay"
                        ? "bg-amber-50/80 border-amber-200"
                        : notif.type === "boarding"
                        ? "bg-blue-50/80 border-blue-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold bg-white text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                          {notif.flightNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{notif.timestamp}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{notif.message}</p>
                    </div>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-base">
              Multi-Flight Simultaneous Watchlist ({trackedNumbers.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Pin flights below to track multiple flights live simultaneously across devices
          </span>
        </div>

        {trackedNumbers.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No flights in your active watchlist. Click the bookmark icon on any flight card to track it live!
          </p>
        ) : (
          <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-none snap-x">
            {trackedNumbers.map((num) => {
              const matched = flightsWithComputed.find((f) => f.flightNumber === num);
              return (
                <div
                  key={num}
                  className="min-w-[260px] sm:min-w-0 flex-shrink-0 sm:flex-shrink bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all shadow-2xs snap-start"
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
                        {(matched.origin || "").split(" ")[0]} ➔ {(matched.destination || "").split(" ")[0]}
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
                        {matched.computed.status === "DELAYED" && (
                          <span className="text-amber-700 font-semibold ml-1.5">
                            • Delayed
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

      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search Flight # (AI-101, 6E-202), Airline, or Airport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none snap-x px-1 -mx-1 pr-6">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-1 hidden md:block flex-shrink-0" />
          {[
            { id: "ALL", label: "All Flights", count: totalCount },
            { id: "DELAYED", label: "Delayed", count: delayedCount },
            { id: "BOARDING", label: "Boarding", count: boardingCount },
            { id: "IN_FLIGHT", label: "In Flight", count: inFlightCount },
            { id: "ON_TIME", label: "On Time", count: onTimeCount },
            { id: "LANDED", label: "Landed", count: landedCount },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedStatus(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 snap-start ${selectedStatus === item.id
                  ? "bg-blue-600 text-white shadow-xs border border-blue-600"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 hover:border-slate-400"
                }`}
            >
              <span>{item.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedStatus === item.id ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-800"}`}>
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
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting &quot;All Flights&quot;.</p>
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

                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 mb-3">
                    <div className="flex items-center justify-between text-center mb-2">
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">{(flight.origin || "").split("(")[0]}</p>
                        <p className="text-xs text-slate-400 font-mono">{(flight.origin || "").match(/\(([^)]+)\)/)?.[0] || ""}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{flight.revisedDeparture || flight.scheduledDeparture}</p>
                        {flight.revisedDeparture && flight.revisedDeparture !== flight.scheduledDeparture && (
                          <p className="text-[10px] text-slate-400 line-through">Sched: {flight.scheduledDeparture}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-center px-2 flex-1 max-w-[140px]">
                        <div className="relative w-full h-5 flex items-center">
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-700 ${comp.status === "LANDED"
                                  ? "bg-slate-500"
                                  : comp.status === "IN_FLIGHT"
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                                    : comp.status === "DELAYED"
                                    ? "bg-amber-400"
                                    : "bg-blue-400"
                                }`}
                              style={{ width: `${comp.progressPercent}%` }}
                            />
                          </div>

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

                        <span
                          className={`text-[10px] font-bold mt-1 font-mono ${comp.status === "LANDED"
                              ? "text-slate-600 font-semibold"
                              : comp.status === "IN_FLIGHT"
                                ? "text-blue-600 font-extrabold"
                                : comp.status === "BOARDING"
                                  ? "text-blue-700"
                                  : comp.status === "DELAYED"
                                  ? "text-amber-700"
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

                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-800">{(flight.destination || "").split("(")[0]}</p>
                        <p className="text-xs text-slate-400 font-mono">{(flight.destination || "").match(/\(([^)]+)\)/)?.[0] || ""}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{flight.revisedArrival || flight.scheduledArrival}</p>
                        {flight.revisedArrival && flight.revisedArrival !== flight.scheduledArrival && (
                          <p className="text-[10px] text-slate-400 line-through">Sched: {flight.scheduledArrival}</p>
                        )}
                      </div>
                    </div>
                  </div>

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

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[10px]">
                    Updated: {flight.lastUpdated || "Live"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFlight(flight)}
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

      {selectedFlight && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedFlight(null)}
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

      {customSimModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setCustomSimModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-6 h-6 text-indigo-600" />
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Simulate Live Flight Update
                </h3>
                <p className="text-xs text-slate-500">
                  Test & verify real-time mock simulation for delays, boarding, and schedule revisions
                </p>
              </div>
            </div>

            <form onSubmit={handleCustomSimulateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Flight:</label>
                <select
                  value={simFlightNumber}
                  onChange={(e) => setSimFlightNumber(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                >
                  {flights.map((f) => (
                    <option key={f.flightNumber} value={f.flightNumber}>
                      {f.flightNumber} ({f.airline} • {f.origin} to {f.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Simulated Status:</label>
                <select
                  value={simStatus}
                  onChange={(e) => setSimStatus(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="DELAYED">DELAYED (Simulate Delay Update)</option>
                  <option value="BOARDING">BOARDING (Simulate Gate Boarding)</option>
                  <option value="IN_FLIGHT">IN_FLIGHT (Cruising Altitude)</option>
                  <option value="LANDED">LANDED (Touchdown & Taxiing)</option>
                  <option value="ON_TIME">ON_TIME (Reset to Schedule)</option>
                </select>
              </div>

              {simStatus === "DELAYED" && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Delay Duration:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["30m", "45m", "1h"].map((dur) => (
                      <button
                        type="button"
                        key={dur}
                        onClick={() => setSimDelayPreset(dur)}
                        className={`p-2 rounded-lg font-bold border transition-all ${
                          simDelayPreset === dur
                            ? "bg-amber-500 text-slate-950 border-amber-600"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        Delayed by {dur}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Context / Delay Reason:</label>
                <input
                  type="text"
                  value={simCustomReason}
                  onChange={(e) => setSimCustomReason(e.target.value)}
                  placeholder="e.g. Air traffic clearance hold, adverse weather warning"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Terminal:</label>
                  <input
                    type="text"
                    value={simTerminal}
                    onChange={(e) => setSimTerminal(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gate:</label>
                  <input
                    type="text"
                    value={simGate}
                    onChange={(e) => setSimGate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCustomSimModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={customSimLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  {customSimLoading ? "Simulating..." : "Broadcast Live Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFlightTracker;
