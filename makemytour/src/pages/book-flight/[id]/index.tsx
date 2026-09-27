import { useRouter } from "next/router";

import {
  Plane,
  Luggage,
  Clock,
  Calendar,
  MapPin,
  CreditCard,
  AlertCircle,
  ChevronRight,
  Star,
  Info,
  ArrowRight,
  Tag,
  Snowflake,
  TrendingUp,
  CheckCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getflight,
  handleflightbooking,
  getPromotionalOffers,
  applyCouponCode,
  freezePrice,
  getDynamicPricing,
  getFreezeStatus,
  getUserPriceFreezes,
} from "@/api";
import { useDispatch, useSelector } from "react-redux";

interface Flight {
  id: string;
  _id?: string;
  flightName: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
  flightNo?: string;
  aircraft?: string;
  airline?: string;
  duration?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  cabinBaggage?: string;
  checkInBaggage?: string;
  taxes?: number;
  otherServices?: number;
  discounts?: number;
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket } from "lucide-react";
import SignupDialog from "@/components/SignupDialog";
import Loader from "@/components/Loader";
import { setUser } from "@/store";

const BookFlightPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [open, setopem] = useState(false);
  const user = useSelector((state: any) => state.user.user);
  const dispatch = useDispatch();

  // Dynamic Offers & Pricing state
  const [offers, setOffers] = useState<any[]>([]);
  const [couponCodeInput, setCouponCodeInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
    message: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState<boolean>(false);

  // Price Freeze Locker state
  const [priceFrozen, setPriceFrozen] = useState<any | null>(null);
  const [freezeLoading, setFreezeLoading] = useState<boolean>(false);

  // Price History graph modal state
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [dynamicPricingInfo, setDynamicPricingInfo] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const flightData = await getflight();
        const filteredData = flightData.filter((f: any) => (f.id === id || f._id === id));
        setFlights(filteredData);

        const offersData = await getPromotionalOffers();
        setOffers(offersData || []);

        if (filteredData.length > 0) {
          const target = filteredData[0];
          const priceInfo = await getDynamicPricing(
            target.id || target._id,
            "FLIGHT",
            target.price || 5500,
            "HIGH",
            "HOLIDAY_PEAK"
          );
          setDynamicPricingInfo(priceInfo);

          // Check if user has active price freeze for this item
          let found: any = null;
          if (typeof window !== "undefined") {
            try {
              const savedList = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
              found = savedList.find(
                (fr: any) =>
                  fr.itemId === (target.id || target._id) ||
                  (Boolean(router.query.freezeId) && fr.freezeId === router.query.freezeId)
              );
            } catch (e) { }
          }

          const freezeIdParam = router.query.freezeId as string;
          if (freezeIdParam && !found) {
            try {
              const remoteFreeze = await getFreezeStatus(freezeIdParam);
              if (remoteFreeze && remoteFreeze.active) found = remoteFreeze;
            } catch (e) {}
          }

          const userId = user?.id || user?._id;
          if (userId && !found) {
            try {
              const remoteList = await getUserPriceFreezes(userId);
              const remoteMatch = (remoteList || []).find(
                (fr: any) => (fr.itemId === (target.id || target._id) || fr.itemId === target.flightNo) && fr.active
              );
              if (remoteMatch) found = remoteMatch;
            } catch (e) {}
          }

          if (found) {
            setPriceFrozen(found);
          }
        }
      } catch (error) {
        console.error("Error fetching flight booking data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, user, router.query]);

  if (loading) {
    return <Loader />;
  }

  if (flights.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Flight Not Found</h2>
          <p className="text-gray-600 mb-4">No flight data available for ID: {id}</p>
          <Button onClick={() => router.push("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const flight = flights[0];

  const rawId = (flight.id || flight._id || '101').toUpperCase();
  const flightNo = flight.flightNo || (rawId.startsWith("FL-") ? rawId : `FL-${rawId.substring(0, 5)}`);
  const aircraft = flight.aircraft || "Airbus A320";
  const airline = flight.airline || flight.flightName;
  const duration = flight.duration || "3h 30m";
  const departureTerminal = flight.departureTerminal || `${flight.from} International Airport, Terminal T2`;
  const arrivalTerminal = flight.arrivalTerminal || `${flight.to} International Airport, Terminal T3`;
  const cabinBaggage = flight.cabinBaggage || "7 Kgs / Adult";
  const checkInBaggage = flight.checkInBaggage || "15 Kgs (1 piece only) / Adult";

  // Effective unit fare prioritizing Price Freeze, then Dynamic Pricing Rate, then Base Price
  const unitPrice = priceFrozen
    ? priceFrozen.frozenPrice
    : (dynamicPricingInfo ? dynamicPricingInfo.finalPrice : (flight.price || 5500));

  const baseTotalPrice = unitPrice * quantity;
  const taxesPerTicket = flight.taxes || Math.round(unitPrice * 0.15);
  const otherServicesPerTicket = flight.otherServices || 150;
  const initialDiscounts = (flight.discounts || 200) * quantity;

  const totalTaxes = taxesPerTicket * quantity;
  const totalOtherServices = otherServicesPerTicket * quantity;
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalDiscounts = initialDiscounts + couponDiscount;

  const grandTotal = Math.max(0, baseTotalPrice + totalTaxes + totalOtherServices - totalDiscounts);

  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleString("en-US", options);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = Number.parseInt(e.target.value);
    setQuantity(
      isNaN(value) ? 1 : Math.max(1, Math.min(value, flight.availableSeats || 1))
    );
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim();
    if (!code) return;
    setCouponApplying(true);
    setCouponError(null);

    const bookingSubtotal = baseTotalPrice;
    try {
      const res = await applyCouponCode(code, bookingSubtotal);
      if (res && res.success) {
        setAppliedCoupon({
          code: res.code,
          discountAmount: res.discountAmount,
          finalAmount: res.finalAmount,
          message: res.message,
        });
        setCouponCodeInput(res.code);
      } else {
        setCouponError(res?.message || "Invalid coupon code.");
      }
    } catch (err: any) {
      const errText = err?.response?.data?.message || err?.message || "Invalid coupon code for this booking.";
      setCouponError(errText);
    } finally {
      setCouponApplying(false);
    }
  };

  const handleFreezePrice = async () => {
    setFreezeLoading(true);
    try {
      const userId = user?.id || user?._id || "";
      const res = await freezePrice(
        flight.id || flight._id || "FL-101",
        `${flight.flightName} (${flight.from} ➔ ${flight.to})`,
        unitPrice,
        24,
        userId
      );
      if (res) {
        setPriceFrozen(res);
        if (typeof window !== "undefined") {
          try {
            const savedList = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
            const filtered = savedList.filter((f: any) => f.freezeId !== res.freezeId);
            localStorage.setItem("user_price_freezes", JSON.stringify([res, ...filtered]));
          } catch (e) { }
        }
      }
    } catch (err) {
      console.error("Failed to lock price:", err);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handlebooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await handleflightbooking(
        user?.id || user?._id,
        flight?.id || flight?._id,
        quantity,
        grandTotal
      );
      const updateuser = {
        ...user,
        bookings: [...(user?.bookings || []), data],
      };
      dispatch(setUser(updateuser));
      setopem(false);
      setQuantity(1);
      router.push("/profile");
    } catch (error) {
      console.error("Booking failed:", error);
    }
  };

  const BookingContent = () => (
    <DialogContent className="sm:max-w-[600px] bg-white">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold flex items-center">
          <Plane className="w-6 h-6 mr-2 text-blue-600" />
          Flight Booking Details
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="flightName" className="flex items-center">
              <Plane className="w-4 h-4 mr-2" />
              Flight Name
            </Label>
            <Input id="flightName" value={flight.flightName} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              From
            </Label>
            <Input id="from" value={flight.from} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              To
            </Label>
            <Input id="to" value={flight.to} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departureTime" className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Departure Time
            </Label>
            <Input
              id="departureTime"
              value={formatDate(flight.departureTime)}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrivalTime" className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Arrival Time
            </Label>
            <Input
              id="arrivalTime"
              value={formatDate(flight.arrivalTime)}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center">
              <Ticket className="w-4 h-4 mr-2" />
              Number of Tickets
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={flight.availableSeats}
              value={quantity}
              onChange={handleQuantityChange}
            />
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Fare Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Base Fare</span>
              <span className="font-medium">₹ {baseTotalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taxes and Surcharges</span>
              <span className="font-medium">₹ {totalTaxes.toLocaleString()}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center text-emerald-700 font-semibold">
                <span>Bank Coupon ('{appliedCoupon.code}')</span>
                <span>- ₹ {appliedCoupon.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="font-bold text-lg text-emerald-700">
                  ₹ {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Button className="w-full mt-4 bg-red-600 hover:bg-red-700" onClick={handlebooking}>
        Proceed to Payment
      </Button>
    </DialogContent>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Flight Details Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div>
                  <div className="flex items-center flex-wrap gap-4 mb-2">
                    <h2 className="text-lg font-bold flex items-center">
                      <span>{flight.from}</span>
                      <ArrowRight className="w-5 h-5 mx-2" />
                      <span>{flight.to}</span>
                    </h2>
                    <span className="bg-green-100 text-green-600 text-xs px-3 py-1 rounded-full font-medium">
                      CANCELLATION FEES APPLY
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(flight.departureTime)}</span>
                    <span className="mx-2">•</span>
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Non Stop - {duration}</span>
                  </div>
                </div>

                {/* Price Lock & Trend Graph Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleFreezePrice}
                    disabled={freezeLoading}
                    variant="outline"
                    className="border-cyan-500 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 text-xs font-bold flex items-center gap-1"
                  >
                    <Snowflake className="w-4 h-4 text-cyan-600" />
                    {priceFrozen ? "Fare Locked 24h" : "Lock Fare 24h"}
                  </Button>
                  <Button
                    onClick={() => setShowHistoryModal(true)}
                    variant="outline"
                    className="border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1"
                  >
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Price Trend
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plane className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">{flight.flightName} ({airline})</div>
                  <div className="text-sm text-gray-600">
                    {flightNo} • {aircraft}
                  </div>
                </div>
                <div className="ml-auto text-sm">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                    Economy
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-nowrap justify-between items-start gap-6 border-t pt-6">
                <div>
                  <div className="text-xl font-bold">
                    {formatDate(flight.departureTime)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 flex items-start">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
                    {departureTerminal}
                  </div>
                </div>
                <div className="text-center flex-shrink-0">
                  <div className="text-sm text-gray-600 mb-1">{duration}</div>
                  <div className="w-32 h-0.5 bg-gray-300 relative my-2">
                    <div className="absolute -top-2 right-0 w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                      <Plane className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">Non-stop</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    {formatDate(flight.arrivalTime)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 flex items-start justify-end">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
                    {arrivalTerminal}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 mt-6 text-sm text-gray-600 border-t pt-4">
                <div className="flex items-center">
                  <Luggage className="w-5 h-5 mr-2 text-gray-500" />
                  <span>Cabin Baggage: {cabinBaggage}</span>
                </div>
                <div className="flex items-center">
                  <Luggage className="w-5 h-5 mr-2 text-gray-500" />
                  <span>Check-in Baggage: {checkInBaggage}</span>
                </div>
              </div>
            </div>

            {/* Price Freeze Active Banner if locked */}
            {priceFrozen && (
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-cyan-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Snowflake className="w-6 h-6 text-cyan-400 animate-spin" />
                  <div>
                    <h3 className="font-extrabold text-sm text-cyan-300">Fare Locked at ₹{priceFrozen.frozenPrice.toLocaleString()}</h3>
                    <p className="text-xs text-slate-300">Protected against future surge hikes for 24 hours.</p>
                  </div>
                </div>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full font-mono font-bold">
                  FARE LOCKED
                </span>
              </div>
            )}
          </div>

          {/* Fare Summary & Bank Coupon Cards Right Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24 space-y-6">
              <h2 className="text-lg font-bold flex items-center border-b pb-3">
                <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                Fare Summary
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Base Fare ({quantity} Ticket{quantity > 1 ? 's' : ''})</span>
                  <span className="font-medium">₹ {baseTotalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taxes and Surcharges</span>
                  <span className="font-medium">₹ {totalTaxes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Other Services</span>
                  <span className="font-medium">₹ {totalOtherServices.toLocaleString()}</span>
                </div>
                {initialDiscounts > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="font-medium">Promotional Discount</span>
                    <span className="font-medium">- ₹ {initialDiscounts.toLocaleString()}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-600 font-bold">
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                    <span>- ₹ {appliedCoupon.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total Amount</span>
                    <span className="font-bold text-lg text-emerald-700">
                      ₹ {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Card Offers & Coupon Apply Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>Bank Offers & Coupon Code</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code (HDFC10, SBISAVE)"
                    value={couponCodeInput}
                    onChange={(e) => {
                      setCouponCodeInput(e.target.value);
                      setCouponError(null);
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Button
                    onClick={() => handleApplyCoupon()}
                    disabled={couponApplying}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 h-auto"
                  >
                    {couponApplying ? "Applying..." : "Apply"}
                  </Button>
                </div>

                {appliedCoupon && (
                  <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-lg text-xs text-emerald-900 space-y-0.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Code '{appliedCoupon.code}' Applied!
                      </span>
                      <span>-₹{appliedCoupon.discountAmount}</span>
                    </div>
                  </div>
                )}

                {couponError && (
                  <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}

                {/* Bank Card Deals List */}
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <p className="text-[11px] font-bold text-slate-700">Select Bank Card Deal:</p>
                  {offers.map((offer) => (
                    <div
                      key={offer.id || offer.code}
                      className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-emerald-500 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-900 text-[11px]">{offer.bankName}</span>
                        <p className="text-[10px] text-slate-500">{offer.badgeText}</p>
                      </div>
                      <Button
                        onClick={() => handleApplyCoupon(offer.code)}
                        variant="outline"
                        className="text-[10px] font-bold border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-2 py-1 h-auto"
                      >
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Dialog open={open} onOpenChange={setopem}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-base font-bold shadow-md">
                    Proceed to Booking
                  </Button>
                </DialogTrigger>
                {user ? (
                  <BookingContent />
                ) : (
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Login Required</DialogTitle>
                    </DialogHeader>
                    <p>Please log in to continue with your flight booking.</p>
                    <SignupDialog
                      trigger={
                        <Button className="w-full">Log In / Sign Up</Button>
                      }
                    />
                  </DialogContent>
                )}
              </Dialog>
            </div>
          </div>

        </div>
      </div>

      {/* Price Trend History Modal */}
      {showHistoryModal && dynamicPricingInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Flight Fare History & Trend</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              7-Day historical fare trend for {flight.flightName} ({flight.from} ➔ {flight.to}).
            </p>

            <div className="bg-slate-900 rounded-xl p-4 text-white space-y-3">
              <div className="h-36 w-full flex items-end justify-between gap-2 pt-4">
                {dynamicPricingInfo.priceHistory.map((point: any, idx: number) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-slate-300 font-mono">₹{point.price}</span>
                    <div className="w-full bg-slate-800 rounded-t h-24 flex items-end p-0.5">
                      <div
                        style={{ height: `${Math.max(20, Math.min(100, (point.price / 8000) * 100))}%` }}
                        className={`w-full rounded-t ${point.isCurrent ? "bg-emerald-400" : "bg-indigo-500"}`}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400">{point.dayLabel}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowHistoryModal(false)} className="bg-slate-900 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookFlightPage;
