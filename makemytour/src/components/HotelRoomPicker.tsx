import React, { useState, useEffect, useRef } from "react";
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
  RotateCw,
  ZoomIn,
  ZoomOut,
  Layers,
  Compass,
} from "lucide-react";
import { getHotelRoomOptions, saveUserPreferences, getUserPreferences, createSelectionStream } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Room3DViewer from "@/components/Rooms/Room3DViewer";

interface HotelRoomPickerProps {
  hotelId: string;
  hotelName?: string;
  userId?: string;
  userEmail?: string;
  onRoomSelect: (room: { roomTypeName: string; priceUpgradeAddon: number } | null) => void;
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

  const [modalRoom3D, setModalRoom3D] = useState<any | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"3D" | "PHOTOS">("3D");
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const [savePrefChecked, setSavePrefChecked] = useState<boolean>(true);
  const [prefSavedMsg, setPrefSavedMsg] = useState<string | null>(null);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);

  const [rotY, setRotY] = useState<number>(25);
  const [rotX, setRotX] = useState<number>(-12);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; initialRotY: number; initialRotX: number }>({
    x: 0,
    y: 0,
    initialRotY: 25,
    initialRotX: -12,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const data = await getHotelRoomOptions(hotelId);
        if (isMounted) {
          setRoomOptions(data || []);

          if (userId) {
            try {
              const userPrefs = await getUserPreferences(userId);
              if (userPrefs && userPrefs.preferredRoomType && Array.isArray(data) && data.length > 0) {
                const targetName = userPrefs.preferredRoomType.toLowerCase();
                const matched = data.find(
                  (r: any) =>
                    r.roomTypeName &&
                    (r.roomTypeName.toLowerCase().includes(targetName) ||
                      targetName.includes(r.roomTypeName.toLowerCase()))
                );
                if (matched && !selectedRoomType) {
                  setActiveRoom(matched);
                  onRoomSelect({
                    roomTypeName: matched.roomTypeName,
                    priceUpgradeAddon: matched.priceUpgradeAddon,
                  });
                }
              }
            } catch (prefErr) {
              console.warn("Failed to retrieve user room preferences:", prefErr);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load room options:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    if (hotelId) fetchRooms();
    return () => {
      isMounted = false;
    };
  }, [hotelId, userId]);

  useEffect(() => {
    let stream: EventSource | null = null;
    try {
      stream = createSelectionStream(
        (update: any) => {
          if (!update || update.type !== "ROOM_AVAILABILITY_UPDATE") return;
          if (update.hotelId === hotelId) {
            setRoomOptions((prev: any[]) =>
              prev.map((r: any) =>
                r.roomTypeName?.toLowerCase() === update.roomTypeName?.toLowerCase()
                  ? { ...r, availableRooms: update.availableRooms }
                  : r
              )
            );
          }
        },
        () => setStreamConnected(true),
        () => setStreamConnected(false)
      );
    } catch (e) {
      console.warn("Failed to subscribe to room selection stream:", e);
    }

    return () => {
      if (stream && typeof stream.close === "function") {
        stream.close();
      }
    };
  }, [hotelId]);

  const handleSelectRoom = async (room: any) => {
    const isCurrentlySelected = activeRoom?.roomTypeName === room.roomTypeName || selectedRoomType === room.roomTypeName;
    if (isCurrentlySelected) {
      setActiveRoom(null);
      onRoomSelect(null);
      return;
    }

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialRotY: rotY,
      initialRotX: rotX,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setRotY((dragStartRef.current.initialRotY + deltaX * 0.6) % 360);
    setRotX(Math.max(-45, Math.min(25, dragStartRef.current.initialRotX - deltaY * 0.4)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Rooms & Suites for {hotelName || "Hotel"}
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              {roomOptions.length} Tiers Available
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                streamConnected
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  streamConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              {streamConnected ? "Live Room Inventory Active" : "Connecting..."}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upgrade your stay with premium suite options, ocean views, and interactive 3D virtual room tours.
          </p>
        </div>

        {activeRoom ? (
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
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-slate-500">
            <span>No upgrade selected (Standard Stay)</span>
          </div>
        )}
      </div>

      {roomOptions.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Room options and upgrades are not available for this hotel at this time.
        </div>
      ) : (
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
                  <span className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-10">
                    <Star className="w-3 h-3 fill-white" /> Popular Upsell Choice
                  </span>
                )}

                <div className="space-y-3">
                  <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100 group">
                    {room.imageUrls && room.imageUrls.length > 0 ? (
                      <img
                        src={room.imageUrls[0]}
                        alt={room.roomTypeName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50 text-indigo-400">
                        <Building2 className="w-10 h-10 mb-1 opacity-60" />
                        <span className="text-[11px] font-semibold text-slate-500">Room Overview</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalRoom3D(room);
                          setActiveViewTab("3D");
                          setCurrentImageIndex(0);
                        }}
                        className="bg-white/95 hover:bg-white text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all border border-white/50"
                      >
                        <Compass className="w-3.5 h-3.5 text-indigo-600 animate-spin-slow" />
                        <span>3D Virtual Tour & Photos</span>
                      </button>

                      <span className="text-white text-[10px] bg-slate-900/80 px-2 py-0.5 rounded-full backdrop-blur-xs font-mono font-bold">
                        {room.availableRooms} rooms left
                      </span>
                    </div>
                  </div>

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

                  <div className="flex flex-wrap gap-1 pt-1">
                    {room.amenities &&
                      room.amenities.slice(0, 4).map((a: string, i: number) => (
                        <span key={i} className="text-[10px] bg-indigo-50/70 text-indigo-800 border border-indigo-100 px-2 py-0.5 rounded-md">
                          ✓ {a}
                        </span>
                      ))}
                  </div>
                </div>

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
                      {isSelected ? "Selected Room Option" : "Click to Select Option"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            <span className="text-slate-700 font-medium">Save room choice to my profile for future hotel bookings</span>
          </label>
        </div>
      )}

      {prefSavedMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{prefSavedMsg}</span>
        </div>
      )}

      <Dialog open={!!modalRoom3D} onOpenChange={() => setModalRoom3D(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-800 scrollbar-thin">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" />
                  3D Spatial Tour: {modalRoom3D?.roomTypeName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {modalRoom3D?.roomSize} • {modalRoom3D?.bedType} • {modalRoom3D?.viewType}
                </DialogDescription>
              </div>

              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setActiveViewTab("3D")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeViewTab === "3D" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Interactive 3D Space</span>
                </button>
                <button
                  onClick={() => setActiveViewTab("PHOTOS")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeViewTab === "PHOTOS" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Gallery ({modalRoom3D?.imageUrls?.length || 1})</span>
                </button>
              </div>
            </div>
          </DialogHeader>

          {modalRoom3D && (
            <div className="space-y-4 py-2">
              {activeViewTab === "3D" ? (
                <div className="space-y-3">
                  <Room3DViewer
                    roomConfig={modalRoom3D.room3dConfig}
                    roomTypeName={modalRoom3D.roomTypeName}
                    bedType={modalRoom3D.bedType}
                    roomSize={modalRoom3D.roomSize}
                    viewType={modalRoom3D.viewType}
                    amenities={modalRoom3D.amenities}
                    hotelName={hotelName}
                    priceUpgradeAddon={modalRoom3D.priceUpgradeAddon}
                    heightClass="h-80 sm:h-[480px]"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                    {modalRoom3D.imageUrls && modalRoom3D.imageUrls.length > 0 ? (
                      <img
                        src={modalRoom3D.imageUrls[currentImageIndex]}
                        alt={modalRoom3D.roomTypeName}
                        className="w-full h-full object-cover transition-all"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                        <Building2 className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-xs">No gallery photos available</span>
                      </div>
                    )}

                    {modalRoom3D.imageUrls && modalRoom3D.imageUrls.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setCurrentImageIndex((prev) =>
                              prev === 0 ? modalRoom3D.imageUrls.length - 1 : prev - 1
                            )
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-900 shadow-md backdrop-blur-xs border border-white/20"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            setCurrentImageIndex((prev) =>
                              prev === modalRoom3D.imageUrls.length - 1 ? 0 : prev + 1
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-900 shadow-md backdrop-blur-xs border border-white/20"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    <div className="absolute bottom-3 left-3 bg-slate-950/80 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-xs font-mono font-bold flex items-center gap-1.5 border border-white/20">
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        Photo {currentImageIndex + 1} of {modalRoom3D.imageUrls?.length || 1}
                      </span>
                    </div>
                  </div>

                  {modalRoom3D.imageUrls && modalRoom3D.imageUrls.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {modalRoom3D.imageUrls.map((url: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                            currentImageIndex === idx ? "border-indigo-500 scale-105" : "border-slate-800 opacity-60"
                          }`}
                        >
                          <img src={url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <h5 className="font-bold text-white text-xs mb-2.5">Room Inclusions & Services:</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {modalRoom3D.amenities &&
                    modalRoom3D.amenities.map((amenity: string, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-medium flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
