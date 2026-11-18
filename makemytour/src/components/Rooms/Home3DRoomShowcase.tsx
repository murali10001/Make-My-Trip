import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Compass,
  Building2,
  Sparkles,
  Bed,
  Maximize,
  Eye,
  Star,
  ShieldCheck,
  ChevronRight,
  Flame,
  Layers,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { getFeatured3dRooms } from "@/api";
import Room3DViewer, { Room3DConfigData } from "./Room3DViewer";

export const Home3DRoomShowcase: React.FC = () => {
  const router = useRouter();
  const [featuredRooms, setFeaturedRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRoomIndex, setActiveRoomIndex] = useState<number>(1);

  useEffect(() => {
    let isMounted = true;
    const fetchShowcaseRooms = async () => {
      setLoading(true);
      try {
        const data = await getFeatured3dRooms();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setFeaturedRooms(data);
        }
      } catch (err) {
        console.error("Failed to load featured 3D rooms:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchShowcaseRooms();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentRoom = featuredRooms[activeRoomIndex] || featuredRooms[0] || null;

  const handleBookSelectedRoom = (room: any) => {
    if (!room) return;
    const hotelId = room.hotelId || (featuredRooms.find((r) => r.hotelId)?.hotelId);
    if (hotelId) {
      router.push({
        pathname: `/book-hotel/${hotelId}`,
        query: {
          roomTypeName: room.roomTypeName,
          roomUpgradeAddon: room.priceUpgradeAddon || 0,
        },
      });
    } else {
      router.push("/hotels");
    }
  };

  return (
    <section className="my-12 sm:my-16 w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-bold mb-2 backdrop-blur-md">
            <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
            <span>Interactive 3D Virtual Hotel Spaces</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explore True-to-Scale 3D Hotel Rooms
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Tour genuine 3D architectural representations of our luxury rooms and suites. Inspect actual furniture layouts, premium bedding, private balconies, and luxury spa jacuzzis in full 360°.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2 backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200">
            Real-Time 3D Engine • Scale 1:1
          </span>
        </div>
      </div>

      <div className="bg-slate-900/95 rounded-3xl border border-slate-800 shadow-2xl p-4 sm:p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none border-b border-slate-800">
          {featuredRooms.map((room, idx) => {
            const isActive = idx === activeRoomIndex;

            return (
              <button
                key={room.id || idx}
                onClick={() => setActiveRoomIndex(idx)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]"
                    : "bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <Bed className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-indigo-400"}`} />
                <span>{room.roomTypeName}</span>
                {room.isPopularUpsell && (
                  <span className="bg-amber-500/90 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                    HOT
                  </span>
                )}
                {room.priceUpgradeAddon > 0 ? (
                  <span className="text-[10px] opacity-80 font-mono">
                    +₹{room.priceUpgradeAddon.toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Standard
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 w-full">
            {currentRoom ? (
              <Room3DViewer
                roomConfig={currentRoom.room3dConfig}
                roomTypeName={currentRoom.roomTypeName}
                bedType={currentRoom.bedType}
                roomSize={currentRoom.roomSize}
                viewType={currentRoom.viewType}
                amenities={currentRoom.amenities}
                hotelName={currentRoom.hotelName}
                priceUpgradeAddon={currentRoom.priceUpgradeAddon}
                onBookNow={() => handleBookSelectedRoom(currentRoom)}
                heightClass="h-[420px] sm:h-[500px]"
              />
            ) : (
              <div className="h-[420px] sm:h-[500px] rounded-3xl bg-slate-950 flex flex-col items-center justify-center text-slate-500">
                <Compass className="w-10 h-10 animate-spin-slow text-indigo-400 mb-2" />
                <p className="text-xs">Loading Authentic 3D Room Space...</p>
              </div>
            )}
          </div>

          {currentRoom && (
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-wider text-indigo-400 uppercase font-bold">
                    {currentRoom.room3dConfig?.roomModelType?.replace(/_/g, " ") || "AUTHENTIC 3D ROOM"}
                  </span>
                  <span className="text-emerald-400 text-xs font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {currentRoom.availableRooms} rooms available
                  </span>
                </div>

                <h3 className="text-lg font-black text-white">{currentRoom.roomTypeName}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentRoom.description}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2">
                    <Maximize className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Area</span>
                      <strong className="text-white font-mono">{currentRoom.roomSize}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2">
                    <Bed className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Bedding</span>
                      <strong className="text-white text-[11px] truncate block">{currentRoom.bedType}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Orientation</span>
                      <strong className="text-white text-[11px] truncate block">{currentRoom.viewType}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Flooring</span>
                      <strong className="text-white text-[11px] truncate block">
                        {currentRoom.room3dConfig?.floorMaterial?.replace(/_/g, " ") || "Hardwood"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Interactive 3D Furniture & Amenities:</span>
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {currentRoom.room3dConfig?.furniture?.slice(0, 5).map((f: any, i: number) => (
                    <div
                      key={f.id || i}
                      className="bg-slate-900/90 rounded-xl p-2 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span className="font-semibold text-white text-[11px]">{f.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {f.material?.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-950/60 to-slate-950 rounded-2xl p-4 border border-indigo-500/30 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">Upgrade Addon</span>
                  <div className="text-lg font-black text-white">
                    {currentRoom.priceUpgradeAddon > 0 ? (
                      <span>+₹{currentRoom.priceUpgradeAddon.toLocaleString("en-IN")}<span className="text-xs font-normal text-slate-400"> / night</span></span>
                    ) : (
                      <span className="text-emerald-400">Standard Stay Included</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleBookSelectedRoom(currentRoom)}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                >
                  <span>Book Now</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Home3DRoomShowcase;

