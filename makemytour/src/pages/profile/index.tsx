import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  Edit2,
  Calendar,
  CreditCard,
  X,
  Check,
  LogOut,
  Plane,
  Building2,
  Snowflake,
  Clock,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  FileText,
  TrendingDown,
  DollarSign,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { clearUser, setUser } from "@/store";
import {
  editprofile,
  getUserPriceFreezes,
  removePriceFreeze,
  calculateRefundPreview,
  submitCancellationAndRefund,
  getUserRefunds,
  getuserbyemail,
} from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PREDEFINED_CANCELLATION_REASONS = [
  "Change of travel plans",
  "Personal / Health emergency",
  "Found a better deal / price drop",
  "Flight / Travel schedule clash",
  "Other / Operational reasons",
];

const ProfileDashboardPage = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"bookings" | "refunds" | "freezes">("bookings");
  const [frozenPrices, setFrozenPrices] = useState<any[]>([]);
  const [userRefunds, setUserRefunds] = useState<any[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState<boolean>(false);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [cancellationComment, setCancellationComment] = useState<string>("");
  const [refundPreview, setRefundPreview] = useState<any | null>(null);
  const [calculatingPreview, setCalculatingPreview] = useState<boolean>(false);
  const [submittingCancel, setSubmittingCancel] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    firstName: user?.firstName ? user?.firstName : "",
    lastName: user?.lastName ? user?.lastName : "",
    email: user?.email ? user?.email : "",
    phoneNumber: user?.phoneNumber ? user?.phoneNumber : "",
  });

  const logout = () => {
    dispatch(clearUser());
    router.push("/");
  };

  const fetchUserDataAndRefunds = async () => {
    const userId = user?.id || user?._id || "";
    if (!userId) return;

    setLoadingRefunds(true);
    try {
      // Fetch latest user refund records
      const refunds = await getUserRefunds(userId);
      setUserRefunds(refunds || []);

      // Refresh user profile details from backend to sync bookings status
      if (user?.email) {
        const freshUser = await getuserbyemail(user.email);
        if (freshUser) {
          dispatch(setUser({ ...user, ...freshUser }));
        }
      }
    } catch (err) {
      console.error("Failed to load user refunds or profile:", err);
    } finally {
      setLoadingRefunds(false);
    }
  };

  useEffect(() => {
    const fetchUserFreezes = async () => {
      try {
        const userId = user?.id || user?._id || "";
        const apiFreezes = userId ? await getUserPriceFreezes(userId) : [];

        let localFreezes: any[] = [];
        if (typeof window !== "undefined") {
          try {
            localFreezes = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
          } catch (e) {}
        }

        const map = new Map();
        (apiFreezes || []).forEach((f: any) => {
          if (f && f.freezeId && (f.userId === userId || !userId || !f.userId)) {
            map.set(f.freezeId, f);
          }
        });
        (localFreezes || []).forEach((f: any) => {
          if (f && f.freezeId && (f.userId === userId || !f.userId)) {
            if (!map.has(f.freezeId)) map.set(f.freezeId, f);
          }
        });

        setFrozenPrices(Array.from(map.values()));
      } catch (err) {
        console.error("Failed to load user price freezes in profile:", err);
      }
    };

    fetchUserFreezes();
    fetchUserDataAndRefunds();
  }, [user?.email]);

  useEffect(() => {
    if (activeTab === "refunds") {
      fetchUserDataAndRefunds();
      const interval = setInterval(fetchUserDataAndRefunds, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, user?.id, user?._id]);


  const handleRemoveFreeze = async (freezeId: string) => {
    setFrozenPrices((prev) => prev.filter((f: any) => f.freezeId !== freezeId));

    if (typeof window !== "undefined") {
      try {
        const savedList = JSON.parse(localStorage.getItem("user_price_freezes") || "[]");
        const updatedList = savedList.filter((f: any) => f.freezeId !== freezeId);
        localStorage.setItem("user_price_freezes", JSON.stringify(updatedList));
      } catch (e) {
        console.error("Error updating localStorage", e);
      }
    }

    try {
      await removePriceFreeze(freezeId);
    } catch (e) {
      console.error("Error deleting price freeze", e);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const userId = user?.id || user?._id;
      const data = await editprofile(
        userId,
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.phoneNumber
      );
      if (data) {
        const mergedUser = {
          ...user,
          ...data,
          bookings: data.bookings && data.bookings.length > 0 ? data.bookings : user?.bookings || [],
        };
        dispatch(setUser(mergedUser));
      }
      setIsEditing(false);
    } catch (error) {
      setIsEditing(false);
    }
  };

  // Trigger Cancellation Modal & Calculate Refund Breakdown Preview
  const handleOpenCancelModal = async (booking: any) => {
    setSelectedBookingForCancel(booking);
    setCancellationReason(PREDEFINED_CANCELLATION_REASONS[0]);
    setCancellationComment("");
    setCancelError(null);
    setCancelSuccessMsg(null);
    setRefundPreview(null);
    setCancelModalOpen(true);

    const userId = user?.id || user?._id || "";
    const bookingId = booking?.bookingId || booking?.id || "";

    if (userId && bookingId) {
      setCalculatingPreview(true);
      try {
        const preview = await calculateRefundPreview(userId, bookingId);
        setRefundPreview(preview);
      } catch (err: any) {
        // Fallback local preview based on 50% / 80% rule if API fails
        const total = booking?.totalPrice || booking?.price || 0;
        const refundAmt = Math.round(total * 0.5);
        setRefundPreview({
          originalAmount: total,
          refundPercentage: 50.0,
          refundAmount: refundAmt,
          deductionAmount: total - refundAmt,
          policyApplied: "24-Hour Reservation Policy (50% Refund)",
        });
      } finally {
        setCalculatingPreview(false);
      }
    }
  };

  // Submit Cancellation Request
  const handleConfirmCancellation = async () => {
    if (!cancellationReason) {
      setCancelError("Please select a valid cancellation reason from the dropdown menu.");
      return;
    }

    const userId = user?.id || user?._id || "";
    const bookingId = selectedBookingForCancel?.bookingId || selectedBookingForCancel?.id || "";

    if (!userId || !bookingId) {
      setCancelError("Invalid booking or user session. Please re-login.");
      return;
    }

    setSubmittingCancel(true);
    setCancelError(null);

    try {
      const refundRecord = await submitCancellationAndRefund(
        userId,
        bookingId,
        cancellationReason,
        cancellationComment
      );

      setCancelSuccessMsg(
        `Booking ${bookingId} cancelled successfully! Refund Request ID: ${refundRecord?.refundId || 'RF-SUCCESS'}`
      );

      // Refresh refund records and user profile
      await fetchUserDataAndRefunds();

      setTimeout(() => {
        setCancelModalOpen(false);
        setActiveTab("refunds");
      }, 1800);
    } catch (err: any) {
      setCancelError(err.message || "Failed to process cancellation. Please try again.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-8 pb-16 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl shadow-xl p-6 text-white border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-cyan-400" />
              <h1 className="text-2xl font-black tracking-tight">
                Welcome back, {user?.firstName || "Traveler"}!
              </h1>
            </div>
            <p className="text-xs text-slate-300">
              Manage your active bookings, price locks, and track live cancellation refund status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === "bookings"
                  ? "bg-red-500 text-white shadow-md"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300"
              }`}
            >
              My Bookings ({user?.bookings?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("refunds")}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === "refunds"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refund Tracker ({userRefunds.length})
            </button>
            <button
              onClick={() => setActiveTab("freezes")}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === "freezes"
                  ? "bg-cyan-400 text-slate-950 shadow-md"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              Price Locks ({frozenPrices.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-900">User Profile</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-red-600 flex items-center space-x-1 hover:text-red-700 text-xs font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={userData.firstName}
                      onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={userData.lastName}
                      onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={userData.phoneNumber}
                      onChange={(e) => setUserData({ ...userData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-bold flex items-center justify-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition-colors font-bold flex items-center justify-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl">
                    <User className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-slate-500 text-[10px]">Verified Account</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <p className="text-slate-700 font-medium">{user?.email}</p>
                  </div>
                  <div className="flex items-center space-x-3 p-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <p className="text-slate-700 font-medium">{user?.phoneNumber || "+91 9876543210"}</p>
                  </div>
                  <button
                    className="w-full mt-4 flex items-center justify-center space-x-2 text-red-600 hover:text-red-700 font-bold py-2 rounded-xl border border-red-100 hover:bg-red-50 transition-colors"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Dashboard Content Tabs */}
          <div className="md:col-span-2 space-y-6">
            {/* TAB 1: My Bookings */}
            {activeTab === "bookings" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">My Travel Bookings</h2>
                    <p className="text-xs text-slate-500">
                      View booking details, check-in status, and manage cancellations/refunds.
                    </p>
                  </div>
                  <span className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1 rounded-full">
                    {user?.bookings?.length || 0} Total Bookings
                  </span>
                </div>

                <div className="space-y-4">
                  {user?.bookings && user.bookings.length > 0 ? (
                    user.bookings.map((booking: any, index: number) => {
                      const isCancelled = booking?.status === "CANCELLED";
                      const bookingId = booking?.bookingId || booking?.id || `BK-${index + 1}`;

                      return (
                        <div
                          key={bookingId || index}
                          className={`border rounded-2xl p-5 transition-all ${
                            isCancelled
                              ? "bg-slate-50/80 border-slate-200 opacity-90"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              {booking?.type === "Flight" ? (
                                <div className="bg-blue-100 p-3 rounded-xl">
                                  <Plane className="w-6 h-6 text-blue-600" />
                                </div>
                              ) : (
                                <div className="bg-emerald-100 p-3 rounded-xl">
                                  <Building2 className="w-6 h-6 text-emerald-600" />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-slate-900 text-base">
                                    {booking?.type || "Booking"}
                                  </h3>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded font-bold">
                                    ID: {bookingId}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {booking?.type === "Flight" ? `${booking?.quantity || 1} Ticket(s)` : `${booking?.quantity || 1} Room(s)`} • Reservation Date: {formatDate(booking?.date)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="font-black text-slate-900 text-lg">
                                ₹{(booking?.totalPrice || booking?.price || 0).toLocaleString("en-IN")}
                              </p>
                              {isCancelled ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                                  CANCELLED
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  CONFIRMED
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                            <div className="flex items-center space-x-2 text-slate-600">
                              <CreditCard className="w-4 h-4 text-emerald-600" />
                              <span>Payment Status: <strong className="text-slate-900">Paid & Confirmed</strong></span>
                            </div>

                            {!isCancelled ? (
                              <button
                                onClick={() => handleOpenCancelModal(booking)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                                Cancel Booking & Request Refund
                              </button>
                            ) : (
                              <button
                                onClick={() => setActiveTab("refunds")}
                                className="text-amber-600 hover:text-amber-700 font-bold text-xs flex items-center gap-1"
                              >
                                <span>View Refund Tracker</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                      <p className="text-base font-bold text-slate-800">No active bookings found</p>
                      <p className="text-xs text-slate-500 mt-1">Bookings made will automatically appear in your dashboard.</p>
                      <button
                        onClick={() => router.push("/")}
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
                      >
                        Explore Flights & Hotels
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Live Refund Status Tracker */}
            {activeTab === "refunds" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-amber-500" />
                      Live Refund Status Tracker
                    </h2>
                    <p className="text-xs text-slate-500">
                      Track cancellation requests, refund progress, and estimated payout timelines.
                    </p>
                  </div>
                  <button
                    onClick={fetchUserDataAndRefunds}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
                    title="Refresh Refund Status"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingRefunds ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="space-y-6">
                  {userRefunds.length > 0 ? (
                    userRefunds.map((rf: any, index: number) => {
                      const isCompleted = rf.status === "COMPLETED";
                      const isProcessed = rf.status === "PROCESSED";
                      const isPending = rf.status === "PENDING" || !rf.status;

                      let currentStep = rf.currentStep || (isCompleted ? 3 : isProcessed ? 2 : 1);

                      return (
                        <div
                          key={rf.refundId || index}
                          className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold">
                                  {rf.refundId}
                                </span>
                                <span className="text-xs text-slate-500">
                                  Booking ID: <strong>{rf.bookingId}</strong> ({rf.bookingType})
                                </span>
                              </div>
                              <h3 className="font-bold text-slate-900 text-sm mt-1">
                                Reason: "{rf.cancellationReason || 'Change of travel plans'}"
                              </h3>
                            </div>

                            <div className="sm:text-right">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border ${
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : isProcessed
                                    ? "bg-blue-100 text-blue-800 border-blue-300"
                                    : "bg-amber-100 text-amber-800 border-amber-300"
                                }`}
                              >
                                {rf.status || "PENDING"}
                              </span>
                              <p className="text-base font-black text-slate-900 mt-1">
                                Refund: ₹{(rf.refundAmount || 0).toLocaleString("en-IN")}
                                <span className="text-xs text-slate-500 font-normal"> (Original: ₹{(rf.originalAmount || 0).toLocaleString("en-IN")})</span>
                              </p>
                            </div>
                          </div>

                          {/* Predefined Policy Notice */}
                          <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">{rf.policyApplied || "24-Hour Reservation Policy Applied"}</p>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                {rf.refundPercentage || 50}% refund calculated automatically based on cancellation timeframe. {rf.estimatedCompletionDate || "Expected in 2-3 business days"}
                              </p>
                            </div>
                          </div>

                          {/* Interactive Step Timeline Bar */}
                          <div className="pt-2">
                            <p className="text-xs font-bold text-slate-700 mb-3">Live Progress Tracker:</p>
                            <div className="grid grid-cols-3 gap-2 text-center relative">
                              {/* Step 1 */}
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                  <Check className="w-4 h-4" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-800 mt-1">Request Received</span>
                                <span className="text-[9px] text-slate-400">{rf.requestDate?.split(" ")[0] || "Done"}</span>
                              </div>

                              {/* Step 2 */}
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                                    currentStep >= 2
                                      ? "bg-emerald-500 text-white"
                                      : "bg-amber-500 text-white animate-pulse"
                                  }`}
                                >
                                  {currentStep >= 2 ? <Check className="w-4 h-4" /> : "2"}
                                </div>
                                <span className="text-[11px] font-bold text-slate-800 mt-1">Bank Processing</span>
                                <span className="text-[9px] text-slate-500">{currentStep >= 2 ? "Verified" : "In Progress"}</span>
                              </div>

                              {/* Step 3 */}
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                                    currentStep >= 3 ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600"
                                  }`}
                                >
                                  {currentStep >= 3 ? <Check className="w-4 h-4" /> : "3"}
                                </div>
                                <span className="text-[11px] font-bold text-slate-800 mt-1">Refund Credited</span>
                                <span className="text-[9px] text-slate-400">{currentStep >= 3 ? "Completed" : "Pending"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <RotateCcw className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                      <p className="text-base font-bold text-slate-800">No active refund requests</p>
                      <p className="text-xs text-slate-500 mt-1">When you cancel a booking, live refund updates will be tracked here.</p>
                      <button
                        onClick={() => setActiveTab("bookings")}
                        className="mt-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl"
                      >
                        View My Bookings
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Price Freeze Locker */}
            {activeTab === "freezes" && (
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl shadow-xl p-6 border border-blue-800 space-y-6">
                <div className="flex items-center justify-between border-b border-blue-800/60 pb-4">
                  <div className="flex items-center gap-2">
                    <Snowflake className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h2 className="text-xl font-bold">My Locked Fares & Price Freezes</h2>
                      <p className="text-xs text-slate-300">Protected against market surge increases for 24 hours.</p>
                    </div>
                  </div>
                  <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full font-mono font-bold">
                    {frozenPrices.length} Active Locks
                  </span>
                </div>

                <div className="space-y-4">
                  {frozenPrices.length > 0 ? (
                    frozenPrices.map((freeze: any, index: number) => (
                      <div
                        key={freeze.freezeId || index}
                        className="bg-blue-950/80 rounded-xl p-4 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative pr-12"
                      >
                        <button
                          onClick={() => handleRemoveFreeze(freeze.freezeId)}
                          title="Remove Frozen Price"
                          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-blue-900/80 transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                              {freeze.freezeId}
                            </span>
                            <span className="text-xs text-slate-300 flex items-center gap-1 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-cyan-400" /> 24h Protection Active
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-base mt-1">{freeze.itemTitle || "Flight / Hotel Booking"}</h3>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-cyan-300">
                              ₹{(freeze.frozenPrice || 0).toLocaleString("en-IN")}
                            </span>
                            {freeze.originalPrice > freeze.frozenPrice && (
                              <span className="text-xs text-slate-400 line-through">
                                Surge: ₹{freeze.originalPrice.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2">
                          <button
                            onClick={() => {
                              if (freeze.itemId && freeze.itemId.startsWith("HT")) {
                                router.push(`/book-hotel/${freeze.itemId}?freezeId=${freeze.freezeId}`);
                              } else {
                                router.push(`/book-flight/${freeze.itemId || 'FL-101'}?freezeId=${freeze.freezeId}`);
                              }
                            }}
                            className="bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                          >
                            <ShieldCheck className="w-4 h-4 text-slate-950" />
                            Book Now at Locked Fare
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-300 bg-blue-950/40 rounded-xl border border-blue-800/40">
                      <p className="text-sm font-semibold">No price freeze locks currently active</p>
                      <p className="text-xs text-slate-400 mt-1">Visit Dynamic Rates & Offers to lock prices for 24 hours.</p>
                      <button
                        onClick={() => router.push("/dynamic-pricing")}
                        className="mt-3 bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg"
                      >
                        Lock a Fare Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CANCELLATION & REFUND MODAL */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-500" />
              Cancel Booking & Calculate Refund
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Review predefined cancellation policies and choose your reason to initiate an automatic refund.
            </DialogDescription>
          </DialogHeader>

          {cancelSuccessMsg ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 text-center space-y-2 py-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm">{cancelSuccessMsg}</p>
              <p className="text-xs text-emerald-700">Redirecting to Refund Status Tracker...</p>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Booking Info Header */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {selectedBookingForCancel?.type || "Booking"} ({selectedBookingForCancel?.bookingId || selectedBookingForCancel?.id})
                  </p>
                  <p className="text-slate-500">Reservation Date: {formatDate(selectedBookingForCancel?.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Total Paid</p>
                  <p className="font-extrabold text-slate-900 text-sm">
                    ₹{(selectedBookingForCancel?.totalPrice || selectedBookingForCancel?.price || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Dynamic Policy & Refund Breakdown */}
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Refund Policy Applied:
                  </span>
                  <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded font-mono text-[11px]">
                    {refundPreview?.policyApplied || "24-Hour Policy (50% Refund)"}
                  </span>
                </div>

                <div className="border-t border-amber-200/60 pt-2 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Original Booking Total:</span>
                    <span>₹{(refundPreview?.originalAmount || selectedBookingForCancel?.totalPrice || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Cancellation Fee / Deduction ({100 - (refundPreview?.refundPercentage || 50)}%):</span>
                    <span>- ₹{(refundPreview?.deductionAmount || Math.round((selectedBookingForCancel?.totalPrice || 0) * 0.5)).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold text-sm border-t border-amber-200/60 pt-1">
                    <span>Estimated Refund Amount:</span>
                    <span>₹{(refundPreview?.refundAmount || Math.round((selectedBookingForCancel?.totalPrice || 0) * 0.5)).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Predefined Dropdown Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Select Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-medium text-slate-900"
                >
                  {PREDEFINED_CANCELLATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Comments */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Additional Comments (Optional)</label>
                <textarea
                  value={cancellationComment}
                  onChange={(e) => setCancellationComment(e.target.value)}
                  placeholder="Provide any extra context..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {cancelError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCancelModalOpen(false)}
                  disabled={submittingCancel}
                  className="flex-1 text-xs border-slate-300"
                >
                  Keep Booking
                </Button>
                <Button
                  onClick={handleConfirmCancellation}
                  disabled={submittingCancel || calculatingPreview}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  {submittingCancel ? "Processing..." : "Confirm & Submit Refund"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileDashboardPage;
