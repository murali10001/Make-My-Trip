import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Compass,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Bed,
  Eye,
  Maximize,
  Sparkles,
  Camera,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  MapPin,
  Check,
  ShieldCheck,
  Coffee,
  Tv,
  Bath,
  Armchair,
} from "lucide-react";

export interface RoomAngleView {
  id: string;
  label: string;
  imageUrl: string;
  nightImageUrl?: string;
  description: string;
  hotspots?: {
    id: string;
    title: string;
    spec: string;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    icon: string;
  }[];
}

export interface Room3DConfigData {
  roomModelType?: string;
  dimensions?: {
    width: number;
    length: number;
    height: number;
    formattedSize?: string;
  };
  floorMaterial?: string;
  wallMaterial?: string;
  viewScene?: string;
  angles?: RoomAngleView[];
}

interface Room3DViewerProps {
  roomConfig?: any;
  roomTypeName?: string;
  bedType?: string;
  roomSize?: string;
  viewType?: string;
  amenities?: string[];
  hotelName?: string;
  priceUpgradeAddon?: number;
  onBookNow?: () => void;
  heightClass?: string;
  compactMode?: boolean;
}

export const Room3DViewer: React.FC<Room3DViewerProps> = ({
  roomConfig,
  roomTypeName = "Luxury Hotel Room",
  bedType = "King Size Bed",
  roomSize = "450 sq.ft",
  viewType = "Panoramic City View",
  amenities = [],
  hotelName = "Luxury Stay",
  priceUpgradeAddon = 0,
  onBookNow,
  heightClass = "h-[450px] sm:h-[550px]",
  compactMode = false,
}) => {
  // Determine room tier from name or modelType
  const tierKey = useMemo(() => {
    const name = (roomTypeName || "").toLowerCase();
    if (name.includes("presidential") || name.includes("royal") || name.includes("penthouse")) return "presidential";
    if (name.includes("executive") || name.includes("suite") || name.includes("panoramic")) return "executive";
    if (name.includes("deluxe") || name.includes("balcony") || name.includes("premium")) return "deluxe";
    return "classic";
  }, [roomTypeName]);

  // High-Definition, Realistic 3D Room Photography & Multi-Angle Perspectives
  const defaultAngles: Record<string, RoomAngleView[]> = useMemo(() => ({
    classic: [
      {
        id: "classic-overview",
        label: "Master Bedroom View",
        imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1920&q=85",
        nightImageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1920&q=85",
        description: "Elegant classic queen suite featuring natural oak finishes, plush bedding, and dedicated work desk.",
        hotspots: [
          { id: "hs-bed", title: "Comfort Queen Bed", spec: "Plush 10\" pocket spring mattress with hypoallergenic pillows", x: 48, y: 58, icon: "bed" },
          { id: "hs-desk", title: "Ergonomic Work Desk", spec: "Polished oak workstation with dual USB and universal charging ports", x: 80, y: 64, icon: "desk" },
          { id: "hs-window", title: "Soundproof Skyline Window", spec: "Double-glazed acoustic window overlooking city courtyard", x: 20, y: 40, icon: "eye" },
        ],
      },
      {
        id: "classic-bed",
        label: "Bedside & Lighting Focus",
        imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1920&q=85",
        description: "Close-up of premium Egyptian cotton linens and ambient warm reading lamps.",
        hotspots: [
          { id: "hs-linens", title: "300-Thread Percale Linens", spec: "Silky soft breathable cotton with down duvet", x: 50, y: 65, icon: "bed" },
          { id: "hs-lamp", title: "Bedside Sconce Lighting", spec: "Warm 2800K dimmable LED reading lamps", x: 25, y: 45, icon: "sparkles" },
        ],
      },
      {
        id: "classic-bath",
        label: "En-suite Marble Bathroom",
        imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1920&q=85",
        description: "Modern bathroom equipped with walk-in rain shower and premium herbal bath toiletries.",
        hotspots: [
          { id: "hs-shower", title: "Rain Shower & Vanity", spec: "High-pressure rain showerhead with backlit anti-fog mirror", x: 50, y: 45, icon: "bath" },
        ],
      },
    ],
    deluxe: [
      {
        id: "deluxe-balcony",
        label: "Private Balcony & Bedroom",
        imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=85",
        nightImageUrl: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1920&q=85",
        description: "Upgraded deluxe retreat with floor-to-ceiling glass sliding doors opening to a private furnished balcony.",
        hotspots: [
          { id: "hs-balcony", title: "Private Furnished Balcony", spec: "Outdoor rattan seating with panoramic sunset horizon", x: 78, y: 45, icon: "eye" },
          { id: "hs-bed", title: "Plush King Bed", spec: "Custom tufted headboard with luxury pillowtop king mattress", x: 38, y: 60, icon: "bed" },
          { id: "hs-lounge", title: "Velvet Lounge Loveseat", spec: "Sculptural teal loveseat with marble coffee table", x: 72, y: 72, icon: "armchair" },
        ],
      },
      {
        id: "deluxe-bed",
        label: "King Suite Detail",
        imageUrl: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1920&q=85",
        description: "Expansive king bedroom suite with tufted headboard, herringbone parquet, and Nespresso station.",
        hotspots: [
          { id: "hs-bed-d", title: "Royal King Bedding", spec: "400-thread sateen sheets with goose down topper", x: 50, y: 55, icon: "bed" },
          { id: "hs-espresso", title: "Gourmet Espresso Bar", spec: "Complimentary Nespresso capsules and refrigerated minibar", x: 85, y: 58, icon: "coffee" },
        ],
      },
      {
        id: "deluxe-balcony-view",
        label: "Outdoor Terrace View",
        imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1920&q=85",
        description: "Step out onto your private balcony overlooking tranquil resort landscapes and ocean waters.",
        hotspots: [
          { id: "hs-terrace", title: "Glass Balcony Railing", spec: "Soundproof double-pane glazing with unobstructed panoramic vista", x: 50, y: 50, icon: "eye" },
        ],
      },
    ],
    executive: [
      {
        id: "exec-skyline",
        label: "Panoramic Skyline Living",
        imageUrl: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1920&q=85",
        nightImageUrl: "https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=1920&q=85",
        description: "Multi-zone high-floor suite with wrap-around corner glass, separate executive lounge, and California king bed.",
        hotspots: [
          { id: "hs-corner", title: "Wrap-Around Corner Glazing", spec: "Floor-to-ceiling panoramic glass with automated blackout drapes", x: 75, y: 38, icon: "eye" },
          { id: "hs-lounge", title: "Italian Leather Sectional", spec: "Designer L-shaped sectional sofa for meetings and lounging", x: 28, y: 70, icon: "armchair" },
          { id: "hs-bed", title: "California King Suite", spec: "Bespoke emerald velvet headboard with bronze accents", x: 52, y: 52, icon: "bed" },
        ],
      },
      {
        id: "exec-lounge",
        label: "Executive Lounge & Salon",
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1920&q=85",
        description: "Dedicated living room zone with 65\" OLED TV, executive desk, and complimentary evening club privileges.",
        hotspots: [
          { id: "hs-tv", title: "65\" Ultra HD OLED TV", spec: "Cinema soundbar with integrated streaming entertainment", x: 30, y: 40, icon: "tv" },
          { id: "hs-desk", title: "Executive Work Vanity", spec: "Leather ergonomic swivel chair with high-speed fiber Wi-Fi", x: 80, y: 60, icon: "desk" },
        ],
      },
      {
        id: "exec-bath",
        label: "Spa Jacuzzi En-suite",
        imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1920&q=85",
        description: "Freestanding oval soaking jacuzzi tub with gold fixtures and panoramic city views behind fluted glass.",
        hotspots: [
          { id: "hs-jacuzzi", title: "Freestanding Jacuzzi Tub", spec: "Deep hydrotherapy soaking bath with organic bath salts", x: 50, y: 55, icon: "bath" },
        ],
      },
    ],
    presidential: [
      {
        id: "pres-parlor",
        label: "Grand Penthouse Parlor",
        imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1920&q=85",
        nightImageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1920&q=85",
        description: "The pinnacle of luxury hospitality. Carrara marble, Chesterfield leather parlor, personal wet bar, and terrace.",
        hotspots: [
          { id: "hs-parlor", title: "Chesterfield Grand Parlor", spec: "Deep button-tufted leather suite with gold-leaf salon tables", x: 45, y: 68, icon: "armchair" },
          { id: "hs-dining", title: "In-Suite Dining Salon", spec: "Formal 4-seater marble dining table with 24/7 private butler service", x: 82, y: 58, icon: "coffee" },
          { id: "hs-terrace", title: "Sun Terrace Portals", spec: "Private open-air penthouse terrace overlooking 360° skyline", x: 18, y: 45, icon: "eye" },
        ],
      },
      {
        id: "pres-canopy",
        label: "Master Four-Poster Canopy Suite",
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1920&q=85",
        description: "Master bedroom featuring a handcrafted four-poster canopy bed with Italian silk drapes and walk-in dressing room.",
        hotspots: [
          { id: "hs-canopy", title: "Four-Poster Canopy Bed", spec: "Custom California king bed with silk drapes and 600-thread linens", x: 52, y: 54, icon: "bed" },
          { id: "hs-bar", title: "Cocktail Wet Bar & Wine Vault", spec: "Stocked premium liquor bar and dual-zone wine cooler", x: 85, y: 50, icon: "coffee" },
        ],
      },
      {
        id: "pres-terrace",
        label: "Private Sun Terrace & Horizon",
        imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=85",
        description: "Expansive private sun terrace with lounge daybeds, outdoor dining, and private jacuzzi plunge.",
        hotspots: [
          { id: "hs-plunge", title: "Penthouse Plunge Terrace", spec: "Private rooftop lounging with heated whirlpool jacuzzi", x: 50, y: 55, icon: "bath" },
        ],
      },
    ],
  }), []);

  const angles = defaultAngles[tierKey] || defaultAngles.deluxe;
  const [currentAngleIndex, setCurrentAngleIndex] = useState<number>(0);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeHotspot, setActiveHotspot] = useState<any | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const activeView = angles[currentAngleIndex] || angles[0];
  const activeImageUrl = isNightMode && activeView.nightImageUrl ? activeView.nightImageUrl : activeView.imageUrl;

  // Reset zoom & pan when angle changes
  useEffect(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    setActiveHotspot(null);
  }, [currentAngleIndex, tierKey]);

  // Pointer drag for smooth 360° spatial panning
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const maxPanX = (zoomLevel - 1) * 200 + 45;
    const maxPanY = (zoomLevel - 1) * 120 + 30;

    setPanOffset({
      x: Math.max(-maxPanX, Math.min(maxPanX, dragStartRef.current.startPanX + dx * 0.45)),
      y: Math.max(-maxPanY, Math.min(maxPanY, dragStartRef.current.startPanY + dy * 0.35)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoomLevel((prev) => Math.min(1.8, Math.max(1.0, parseFloat((prev + delta).toFixed(2)))));
  };

  const handleReset = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    setActiveHotspot(null);
  };

  const renderHotspotIcon = (icon: string) => {
    switch (icon) {
      case "bed": return <Bed className="w-3.5 h-3.5" />;
      case "eye": return <Eye className="w-3.5 h-3.5" />;
      case "bath": return <Bath className="w-3.5 h-3.5" />;
      case "coffee": return <Coffee className="w-3.5 h-3.5" />;
      case "tv": return <Tv className="w-3.5 h-3.5" />;
      case "armchair": return <Armchair className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 text-white select-none transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen" : heightClass
      }`}
    >
      {/* Interactive 3D Spatial Canvas Viewport */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing bg-slate-950"
      >
        {/* Photorealistic 3D Room Image with Dynamic Spatial Parallax */}
        <div
          className="absolute inset-0 transition-transform duration-100 ease-out will-change-transform bg-cover bg-center"
          style={{
            backgroundImage: `url("${activeImageUrl}")`,
            transform: `scale(${zoomLevel}) translate3d(${panOffset.x}px, ${panOffset.y}px, 0px)`,
            filter: isNightMode ? "brightness(0.75) contrast(1.15) saturate(1.1)" : "brightness(1.02) contrast(1.02)",
            transition: isDragging ? "filter 0.5s ease" : "transform 0.15s ease-out, filter 0.5s ease",
          }}
        />

        {/* Dynamic Atmospheric Lighting Overlay */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
            isNightMode
              ? "bg-gradient-to-t from-slate-950/80 via-indigo-950/30 to-black/60 mix-blend-multiply opacity-70"
              : "bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-60"
          }`}
        />

        {/* Ambient Optical Sunbeam / Window Light Flare */}
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
            isNightMode ? "bg-amber-500/10 opacity-30" : "bg-amber-100/20 opacity-60"
          }`}
        />

        {/* Interactive 3D Hotspot Pins Pinned on the Real Room Scene */}
        {activeView.hotspots?.map((hs) => {
          const isSelected = activeHotspot?.id === hs.id;

          return (
            <div
              key={hs.id}
              onClick={(e) => {
                e.stopPropagation();
                setActiveHotspot(isSelected ? null : hs);
              }}
              className="absolute z-20 cursor-pointer transition-transform duration-150"
              style={{
                left: `${hs.x}%`,
                top: `${hs.y}%`,
                transform: `translate(-50%, -50%) scale(${zoomLevel > 1.2 ? 0.9 : 1.0}) translate3d(${panOffset.x * 0.4}px, ${panOffset.y * 0.4}px, 0px)`,
              }}
            >
              {/* Pulsating Hotspot Badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-all shadow-2xl ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 ring-4 ring-amber-400/50 scale-110 font-black"
                    : "bg-slate-950/85 hover:bg-slate-900 text-white border border-white/30 hover:scale-105"
                }`}
              >
                <span className={isSelected ? "text-slate-950" : "text-indigo-400"}>
                  {renderHotspotIcon(hs.icon)}
                </span>
                <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">
                  {hs.title}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
              </div>
            </div>
          );
        })}

        {/* ========================================================= */}
        {/* TOP HUD: Room Tier Header & Lighting Controls */}
        {/* ========================================================= */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-3 pointer-events-none z-30">
          {/* Room Title & Architectural Dimension Tag */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-2 pointer-events-auto flex items-center gap-3 shadow-2xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-extrabold text-white">{roomTypeName}</h4>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/30">
                  {roomSize}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>{bedType}</span> • <span>{viewType}</span>
              </p>
            </div>
          </div>

          {/* Top Right: Day/Night Lighting Switch & View Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Day / Night Mood Lighting Switch */}
            <button
              onClick={() => setIsNightMode((prev) => !prev)}
              className={`px-3 py-2 rounded-xl border backdrop-blur-md transition-all shadow-lg flex items-center gap-1.5 text-xs font-bold ${
                isNightMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-sky-500/20 text-sky-200 border-sky-400/40 hover:bg-sky-500/30"
              }`}
              title={isNightMode ? "Switch to Natural Daylight" : "Switch to Warm Evening Lighting"}
            >
              {isNightMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-300" />}
              <span className="hidden sm:inline">{isNightMode ? "Evening" : "Daylight"}</span>
            </button>

            {/* Reset View */}
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 backdrop-blur-md transition-all shadow-lg"
              title="Reset Zoom & Pan"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 backdrop-blur-md transition-all shadow-lg"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM HUD: Multi-Angle Perspectives & Zoom Controls */}
        {/* ========================================================= */}
        <div className="absolute bottom-4 inset-x-4 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none z-30">
          {/* Multi-Angle 3D Camera Switching Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl pointer-events-auto shadow-2xl overflow-x-auto max-w-full">
            <span className="text-[10px] text-slate-400 font-mono px-2 hidden sm:inline flex items-center gap-1 font-bold">
              <Compass className="w-3.5 h-3.5 text-indigo-400" /> 3D ANGLES:
            </span>
            {angles.map((angle, idx) => {
              const isActive = idx === currentAngleIndex;

              return (
                <button
                  key={angle.id}
                  onClick={() => setCurrentAngleIndex(idx)}
                  className={`text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-102"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>{angle.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Zoom In / Zoom Out */}
          <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-2xl pointer-events-auto shadow-2xl">
            <button
              onClick={() => setZoomLevel((z) => Math.max(1.0, parseFloat((z - 0.2).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-mono text-slate-200 w-12 text-center font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={() => setZoomLevel((z) => Math.min(1.8, parseFloat((z + 0.2).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              Drag to Pan 360°
            </span>
          </div>
        </div>

        {/* Spatial Pan Instructions Watermark */}
        <div className="absolute top-1/2 left-4 -translate-y-1/2 text-[10px] font-mono text-slate-400/80 pointer-events-none hidden md:flex flex-col gap-1 items-center bg-slate-950/60 backdrop-blur-xs px-2 py-3 rounded-xl border border-white/10">
          <Compass className="w-4 h-4 text-indigo-400 animate-spin-slow" />
          <span>360° SPATIAL</span>
          <span>DRAG PAN</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FLOATING INSPECTION DETAIL CARD (When Hotspot Selected) */}
      {/* ========================================================= */}
      {activeHotspot && (
        <div className="absolute bottom-20 left-4 sm:left-6 max-w-sm bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 shadow-2xl text-white z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Architectural Feature</span>
              </div>
              <h5 className="font-black text-sm text-white mt-0.5">{activeHotspot.title}</h5>
            </div>
            <button
              onClick={() => setActiveHotspot(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {activeHotspot.spec}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30 flex items-center gap-1">
              <Check className="w-3 h-3" /> Included in Room
            </span>
          </div>
        </div>
      )}

      {/* Direct Booking CTA Ribbon */}
      {onBookNow && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-30">
          <button
            onClick={onBookNow}
            className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-white/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>Book {roomTypeName}</span>
            {priceUpgradeAddon > 0 ? (
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-mono">
                +₹{priceUpgradeAddon.toLocaleString("en-IN")}/nt
              </span>
            ) : (
              <span className="bg-emerald-500/80 px-2 py-0.5 rounded-lg text-xs font-mono">
                Included
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Room3DViewer;
