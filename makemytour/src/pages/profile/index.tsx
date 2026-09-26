import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  Edit2,
  MapPin,
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
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { clearUser, setUser } from "@/store";
import { editprofile, getUserPriceFreezes, removePriceFreeze } from "@/api";

const index = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const router = useRouter();

  const [frozenPrices, setFrozenPrices] = useState<any[]>([]);

  const logout = () => {
    dispatch(clearUser());
    router.push("/");
  };
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    firstName: user?.firstName ? user?.firstName : "",
    lastName: user?.lastName ? user?.lastName : "",
    email: user?.email ? user?.email : "",
    phoneNumber: user?.phoneNumber ? user?.phoneNumber : "",
  });

  const [editForm, setEditForm] = useState({ ...userData });

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
  }, [user]);

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
  const handleSave = async () => {
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
          bookings: (data.bookings && data.bookings.length > 0) ? data.bookings : (user?.bookings || []),
        };
        dispatch(setUser(mergedUser));
      }
      setIsEditing(false);
    } catch (error) {
      setUserData(editForm);
      setIsEditing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const handleEditFormChange = (field:any, value:any) => {
    setUserData((prevState) => ({
        ...prevState,
        [field]: value, // Update the specific field dynamically
      }));
  };
  return (
    <div className="min-h-screen bg-gray-50 pt-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Profile</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-red-600 flex items-center space-x-1 hover:text-red-700"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={userData.firstName}
                      onChange={(e) => handleEditFormChange("firstName", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={userData.lastName}
                      onChange={(e) => handleEditFormChange("lastName", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={userData.email}
                      onChange={(e) => handleEditFormChange("email", e.target.value)}
                      
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={userData.phoneNumber}
                      onChange={(e) => handleEditFormChange("phoneNumber", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSave}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({ ...user });
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {user?.firstName} {user?.lastName}
                      </p>
                      {/* <p className="text-sm text-gray-500">{userData.role}</p> */}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <p>{user?.email}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <p>{user?.phoneNumber}</p>
                  </div>
                  <button
                    className="w-full mt-4 flex items-center justify-center space-x-2 text-red-600 hover:text-red-700"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bookings & Price Freeze Locker Section */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Price Freeze Locker Section */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl shadow-lg p-6 border border-blue-800">
              <div className="flex items-center justify-between mb-4 border-b border-blue-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-bold">My Locked Fares & Price Freezes</h2>
                    <p className="text-xs text-slate-300">Fares locked against projected market surge increases</p>
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
                        aria-label="Remove Frozen Price"
                        className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-blue-900/80 transition-all cursor-pointer border border-transparent hover:border-red-500/30"
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
                          className="bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4 text-slate-950" />
                          Book Now at Locked Fare
                        </button>
                        <span className="text-[10px] text-slate-400">Guaranteed lock against market price increases</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-300 bg-blue-950/40 rounded-xl border border-blue-800/40">
                    <p className="text-sm font-semibold">No price freeze locks currently saved</p>
                    <p className="text-xs text-slate-400 mt-1">Visit Dynamic Pricing Engine to lock fares for 24 hours.</p>
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

            {/* Bookings Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
              <div className="space-y-6">
                {user?.bookings && user.bookings.length > 0 ? (
                  user.bookings.map((booking: any, index: any) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {booking?.type === "Flight" ? (
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Plane className="w-6 h-6 text-blue-600" />
                            </div>
                          ) : (
                            <div className="bg-green-100 p-2 rounded-lg">
                              <Building2 className="w-6 h-6 text-green-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{booking?.type || "Booking"}</h3>
                            <p className="text-sm text-gray-500">
                              Booking ID: {booking?.bookingId || booking?.id || booking?._id || index + 1}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ₹ {(booking?.totalPrice || booking?.price || 0).toLocaleString("en-IN")}
                          </p>
                          <p className="text-sm text-gray-500">{booking?.type || "Standard"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {booking?.date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(booking?.date)}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <CreditCard className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">Confirmed / Paid</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg font-medium">No bookings found</p>
                    <p className="text-sm text-gray-400 mt-1">Bookings made will be saved to your DB account.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
