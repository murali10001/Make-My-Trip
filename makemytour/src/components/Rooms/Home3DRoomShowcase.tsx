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
  Wifi,
  Coffee,
  Bath,
  Tv,
} from "lucide-react";
import { getFeatured3dRooms } from "@/api";
import Room3DViewer from "./Room3DViewer";

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

  const currentRoom = featuredRooms[activeRoomIndex] || (
    activeRoomIndex === 0
      ? {
        roomTypeName: "Grand Hyatt Deluxe Queen",
        hotelName: "Grand Hyatt Resort & Spa",
        hotelId: "HT-SHOWCASE-1",
        bedType: "Comfort Queen Bed",
        roomSize: "340 sq.ft",
        viewType: "Courtyard & City View",
        priceUpgradeAddon: 0,
        availableRooms: 6,
        description: "Contemporary classic elegance featuring warm oak textures, ergonomic queen bedding, dedicated work vanity, and high-speed Wi-Fi.",
        amenities: ["High-Speed Wi-Fi", "Air Conditioning", "En-suite Bathroom", "Smart 43\" LED TV", "Work Desk"],
      }
      : activeRoomIndex === 1
        ? {
          roomTypeName: "The Oberoi Balcony Retreat",
          hotelName: "The Oberoi Beach Resort",
          hotelId: "HT-SHOWCASE-2",
          bedType: "King Size Bed",
          roomSize: "480 sq.ft",
          viewType: "Private Balcony Ocean View",
          priceUpgradeAddon: 1200,
          availableRooms: 4,
          isPopularUpsell: true,
          description: "Upscale luxury suite with furnished outdoor private balcony, tufted velvet king bed, designer loveseat, and espresso bar.",
          amenities: ["Private Balcony", "Plush King Bed", "Teal Velvet Lounge", "Nespresso Machine", "Gourmet Breakfast"],
        }
        : activeRoomIndex === 2
          ? {
            roomTypeName: "Taj Palace Panoramic Suite",
            hotelName: "Taj Palace Luxury Hotel",
            hotelId: "HT-SHOWCASE-3",
            bedType: "California King Bed",
            roomSize: "720 sq.ft",
            viewType: "High-Floor Panoramic Skyline",
            priceUpgradeAddon: 2800,
            availableRooms: 3,
            description: "Bespoke multi-zone penthouse suite with wrap-around corner glass, California king bedroom, Italian leather sectional lounge, and freestanding soaking jacuzzi.",
            amenities: ["Panoramic Wrap Windows", "Separate Living Lounge", "Soaking Jacuzzi Bath", "Executive Lounge Access", "Evening Cocktails"],
          }
          : {
            roomTypeName: "The Leela Presidential Penthouse",
            hotelName: "The Leela Palace Penthouse",
            hotelId: "HT-SHOWCASE-4",
            bedType: "Master King Bed + Daybed",
            roomSize: "1,150 sq.ft",
            viewType: "360-Degree Penthouse Panoramic View",
            priceUpgradeAddon: 5500,
            availableRooms: 2,
            description: "The pinnacle of luxury hospitality. Opulent Carrara marble flooring, four-poster master canopy bed, private cocktail bar, 4-seater dining salon, and terrace.",
            amenities: ["Dedicated 24/7 Butler", "Private Sun Terrace", "Chesterfield Parlor", "Dining Suite", "Carrara Marble Jacuzzi", "Limousine Transfer"],
          }
  );

  const roomList = featuredRooms.length > 0 ? featuredRooms : [
    { roomTypeName: "Grand Hyatt Deluxe Queen", priceUpgradeAddon: 0 },
    { roomTypeName: "The Oberoi Balcony Retreat", priceUpgradeAddon: 1200, isPopularUpsell: true },
    { roomTypeName: "Taj Palace Panoramic Suite", priceUpgradeAddon: 2800 },
    { roomTypeName: "The Leela Presidential Penthouse", priceUpgradeAddon: 5500 },
  ];

  const handleBookSelectedRoom = (room: any) => {
    if (!room) return;
    const hotelId = room.hotelId || "HT-SHOWCASE-2";
    router.push({
      pathname: `/book-hotel/${hotelId}`,
      query: {
        roomTypeName: room.roomTypeName,
        roomUpgradeAddon: room.priceUpgradeAddon || 0,
      },
    });
  };

  return (
    <section className="my-12 sm:my-16 w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explore Luxury Rooms in Photorealistic 3D
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Tour genuine hotel rooms with real spatial photography. Inspect actual room dimensions, king bedding, private balconies, marble jacuzzis, and interactive amenities before you book.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 backdrop-blur-md shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200">
            Live Verified Inventory • Instant Booking
          </span>
        </div>
      </div>

      <div className="bg-slate-900/95 rounded-3xl border border-slate-800 shadow-2xl p-4 sm:p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none border-b border-slate-800">
          {roomList.map((room, idx) => {
            const isActive = idx === activeRoomIndex;

            return (
              <button
                key={room.id || idx}
                onClick={() => setActiveRoomIndex(idx)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${isActive
                  ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.02]"
                  : "bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800/90 border border-slate-800"
                  }`}
              >
                <Bed className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-indigo-400"}`} />
                <span>{room.roomTypeName}</span>
                {room.isPopularUpsell && (
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black shadow-sm">
                    TOP CHOICE
                  </span>
                )}
                {room.priceUpgradeAddon > 0 ? (
                  <span className="text-[10px] opacity-80 font-mono">
                    +₹{room.priceUpgradeAddon.toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    Included
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 w-full">
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
              heightClass="h-[430px] sm:h-[520px]"
            />
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-950/85 rounded-2xl p-4 sm:p-5 border border-slate-800/80 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider text-indigo-400 uppercase font-black">
                  {currentRoom.hotelName || "PREMIUM RESORT & SUITES"}
                </span>
                <span className="text-emerald-400 text-xs font-mono font-bold bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {currentRoom.availableRooms || 4} Left
                </span>
              </div>

              <h3 className="text-lg font-black text-white">{currentRoom.roomTypeName}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentRoom.description}
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2.5">
                  <Maximize className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Floor Area</span>
                    <strong className="text-white font-mono text-[11px] block">{currentRoom.roomSize}</strong>
                  </div>
                </div>

                <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2.5">
                  <Bed className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Bedding Type</span>
                    <strong className="text-white text-[11px] truncate block">{currentRoom.bedType}</strong>
                  </div>
                </div>

                <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Orientation</span>
                    <strong className="text-white text-[11px] truncate block">{currentRoom.viewType}</strong>
                  </div>
                </div>

                <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Sanitized</span>
                    <strong className="text-white text-[11px] truncate block">Certified 100%</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/85 rounded-2xl p-4 sm:p-5 border border-slate-800/80 space-y-3 shadow-xl">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Verified Room Amenities & Services:</span>
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {currentRoom.amenities?.map((amenity: string, i: number) => (
                  <div
                    key={i}
                    className="bg-slate-900/90 rounded-xl p-2 px-3 border border-slate-800/80 flex items-center justify-between text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="font-semibold text-[11px]">{amenity}</span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">
                      INCLUDED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-950/70 via-slate-950 to-slate-950 rounded-2xl p-4 sm:p-5 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-2xl">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Tier Upgrade Price</span>
                <div className="text-xl font-black text-white">
                  {currentRoom.priceUpgradeAddon > 0 ? (
                    <span>+₹{currentRoom.priceUpgradeAddon.toLocaleString("en-IN")}<span className="text-xs font-normal text-slate-400"> / night</span></span>
                  ) : (
                    <span className="text-emerald-400 text-sm font-bold">Included in Base Fare</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleBookSelectedRoom(currentRoom)}
                className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border border-white/20"
              >
                <span>Reserve Room</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home3DRoomShowcase;
