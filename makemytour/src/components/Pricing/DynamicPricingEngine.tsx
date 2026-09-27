import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  getflight,
  gethotel,
  getDynamicPricing,
  freezePrice,
  removePriceFreeze,
  getPromotionalOffers,
  applyCouponCode,
} from "@/api";
import {
  TrendingUp,
  Snowflake,
  Tag,
  Percent,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Zap,
  Building2,
  Plane,
  ChevronDown,
  X,
} from "lucide-react";
import Loader from "../Loader";
import { Button } from "../ui/button";

export interface ItemChoice {
  id: string;
  type: "FLIGHT" | "HOTEL";
  title: string;
  subtitle: string;
  basePrice: number;
}

export interface DynamicPriceData {
  itemId: string;
  itemType: string;
  basePrice: number;
  finalPrice: number;
  demandLevel: string;
  seasonType: string;
  demandSurgePercentage: number;
  seasonalMultiplier: number;
  surgeReason: string;
  priceHistory: Array<{
    date: string;
    dayLabel: string;
    price: number;
    isCurrent: boolean;
  }>;
}

export interface FrozenPriceData {
  freezeId: string;
  itemId: string;
  itemTitle: string;
  frozenPrice: number;
  originalPrice: number;
  expiresAt: string;
  durationHours: number;
  active: boolean;
}

export interface OfferCouponData {
  id: string;
  code: string;
  title: string;
  description: string;
  bankName: string;
  bankLogo: string;
  discountPercentage: number;
  maxDiscountAmount: number;
  minBookingAmount: number;
  badgeText: string;
  active: boolean;
}

