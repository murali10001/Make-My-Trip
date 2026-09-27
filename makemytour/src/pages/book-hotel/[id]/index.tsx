import { useRouter } from "next/router";
import {
  Star,
  MapPin,
  School as Pool,
  UtensilsCrossed,
  Wine,
  Power,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  CreditCard,
  Ticket,
  Home,
  CheckCircle2,
  Tag,
  Snowflake,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Building2,
  X,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  gethotel,
  handlehotelbooking,
  getPromotionalOffers,
  applyCouponCode,
  freezePrice,
  getDynamicPricing,
  getFreezeStatus,
  getUserPriceFreezes,
} from "@/api";

interface Hotel {
  id: string;
  _id?: string;
  hotelName: string;
  location: string;
  pricePerNight: number;
  availableRooms: number;
  amenities: string;
  imageUrl?: string;
  imageUrls?: string[];
  description?: string;
  rating?: number;
  taxes?: number;
  discountedPrice?: number;
  roomType?: string;
  roomFeatures?: string;
  propertyPhotos?: number;
  guestPhotos?: number;
  reviewsCount?: number;
  reviewsRating?: number;
  reviewsText?: string;
  distance?: string;
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
import { useDispatch, useSelector } from "react-redux";
import SignupDialog from "@/components/SignupDialog";
import Loader from "@/components/Loader";
import { setUser } from "@/store";

import HotelRoomPicker from "@/components/HotelRoomPicker";

const BookHotelPage = () => {
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const { id } = router.query;
  const [hotels, sethotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: any) => state.user.user);
  const [open, setopem] = useState(false);
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

  // Room type selection state
  const [selectedRoom, setSelectedRoom] = useState<{ roomTypeName: string; priceUpgradeAddon: number } | null>(null);

