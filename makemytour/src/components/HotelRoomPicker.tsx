import React, { useState, useEffect } from "react";
import {
  Building2,
  Check,
  Sparkles,
  Bed,
  Maximize,
  Eye,
  Camera,
  BookmarkCheck,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
} from "lucide-react";
import { getHotelRoomOptions, saveUserPreferences, getUserPreferences } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface HotelRoomPickerProps {
  hotelId: string;
  hotelName?: string;
  userId?: string;
  userEmail?: string;
  onRoomSelect: (room: { roomTypeName: string; priceUpgradeAddon: number }) => void;
  selectedRoomType?: string;
}

export const HotelRoomPicker: React.FC<HotelRoomPickerProps> = ({
  hotelId,
  hotelName = "",
  userId = "",
  userEmail = "",
  onRoomSelect,
  selectedRoomType = "",
}) => {
  const [roomOptions, setRoomOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRoom, setActiveRoom] = useState<any | null>(null);

  // 3D Preview Modal state
  const [modalRoom3D, setModalRoom3D] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const [savePrefChecked, setSavePrefChecked] = useState<boolean>(true);
  const [prefSavedMsg, setPrefSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const data = await getHotelRoomOptions(hotelId);
        setRoomOptions(data || []);

        if (data && data.length > 0) {
          let selected = data[0];

          // Check user preferences to pre-select saved room choice
          if (userId) {
            const userPrefs = await getUserPreferences(userId);
            if (userPrefs && userPrefs.preferredRoomType) {
              const match = data.find((r: any) => r.roomTypeName === userPrefs.preferredRoomType);
              if (match) selected = match;
            }
          }

          setActiveRoom(selected);
          onRoomSelect({
            roomTypeName: selected.roomTypeName,
            priceUpgradeAddon: selected.priceUpgradeAddon,
          });
        }
      } catch (err) {
        console.error("Failed to load room options:", err);
      } finally {
        setLoading(false);
      }
    };
    if (hotelId) fetchRooms();
  }, [hotelId, userId]);

  const handleSelectRoom = async (room: any) => {
    setActiveRoom(room);
    onRoomSelect({
      roomTypeName: room.roomTypeName,
      priceUpgradeAddon: room.priceUpgradeAddon,
    });

    if (savePrefChecked && userId) {
      try {
        await saveUserPreferences({
          userId,
          userEmail,
          preferredRoomType: room.roomTypeName,
          preferredBedType: room.bedType || "King Size Bed",
        });
        setPrefSavedMsg(`Saved ${room.roomTypeName} as your preferred room type!`);
        setTimeout(() => setPrefSavedMsg(null), 3000);
      } catch (e) {
        console.error("Failed to save room preference", e);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-pulse text-center">
        <Building2 className="w-8 h-8 text-indigo-600 mx-auto animate-bounce mb-2" />
        <p className="text-xs text-slate-500">Loading Dynamic Room Type Options...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Rooms & Suites for {hotelName || "Hotel"} (3D Interactive Preview)
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              {roomOptions.length} Tiers Available
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upgrade your stay with premium suite options, ocean views, and 3D virtual room tours.
          </p>
        </div>

        {activeRoom && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <div className="text-xs">
              <span className="text-slate-600">Selected: </span>
              <strong className="text-indigo-900 font-extrabold">{activeRoom.roomTypeName}</strong>
              <span className="text-emerald-700 font-bold ml-1">
                ({activeRoom.priceUpgradeAddon > 0 ? `+₹${activeRoom.priceUpgradeAddon.toLocaleString("en-IN")}/night` : "Standard Included"})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roomOptions.map((room) => {
          const isSelected = activeRoom?.roomTypeName === room.roomTypeName;

          return (
            <div
              key={room.id || room.roomTypeName}
              onClick={() => handleSelectRoom(room)}
              className={`rounded-2xl border p-4 transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {room.isPopularUpsell && (
                <span className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" /> Popular Upsell Choice
                </span>
              )}

              <div className="space-y-3">
                {/* Image & 3D Preview Button */}
                <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100 group">
                  <img
                    src={
                      room.imageUrls && room.imageUrls.length > 0
                        ? room.imageUrls[0]
                        : "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={room.roomTypeName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalRoom3D(room);
                        setCurrentImageIndex(0);
                      }}
                      className="bg-white/90 hover:bg-white text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>3D Virtual Tour & Photos</span>
                    </button>

                    <span className="text-white text-[10px] bg-slate-900/80 px-2 py-0.5 rounded-full backdrop-blur-xs font-medium">
                      {room.availableRooms} rooms left
                    </span>
                  </div>
                </div>

                {/* Title & Upgrade Price */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{room.roomTypeName}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{room.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {room.priceUpgradeAddon > 0 ? (
                      <span className="text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl block">
                        +₹{room.priceUpgradeAddon.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-xl block">
                        Included
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Attributes */}
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-1">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-indigo-500" /> {room.bedType}
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Maximize className="w-3.5 h-3.5 text-indigo-500" /> {room.roomSize}
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-indigo-500" /> {room.viewType}
                  </span>
                </div>

                {/* Amenity tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {room.amenities &&
                    room.amenities.slice(0, 3).map((a: string, i: number) => (
                      <span key={i} className="text-[10px] bg-indigo-50/70 text-indigo-800 border border-indigo-100 px-2 py-0.5 rounded-md">
                        ✓ {a}
                      </span>
                    ))}
                </div>
              </div>

              {/* Radio Selection Toggle */}
              <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {isSelected ? "Selected Room Option" : "Click to Select"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Preference Toggle */}
      {userId && (
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={savePrefChecked}
              onChange={(e) => setSavePrefChecked(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300"
            />
            <BookmarkCheck className="w-4 h-4 text-indigo-600" />
            <span className="text-slate-700 font-medium">Save room preference to my profile for future hotel bookings</span>
          </label>
        </div>
      )}

      {prefSavedMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{prefSavedMsg}</span>
        </div>
      )}

      {/* 3D Interactive Room Preview & Photo Gallery Modal */}
      <Dialog open={!!modalRoom3D} onOpenChange={() => setModalRoom3D(null)}>
        <DialogContent className="max-w-3xl bg-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              3D Interactive Room Tour: {modalRoom3D?.roomTypeName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Explore room features, 3D space preview, and high-resolution photo gallery.
            </DialogDescription>
          </DialogHeader>

          {modalRoom3D && (
            <div className="space-y-4 py-2">
              {/* Image Carousel */}
              <div className="relative h-72 rounded-2xl overflow-hidden bg-slate-950 group">
                <img
                  src={
                    modalRoom3D.imageUrls && modalRoom3D.imageUrls.length > 0
                      ? modalRoom3D.imageUrls[currentImageIndex]
                      : "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={modalRoom3D.roomTypeName}
                  className="w-full h-full object-cover transition-all"
                />

                {modalRoom3D.imageUrls && modalRoom3D.imageUrls.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImageIndex((prev) => (prev === 0 ? modalRoom3D.imageUrls.length - 1 : prev - 1))
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 shadow-md backdrop-blur-xs"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImageIndex((prev) => (prev === modalRoom3D.imageUrls.length - 1 ? 0 : prev + 1))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 shadow-md backdrop-blur-xs"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-xs font-mono font-bold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Photo {currentImageIndex + 1} of {modalRoom3D.imageUrls?.length || 1}
                  </span>
                </div>
              </div>

              {/* 3D Virtual Tour Badge Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl border border-indigo-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold">
                    3D
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-indigo-200">Interactive 3D Spatial Walkthrough Active</h4>
                    <p className="text-xs text-slate-300">{modalRoom3D.roomSize} • {modalRoom3D.viewType} • {modalRoom3D.bedType}</p>
                  </div>
                </div>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-extrabold">
                  VERIFIED TOUR
                </span>
              </div>

              {/* Amenities Grid */}
              <div>
                <h5 className="font-bold text-slate-800 text-xs mb-2">Room Amenities & Services Included:</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {modalRoom3D.amenities &&
                    modalRoom3D.amenities.map((amenity: string, idx: number) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelRoomPicker;
