import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getflight } from "@/api";
import Loader from "@/components/Loader";
import { SearchSelect } from "@/components/SearchSelect";
import { Button } from "@/components/ui/button";
import {
  Plane,
  ArrowRight,
  Filter,
  Calendar,
  Users,
  Clock,
  Luggage,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  Sparkles,
  ChevronRight,
  Snowflake,
} from "lucide-react";

const AIRPORT_CODES: Record<string, string> = {
  delhi: "DEL",
  "new delhi": "DEL",
  mumbai: "BOM",
  bengaluru: "BLR",
  bangalore: "BLR",
  goa: "GOI",
  kolkata: "CCU",
  chennai: "MAA",
  hyderabad: "HYD",
  ahmedabad: "AMD",
  pune: "PNQ",
  kochi: "COK",
  cochin: "COK",
  jaipur: "JAI",
  lucknow: "LKO",
  dubai: "DXB",
  singapore: "SIN",
  london: "LHR",
};

function getBaseCity(str: string): string {
  if (!str) return "";
  return str.replace(/\s*\([A-Za-z0-9\s]+\)\s*/g, "").trim();
}

function getCodeFromCity(str: string): string {
  if (!str) return "";
  const match = str.match(/\(([A-Za-z0-9]{3})\)/);
  if (match) return match[1].toUpperCase();
  const base = getBaseCity(str).toLowerCase().replace(/\s+/g, "");
  return AIRPORT_CODES[base] || "AIR";
}

function matchCity(recordCity: string, queryCity: string): boolean {
  if (!recordCity || !queryCity) return false;
  const recTrim = recordCity.trim().toLowerCase();
  const queryTrim = queryCity.trim().toLowerCase();
  if (recTrim === queryTrim) return true;

  const recBase = getBaseCity(recordCity).toLowerCase();
  const queryBase = getBaseCity(queryCity).toLowerCase();
  if (recBase && queryBase && recBase === queryBase) return true;

  const recCode = getCodeFromCity(recordCity);
  const qCode = getCodeFromCity(queryCity);
  if (recCode && qCode && recCode === qCode) return true;

  if (recBase && queryBase && (recBase.includes(queryBase) || queryBase.includes(recBase))) return true;
  return false;
}