  useEffect(() => {
    const fetchhotels = async () => {
      try {
        const data = await gethotel();
        const filteredData = data.filter((hotel: any) => (hotel.id === id || hotel._id === id));
        sethotels(filteredData);

        const offersData = await getPromotionalOffers();
        setOffers(offersData || []);

        if (filteredData.length > 0) {
          const target = filteredData[0];
          const demandParam = (router.query.demand as string) || "HIGH";
          const seasonParam = (router.query.season as string) || "HOLIDAY_PEAK";

          const priceInfo = await getDynamicPricing(
            target.id || target._id,
            "HOTEL",
            target.pricePerNight || 4200,
            demandParam,
            seasonParam
          );
          setDynamicPricingInfo(priceInfo);

          // Check active price freeze for this item
          let found: any = null;
          if (typeof window !== "undefined") {
            try {
              const savedList = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
              found = savedList.find(
                (fr: any) =>
                  fr.itemId === (target.id || target._id) ||
                  (Boolean(router.query.freezeId) && fr.freezeId === router.query.freezeId)
              );
            } catch (e) {}
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
                (fr: any) => fr.itemId === (target.id || target._id) && fr.active
              );
              if (remoteMatch) found = remoteMatch;
            } catch (e) {}
          }

          if (found) {
            setPriceFrozen(found);
          }
        }
      } catch (error) {
        console.error("Error fetching hotels:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchhotels();
  }, [id, router.query]);

  if (loading) {
    return <Loader />;
  }

  if (hotels.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Hotel Not Found</h2>
          <p className="text-gray-600 mb-4">No hotel information could be found for ID: {id}</p>
          <Button onClick={() => router.push("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const hotel = hotels[0];

  const mainImage = hotel.imageUrl || (hotel.imageUrls && hotel.imageUrls[0]) || "";
  const rating = Math.min(5, Math.max(1, Math.round(hotel.rating || 4)));
  const description = hotel.description || `${hotel.hotelName} is located in ${hotel.location}, providing comfort, modern amenities, and pleasant accommodation.`;
  const amenitiesList = hotel.amenities ? hotel.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [];
  const roomType = hotel.roomType || "Standard Room";

  // Effective unit rate prioritizing Price Freeze, then Dynamic Pricing Rate, then Base Price
  const basePricePerNight = priceFrozen
    ? priceFrozen.frozenPrice
    : (dynamicPricingInfo ? dynamicPricingInfo.finalPrice : (hotel.pricePerNight || 4200));

  const taxesPerNight = hotel.taxes || Math.round(basePricePerNight * 0.12);
  const initialDiscountPerNight = hotel.discountedPrice || Math.round(basePricePerNight * 0.05);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = Number.parseInt(e.target.value);
    setQuantity(
      isNaN(value) ? 1 : Math.max(1, Math.min(value, hotel.availableRooms || 1))
    );
  };

  const totalPrice = basePricePerNight * quantity;
  const totalTaxes = taxesPerNight * quantity;
  const initialTotalDiscounts = initialDiscountPerNight * quantity;
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalDiscounts = initialTotalDiscounts + couponDiscount;
  const roomUpgradeTotal = (selectedRoom?.priceUpgradeAddon || 0) * quantity;

  const grandTotal = Math.max(0, totalPrice + roomUpgradeTotal + totalTaxes - totalDiscounts);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim();
    if (!code) return;
    setCouponApplying(true);
    setCouponError(null);

    const bookingSubtotal = totalPrice;
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
        hotel.id || hotel._id || "HT-101",
        `${hotel.hotelName} (${hotel.location})`,
        basePricePerNight,
        24,
        userId
      );
      if (res) {
        setPriceFrozen(res);
        if (typeof window !== "undefined") {
          try {
            const saved = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
            const updated = [res, ...saved.filter((x: any) => x.freezeId !== res.freezeId)];
            localStorage.setItem("user_price_freezes", JSON.stringify(updated));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Failed to lock hotel rate:", err);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handlebooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?.id || user?._id;
    if (!userId) {
      alert("Please log in to complete your hotel booking.");
      router.push("/login");
      return;
    }
    try {
      const data = await handlehotelbooking(
        userId,
        hotel?.id || hotel?._id,
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
      console.error("Booking error:", error);
    }
  };

  const BookingContent = () => (
    <DialogContent className="sm:max-w-[600px] bg-white">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold flex items-center">
          <Building2 className="w-6 h-6 mr-2 text-blue-600" />
          Hotel Booking Confirmation
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hotelName">Hotel Name</Label>
            <Input id="hotelName" value={hotel.hotelName} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={hotel.location} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roomType">Room Type</Label>
            <Input id="roomType" value={roomType} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Rooms</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={hotel.availableRooms}
              value={quantity}
              onChange={handleQuantityChange}
            />
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Room Rate ({quantity} Room{quantity > 1 ? 's' : ''})</span>
            <span className="font-medium">₹ {totalPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Taxes & Fees</span>
            <span className="font-medium">₹ {totalTaxes.toLocaleString()}</span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Bank Coupon ('{appliedCoupon.code}')</span>
              <span>- ₹ {appliedCoupon.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold text-base">
            <span>Total Payable</span>
            <span className="text-emerald-700">₹ {grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={handlebooking}>
        Confirm & Pay Now
      </Button>
    </DialogContent>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        
        {/* Header Title Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded font-bold">
                RECOMMENDED HOTEL
              </span>
              <span className="flex text-amber-400">
                {[...Array(rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{hotel.hotelName}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {hotel.location}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleFreezePrice}
              disabled={freezeLoading}
              variant="outline"
              className="border-cyan-500 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 text-xs font-bold"
            >
              <Snowflake className="w-4 h-4 text-cyan-600 mr-1" />
              {priceFrozen ? "Rate Locked 24h" : "Lock Room Rate 24h"}
            </Button>
            <Button
              onClick={() => setShowHistoryModal(true)}
              variant="outline"
              className="border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold"
            >
              <TrendingUp className="w-4 h-4 text-indigo-600 mr-1" />
              Rate History
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Image & Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              {mainImage && (
                <img
                  src={mainImage}
                  alt={hotel.hotelName}
                  className="w-full h-80 object-cover rounded-xl shadow-xs"
                />
              )}
              <h2 className="font-bold text-lg text-slate-900">About {hotel.hotelName}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
              
              <div className="pt-2 border-t">
                <p className="text-xs font-bold text-slate-800 mb-2">Amenities:</p>
                <div className="flex flex-wrap gap-2">
                  {amenitiesList.map((a, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Hotel Room Picker & 3D Tour */}
            <HotelRoomPicker
              hotelId={hotel.id || hotel._id || "ht-101"}
              hotelName={hotel.hotelName || "Hotel"}
              userId={user?.id || user?._id || ""}
              userEmail={user?.email || ""}
              onRoomSelect={(room) => setSelectedRoom(room)}
              selectedRoomType={selectedRoom?.roomTypeName || ""}
            />

            {priceFrozen && (
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-cyan-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Snowflake className="w-6 h-6 text-cyan-400 animate-spin" />
                  <div>
                    <h3 className="font-extrabold text-sm text-cyan-300">Room Rate Locked at ₹{priceFrozen.frozenPrice.toLocaleString()}/night</h3>
                    <p className="text-xs text-slate-300">Protected against future surge hikes for 24 hours.</p>
                  </div>
                </div>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full font-mono font-bold">
                  LOCKED
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Rate Summary & Bank Coupons */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 sticky top-24 space-y-6">
              <h2 className="text-lg font-bold border-b pb-3 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-slate-600" />
                Booking Rate Summary
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Room Rate ({quantity} Room{quantity > 1 ? 's' : ''})</span>
                  <span className="font-medium">₹ {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Taxes & Fees</span>
                  <span className="font-medium">₹ {totalTaxes.toLocaleString()}</span>
                </div>
                {selectedRoom && (
                  <div className="flex justify-between items-center bg-indigo-50 p-2 rounded-lg border border-indigo-200 text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      {selectedRoom.roomTypeName} Option
                    </span>
                    <span className="text-indigo-800 font-extrabold">
                      {selectedRoom.priceUpgradeAddon > 0 ? `+ ₹ ${roomUpgradeTotal.toLocaleString()}` : "Included (₹0)"}
                    </span>
                  </div>
                )}
                {initialTotalDiscounts > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promotional Discount</span>
                    <span>- ₹ {initialTotalDiscounts.toLocaleString()}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                    <span>- ₹ {appliedCoupon.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">₹ {grandTotal.toLocaleString()}</span>
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
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-bold shadow-md">
                    Book Room Now
                  </Button>
                </DialogTrigger>
                {user ? (
                  <BookingContent />
                ) : (
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>Login Required</DialogTitle>
                    </DialogHeader>
                    <p>Please log in to continue with your hotel room booking.</p>
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
                <h3 className="font-extrabold text-slate-900 text-base">Hotel Rate History & Trend</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              7-Day historical rate trend for {hotel.hotelName} ({hotel.location}).
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

export default BookHotelPage;