const DynamicPricingEngine: React.FC = () => {
  const user = useSelector((state: any) => state.user.user);
  const [dbItems, setDbItems] = useState<ItemChoice[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<ItemChoice | null>(null);

  const [demandLevel, setDemandLevel] = useState<string>("HIGH");
  const [seasonType, setSeasonType] = useState<string>("HOLIDAY_PEAK");
  
  const [pricingData, setPricingData] = useState<DynamicPriceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Price Freeze state
  const [frozenPrice, setFrozenPrice] = useState<FrozenPriceData | null>(null);
  const [freezeLoading, setFreezeLoading] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(86400);

  // Offers state
  const [offers, setOffers] = useState<OfferCouponData[]>([]);
  const [couponCodeInput, setCouponCodeInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
    message: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState<boolean>(false);

  // Load real items from database (Flights & Hotels)
  const loadDatabaseItems = async () => {
    try {
      const flights = await getflight();
      const hotels = await gethotel();

      const combined: ItemChoice[] = [];

      if (Array.isArray(flights) && flights.length > 0) {
        flights.forEach((f: any) => {
          combined.push({
            id: f._id || f.id || `FL-${Math.random()}`,
            type: "FLIGHT",
            title: `${f.flightName || "Flight"} (${f.from} to ${f.to})`,
            subtitle: `Departure: ${f.departureTime || "08:00 AM"} • ${f.availableSeats || 120} seats left`,
            basePrice: f.price || 5500,
          });
        });
      }

      if (Array.isArray(hotels) && hotels.length > 0) {
        hotels.forEach((h: any) => {
          combined.push({
            id: h._id || h.id || `HT-${Math.random()}`,
            type: "HOTEL",
            title: `${h.hotelName || h.name || "Luxury Hotel"} (${h.location || "City"})`,
            subtitle: `Amenities: ${h.amenities || "WiFi, Pool, Breakfast"}`,
            basePrice: h.pricePerNight || h.price || 4200,
          });
        });
      }

      setDbItems(combined);
      if (combined.length > 0) {
        setSelectedItemId(combined[0].id);
        setSelectedItem(combined[0]);
      } else {
        setSelectedItemId("");
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("Failed to load DB items", err);
    }
  };

  // Fetch offers
  const fetchOffers = async () => {
    try {
      const list = await getPromotionalOffers();
      setOffers(list || []);
    } catch (err) {
      console.error("Failed to load offers", err);
    }
  };

  useEffect(() => {
    loadDatabaseItems();
    fetchOffers();
  }, []);

  // Recalculate pricing when item or parameters change
  const fetchPricing = async () => {
    if (!selectedItem) return;
    setLoading(true);
    setAppliedCoupon(null);
    setCouponError(null);
    try {
      const data = await getDynamicPricing(
        selectedItem.id,
        selectedItem.type,
        selectedItem.basePrice,
        demandLevel,
        seasonType
      );
      if (data) {
        setPricingData(data);
      }
    } catch (err) {
      console.error("Failed to calculate pricing", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItemId && dbItems.length > 0) {
      const found = dbItems.find((i) => i.id === selectedItemId);
      if (found) {
        setSelectedItem(found);
      }
    }
  }, [selectedItemId, dbItems]);

  const router = useRouter();

  useEffect(() => {
    if (selectedItem) {
      fetchPricing();
      if (typeof window !== "undefined") {
        try {
          const savedList = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
          const found = savedList.find((f: any) => f.itemId === selectedItem.id);
          if (found && found.active !== false) {
            setFrozenPrice(found);
          } else {
            setFrozenPrice(null);
          }
        } catch (e) {}
      }
    }
  }, [selectedItem, demandLevel, seasonType]);

  // Countdown timer for price freeze
  useEffect(() => {
    let timer: any = null;
    if (frozenPrice && countdownSeconds > 0) {
      timer = setInterval(() => {
        setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [frozenPrice, countdownSeconds]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  const handleBookFrozenItem = () => {
    if (!frozenPrice) return;
    const isHotel = selectedItem?.type === "HOTEL" || (frozenPrice.itemId && frozenPrice.itemId.startsWith("HT"));
    const targetId = frozenPrice.itemId || selectedItem?.id || "FL-101";
    if (isHotel) {
      router.push(`/book-hotel/${targetId}?freezeId=${frozenPrice.freezeId}&demand=${demandLevel}&season=${seasonType}`);
    } else {
      router.push(`/book-flight/${targetId}?freezeId=${frozenPrice.freezeId}&demand=${demandLevel}&season=${seasonType}`);
    }
  };

  const handleRemoveCurrentFreeze = async () => {
    if (!frozenPrice) return;
    const freezeIdToRemove = frozenPrice.freezeId;
    setFrozenPrice(null);

    if (typeof window !== "undefined") {
      try {
        const savedList = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
        const filtered = savedList.filter((f: any) => f.freezeId !== freezeIdToRemove);
        localStorage.setItem("user_price_freezes", JSON.stringify(filtered));
      } catch (e) {
        console.error("Failed to update user_price_freezes in localStorage", e);
      }
    }

    try {
      await removePriceFreeze(freezeIdToRemove);
    } catch (e) {
      console.error("Failed to remove price freeze from backend", e);
    }
  };

  const handleFreezePrice = async () => {
    if (!pricingData || !selectedItem) return;
    setFreezeLoading(true);
    try {
      const userId = user?.id || user?._id || "";
      const res = await freezePrice(
        selectedItem.id,
        selectedItem.title,
        pricingData.finalPrice,
        24,
        userId
      );
      if (res) {
        setFrozenPrice(res);
        setCountdownSeconds(86400);

        // Save to localStorage for instant user profile tracking
        if (typeof window !== "undefined") {
          try {
            const savedList = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
            const filtered = savedList.filter((f: any) => f.freezeId !== res.freezeId);
            localStorage.setItem("user_price_freezes", JSON.stringify([res, ...filtered]));
          } catch (e) {
            console.error("Failed to update user_price_freezes in localStorage", e);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim();
    if (!code) return;
    setCouponApplying(true);
    setCouponError(null);
    setAppliedCoupon(null);

    const amountToDiscount = pricingData ? pricingData.finalPrice : (selectedItem?.basePrice || 5500);
    try {
      const res = await applyCouponCode(code, amountToDiscount);
      if (res && res.success) {
        setAppliedCoupon({
          code: res.code,
          discountAmount: res.discountAmount,
          finalAmount: res.finalAmount,
          message: res.message,
        });
        setCouponCodeInput(res.code);
      } else {
        setCouponError(res?.message || "Failed to apply coupon code.");
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Invalid coupon code for this booking.";
      setCouponError(errorMsg);
    } finally {
      setCouponApplying(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Item Selector & Dynamic Controls Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              Live MongoDB Database Integration
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">Select Flight or Hotel Room</h2>
            <p className="text-xs text-slate-500">Pick any real item from your database to calculate dynamic rates, view price trends, or lock fares.</p>
          </div>

          {/* Database Item Selector Dropdown */}
          <div className="w-full md:w-96">
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {dbItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.type === "FLIGHT" ? "Flight: " : "Hotel: "} {item.title} (Base: ₹{item.basePrice.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Item Info Banner */}
        {selectedItem && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                {selectedItem.type === "FLIGHT" ? <Plane className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedItem.title}</p>
                <p className="text-slate-500">{selectedItem.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={demandLevel}
                onChange={(e) => setDemandLevel(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="HIGH">High Demand</option>
                <option value="MEDIUM">Medium Demand</option>
                <option value="NORMAL">Normal Demand</option>
              </select>

              <select
                value={seasonType}
                onChange={(e) => setSeasonType(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="HOLIDAY_PEAK">Peak Holiday (+20%)</option>
                <option value="WEEKEND">Weekend (+10%)</option>
                <option value="OFF_PEAK">Standard Off-Peak</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Dynamic Rate Breakdown & History Graph */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Dynamic Rate Box */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-lg">Dynamic Fare Breakdown</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Real-Time Market Rate</span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader />
              </div>
            ) : pricingData ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg border border-slate-800">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {pricingData.surgeReason}
                    </div>

                    <div className="flex items-baseline justify-center md:justify-start gap-3 mt-1">
                      <span className="text-4xl font-black tracking-tight text-emerald-400">
                        ₹{pricingData.finalPrice.toLocaleString()}
                      </span>
                      <span className="text-slate-400 line-through text-sm font-semibold">
                        Base: ₹{pricingData.basePrice.toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      Prices adjust dynamically based on live seat availability and demand trends.
                    </p>
                  </div>

                  <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto">
                    <Button
                      onClick={handleFreezePrice}
                      disabled={freezeLoading}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 h-auto text-sm shadow-md w-full md:w-auto flex items-center justify-center gap-2"
                    >
                      <Snowflake className="w-4 h-4 text-slate-950" />
                      {freezeLoading ? "Locking..." : "Lock Fare for 24h"}
                    </Button>
                    <span className="text-[10px] text-slate-400">Zero cancellation fee • Instant lock</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-slate-500 font-medium">Database Base Fare</p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">
                      ₹{pricingData.basePrice.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-slate-500 font-medium">Surge Factor</p>
                    <p className="text-base font-extrabold text-amber-600 mt-0.5">
                      +{pricingData.demandSurgePercentage}% Surge
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-slate-500 font-medium">Final Dynamic Price</p>
                    <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                      ₹{pricingData.finalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Price History Graph */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Price Trend History</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
                7-Day Historical Trend
              </span>
            </div>

            {pricingData?.priceHistory && (
              <div className="bg-slate-900 rounded-xl p-5 text-white space-y-4">
                <div className="h-48 w-full flex items-end justify-between gap-2 pt-6 px-2">
                  {pricingData.priceHistory.map((point, index) => {
                    const maxP = Math.max(...pricingData.priceHistory.map((p) => p.price));
                    const minP = Math.min(...pricingData.priceHistory.map((p) => p.price));
                    const heightPercent = Math.max(
                      20,
                      Math.min(100, ((point.price - minP * 0.8) / (maxP - minP * 0.8)) * 100)
                    );

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="text-[10px] text-slate-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          ₹{point.price}
                        </div>
                        <div className="w-full bg-slate-800 rounded-t-lg h-36 flex items-end p-1">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t transition-all duration-500 ${
                              point.isCurrent
                                ? "bg-emerald-400 shadow-md shadow-emerald-500/50"
                                : "bg-indigo-500 hover:bg-indigo-400"
                            }`}
                          />
                        </div>
                        <span className={`text-[10px] font-mono ${point.isCurrent ? "text-emerald-400 font-bold" : "text-slate-400"}`}>
                          {point.dayLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800 text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Past Trend Rates
                  </span>
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Live Current Rate (Today)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Price Freeze Locker & E-Cart Offers */}
        <div className="space-y-6">

          {/* Active Price Freeze Locker */}
          <div className="bg-gradient-to-b from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-blue-800/40 space-y-4">
            <div className="flex items-center gap-2 border-b border-blue-800/60 pb-3">
              <Snowflake className="w-5 h-5 text-cyan-400" />
              <h3 className="font-extrabold text-base">Price Freeze Locker</h3>
            </div>

            {frozenPrice ? (
              <div className="bg-blue-950/80 p-4 rounded-xl border border-cyan-500/30 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    LOCKED FARE
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-mono font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {formatCountdown(countdownSeconds)}
                    </span>
                    <button
                      onClick={handleRemoveCurrentFreeze}
                      title="Remove Frozen Price"
                      className="p-1 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-300 font-semibold">{frozenPrice.itemTitle}</p>
                  <p className="text-3xl font-black text-cyan-300 mt-1">
                    ₹{frozenPrice.frozenPrice.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-through">
                    Protected against projected surge of ₹{frozenPrice.originalPrice.toLocaleString()}
                  </p>
                </div>

                <Button
                  onClick={handleBookFrozenItem}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs py-2 h-auto cursor-pointer"
                >
                  Book Selected Item at Frozen Rate
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <p>
                  Protect your booking against unexpected price surges by locking this rate for 24 hours.
                </p>
                <div className="bg-blue-950/60 p-3 rounded-lg border border-blue-800/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Guaranteed Fare Protection
                  </div>
                  <p className="text-[11px] text-slate-400">
                    If market rates increase, your price stays locked!
                  </p>
                </div>

                <Button
                  onClick={handleFreezePrice}
                  disabled={freezeLoading}
                  className="w-full bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2.5 h-auto"
                >
                  {freezeLoading ? "Locking..." : "Freeze Rate for Selected Item"}
                </Button>
              </div>
            )}
          </div>

          {/* E-Cart Offers & Coupon Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">E-Cart Offers & Coupons</h3>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {offers.length} Active Cards
              </span>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Apply Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code (HDFC10, SBISAVE)"
                  value={couponCodeInput}
                  onChange={(e) => {
                    setCouponCodeInput(e.target.value);
                    setCouponError(null);
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button
                  onClick={() => handleApplyCoupon()}
                  disabled={couponApplying}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 h-auto"
                >
                  {couponApplying ? "Applying..." : "Apply"}
                </Button>
              </div>

              {/* Applied Coupon Success Banner */}
              {appliedCoupon && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-emerald-800">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Code '{appliedCoupon.code}' Applied!
                    </span>
                    <span className="text-emerald-700 font-extrabold">-₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{appliedCoupon.message}</p>
                  
                  {pricingData && (
                    <div className="pt-1.5 border-t border-emerald-200 text-[11px] text-slate-700 space-y-0.5 font-mono">
                      <div className="flex justify-between text-slate-500">
                        <span>Base Dynamic Rate:</span>
                        <span>₹{pricingData.finalPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Est. Taxes & Fees:</span>
                        <span>+₹{(Math.round(pricingData.finalPrice * 0.15) + 150 - 200).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-emerald-800 text-xs pt-1 border-t border-emerald-200">
                        <span>Est. Total Booking Fare:</span>
                        <span>₹{(pricingData.finalPrice + Math.round(pricingData.finalPrice * 0.15) + 150 - 200 - appliedCoupon.discountAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Coupon Error Banner */}
              {couponError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs flex items-center gap-2 text-amber-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{couponError}</span>
                </div>
              )}
            </div>

            {/* Offer Cards List */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-slate-800">Available Bank Card Deals</p>

              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-slate-50 hover:bg-slate-100 rounded-xl p-3.5 border border-slate-200 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{offer.bankLogo}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                        {offer.badgeText}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{offer.title}</p>
                    <p className="text-[11px] text-slate-500 leading-tight">{offer.description}</p>
                    <div className="pt-1">
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                        {offer.code}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleApplyCoupon(offer.code)}
                    variant="outline"
                    className="text-xs font-bold border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 py-1.5 px-3 h-auto whitespace-nowrap"
                  >
                    Apply Deal
                  </Button>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default DynamicPricingEngine;