export default function FlightSearchPage() {
  const router = useRouter();
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [passengers, setPassengers] = useState<number>(1);

  const [allFlights, setAllFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [sortBy, setSortBy] = useState<string>("price_asc");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  useEffect(() => {
    if (!router.isReady) return;

    const initialFrom = typeof router.query.from === "string" ? router.query.from : "";
    const initialTo = typeof router.query.to === "string" ? router.query.to : "";

    setFrom(initialFrom);
    setTo(initialTo);

    fetchFlights(initialFrom, initialTo);
  }, [router.isReady, router.query.from, router.query.to]);

  const fetchFlights = async (queryFrom = from, queryTo = to) => {
    setLoading(true);
    try {
      let data = await getflight(queryFrom, queryTo);
      let flightsList = Array.isArray(data) ? data : [];
      if (flightsList.length === 0 && (queryFrom || queryTo)) {
        const allData = await getflight("", "");
        if (Array.isArray(allData) && allData.length > 0) {
          flightsList = allData;
        }
      }
      setAllFlights(flightsList);

      if (flightsList.length > 0) {
        const highest = Math.max(...flightsList.map((f: any) => f.price || 0));
        if (highest > 0) setMaxPrice(Math.ceil(highest * 1.1));
      }
    } catch (err) {
      console.error("Failed to load flights:", err);
      setAllFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    router.push(
      {
        pathname: "/flight",
        query: {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      },
      undefined,
      { shallow: true }
    );
    fetchFlights(from, to);
  };

  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    allFlights.forEach((f) => {
      const name = f.airline || f.flightName;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [allFlights]);

  const cityOptions = useMemo(() => {
    const cityMap = new Map<string, string>();
    allFlights.forEach((f) => {
      [f?.from, f?.to].forEach((city) => {
        if (!city) return;
        const base = getBaseCity(city);
        if (!base) return;
        const key = base.toLowerCase();
        const code = getCodeFromCity(city);
        const formatted = code ? `${base} (${code})` : base;
        if (!cityMap.has(key)) {
          cityMap.set(key, formatted);
        }
      });
    });
    return Array.from(cityMap.values()).map((city) => ({ value: city, label: city }));
  }, [allFlights]);

  const filteredFlights = useMemo(() => {
    let result = [...allFlights];

    if (from.trim()) {
      const matched = result.filter((f) => matchCity(f.from, from));
      if (matched.length > 0) result = matched;
    }

    if (to.trim()) {
      const matched = result.filter((f) => matchCity(f.to, to));
      if (matched.length > 0) result = matched;
    }

    if (selectedAirlines.length > 0) {
      result = result.filter((f) => {
        const name = f.airline || f.flightName;
        return selectedAirlines.includes(name);
      });
    }

    if (maxPrice > 0) {
      result = result.filter((f) => (f.price || 0) <= maxPrice);
    }

    if (timeFilter !== "all") {
      result = result.filter((f) => {
        const dateObj = new Date(f.departureTime);
        const hour = isNaN(dateObj.getTime()) ? 12 : dateObj.getHours();
        if (timeFilter === "morning") return hour >= 6 && hour < 12;
        if (timeFilter === "afternoon") return hour >= 12 && hour < 18;
        if (timeFilter === "evening") return hour >= 18 && hour < 24;
        if (timeFilter === "night") return hour >= 0 && hour < 6;
        return true;
      });
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "time_asc") {
      result.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
    }

    return result;
  }, [allFlights, from, to, selectedAirlines, maxPrice, timeFilter, sortBy]);

  const toggleAirline = (airline: string) => {
    setSelectedAirlines((prev) =>
      prev.includes(airline) ? prev.filter((a) => a !== airline) : [...prev, airline]
    );
  };

  const formatFlightTime = (timeStr: string) => {
    if (!timeStr) return "--:--";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatFlightDate = (timeStr: string) => {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
  };

  return (
    <>
      <Head>
        <title>{from && to ? `${from} to ${to} Flights | MakeMyTour` : "Flight Search & Booking | MakeMyTour"}</title>
        <meta
          name="description"
          content="Search, compare, and book flights with live fares directly from our database. Zero booking fees and instant confirmation."
        />
      </Head>

      <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">

        <header className="bg-white border-b border-slate-200/90 shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-3">
                <SearchSelect
                  placeholder="From City"
                  options={cityOptions}
                  value={from}
                  onChange={setFrom}
                  icon={<Plane className="w-4 h-4 text-blue-600 rotate-45" />}
                  subtitle="Departure airport"
                />
              </div>

              <div className="hidden md:flex justify-center items-center md:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    const temp = from;
                    setFrom(to);
                    setTo(temp);
                  }}
                  className="p-2.5 rounded-full bg-slate-100 hover:bg-blue-50 text-blue-600 border border-slate-200 transition shadow-sm"
                  title="Swap Departure and Arrival"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              <div className="md:col-span-3">
                <SearchSelect
                  placeholder="To City"
                  options={cityOptions}
                  value={to}
                  onChange={setTo}
                  icon={<Plane className="w-4 h-4 text-emerald-600 -rotate-45" />}
                  subtitle="Destination airport"
                />
              </div>

              <div className="md:col-span-2">
                <div className="border border-slate-200 rounded-xl p-2.5 bg-white transition hover:border-blue-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</div>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="text-xs font-bold text-slate-800 w-full bg-transparent border-none p-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-1">
                <div className="border border-slate-200 rounded-xl p-2.5 bg-white transition hover:border-blue-500">
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seats</div>
                      <input
                        type="number"
                        min="1"
                        max="9"
                        value={passengers}
                        onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
                        className="text-xs font-bold text-slate-800 w-full bg-transparent border-none p-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  className="w-full h-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Update Search</span>
                </Button>
              </div>
            </form>
          </div>
        </header>

        <div className="bg-white/80 border-b border-slate-200/80 py-3 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-extrabold text-sm uppercase">{from || "All Origins"}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="text-emerald-700 font-extrabold text-sm uppercase">{to || "All Destinations"}</span>
              <span className="text-slate-300">•</span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                {filteredFlights.length} Flights Available
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-semibold shadow-sm"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="time_asc">Departure: Earliest First</option>
              </select>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            <aside className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span>Filter Flights</span>
                  </div>
                  {(selectedAirlines.length > 0 || timeFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSelectedAirlines([]);
                        setTimeFilter("all");
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Departure Time
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: "all", label: "Anytime", desc: "All flights" },
                      { id: "morning", label: "Morning", desc: "06:00 - 12:00" },
                      { id: "afternoon", label: "Afternoon", desc: "12:00 - 18:00" },
                      { id: "evening", label: "Evening", desc: "18:00 - 00:00" },
                    ].map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setTimeFilter(slot.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          timeFilter === slot.id
                            ? "bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-semibold">{slot.label}</div>
                        <div className="text-[10px] opacity-75">{slot.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {availableAirlines.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                      Airlines ({availableAirlines.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {availableAirlines.map((airline) => (
                        <label
                          key={airline}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs transition border border-transparent hover:border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedAirlines.includes(airline)}
                              onChange={() => toggleAirline(airline)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700 font-medium">{airline}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-600">Max Fare</span>
                    <span className="text-blue-700 font-black">₹{maxPrice.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="60000"
                    step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value) || 50000)}
                    className="w-full accent-blue-600 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                    <span>₹1,000</span>
                    <span>₹60,000+</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Free Fare Lock & 24h Refund Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Live MongoDB Direct Allotment</span>
                  </div>
                </div>
              </div>
            </aside>

            <main className="lg:col-span-3 space-y-4">
              {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <Loader />
                  <p className="text-sm text-slate-500 mt-4 font-medium">Connecting to live database and fetching flight schedules...</p>
                </div>
              ) : filteredFlights.length > 0 ? (
                filteredFlights.map((flight) => {
                  const flightId = flight.id || flight._id;
                  const airlineName = flight.airline || flight.flightName || "Commercial Flight";
                  const duration = flight.duration || "2h 30m";
                  const seatsLeft = flight.availableSeats ?? 10;
                  const baseFare = flight.price || 3500;
                  const originalPrice = Math.round(baseFare * 1.2);

                  return (
                    <div
                      key={flightId}
                      className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col justify-between hover:-translate-y-0.5 relative"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                        <div className="md:w-1/4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-base shadow-sm">
                              ✈
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                                  {airlineName}
                                </h3>
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  FLIGHT
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {flight.flightNo || "SG-101"} • {flight.aircraft || "Boeing 737"}
                              </p>
                            </div>
                          </div>
                          {seatsLeft < 8 && (
                            <span className="inline-block mt-2 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              Only {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left!
                            </span>
                          )}
                        </div>

                        <div className="md:w-2/4 flex items-center justify-between px-2">

                          <div className="text-left">
                            <div className="text-xl font-extrabold text-slate-900">
                              {formatFlightTime(flight.departureTime)}
                            </div>
                            <div className="text-xs font-bold text-slate-700">{flight.from}</div>
                            <div className="text-[10px] text-slate-400">
                              {flight.departureTerminal ? `Terminal ${flight.departureTerminal}` : formatFlightDate(flight.departureTime)}
                            </div>
                          </div>

                          <div className="flex flex-col items-center px-4 flex-1 max-w-[160px]">
                            <span className="text-[11px] font-semibold text-slate-500">{duration}</span>
                            <div className="relative w-full flex items-center my-1.5">
                              <div className="h-[2px] bg-slate-200 w-full rounded"></div>
                              <div className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50"></div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              Non-Stop
                            </span>
                          </div>

                          <div className="text-right">
                            <div className="text-xl font-extrabold text-slate-900">
                              {formatFlightTime(flight.arrivalTime)}
                            </div>
                            <div className="text-xs font-bold text-slate-700">{flight.to}</div>
                            <div className="text-[10px] text-slate-400">
                              {flight.arrivalTerminal ? `Terminal ${flight.arrivalTerminal}` : formatFlightDate(flight.arrivalTime)}
                            </div>
                          </div>
                        </div>

                        <div className="md:w-1/4 flex flex-col md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider md:text-right">Estimated Fare</div>
                            <div className="flex items-baseline gap-2 md:justify-end">
                              <span className="text-2xl font-black text-slate-900">
                                ₹{(flight.price || 0).toLocaleString()}
                              </span>
                              {originalPrice > baseFare && (
                                <span className="text-xs text-slate-400 line-through">
                                  ₹{originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 md:text-right">
                              per adult • taxes included
                            </div>
                          </div>

                          <div className="mt-3 w-full flex flex-col gap-1.5">
                            <Button
                              onClick={() => router.push(`/book-flight/${flightId}`)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition py-2 text-xs flex items-center justify-center gap-1"
                            >
                              <span>Explore & Book</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                            <button
                              onClick={() => router.push(`/dynamic-pricing?flightId=${flightId}`)}
                              className="w-full text-center text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition py-0.5 flex items-center justify-center gap-1"
                            >
                              <Snowflake className="w-3 h-3 text-cyan-600" />
                              <span>Lock Fare for ₹199</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <Luggage className="w-3.5 h-3.5 text-slate-400" />
                            Cabin: <strong className="text-slate-700">{flight.cabinBaggage || "7 Kgs"}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Luggage className="w-3.5 h-3.5 text-slate-400" />
                            Check-in: <strong className="text-slate-700">{flight.checkInBaggage || "15 Kgs"}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Direct Database Record • Instant Confirmation</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (

                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto text-2xl font-bold">
                    ✈
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    No Direct Flights Found {from && to ? `for ${from} → ${to}` : ""}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    We couldn't find matching scheduled flights in the database for this specific route and filter criteria. You can view all available scheduled flights or change your origin/destination.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <Button
                      onClick={() => {
                        setFrom("");
                        setTo("");
                        setSelectedAirlines([]);
                        setTimeFilter("all");
                        fetchFlights("", "");
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-2.5 shadow-md"
                    >
                      Browse All Database Flights
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/")}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-5"
                    >
                      Return Home
                    </Button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
