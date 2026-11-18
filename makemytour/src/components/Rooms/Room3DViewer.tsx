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
  Tv,
  Coffee,
  Sparkles,
  Layers,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Check,
  MapPin,
  Flame,
  Info,
  Maximize,
  Grid,
  Bath,
  Armchair,
  CheckCircle2,
} from "lucide-react";

export interface FurnitureItem {
  id: string;
  name: string;
  category: string;
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  secondaryColor?: string;
  material?: string;
  details?: string;
  amenityLinked?: string;
}

export interface HotspotItem {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  z?: number;
  icon?: string;
  cameraTarget?: {
    yaw: number;
    pitch: number;
    zoom: number;
    label?: string;
  };
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
  ceilingHeight?: number;
  viewScene?: string;
  spatialPanoramaUrl?: string;
  room3dImages?: Record<string, string>;
  dayLightingImage?: string;
  nightLightingImage?: string;
  floorPlanUrl?: string;
  lightingProfile?: {
    ambientColor?: string;
    primaryLightColor?: string;
    dayIntensity?: number;
    nightIntensity?: number;
    supportsNightMode?: boolean;
    ceilingSpotlights?: number;
    bedsideWarmth?: string;
  };
  furniture?: FurnitureItem[];
  hotspots?: HotspotItem[];
  cameraPresets?: Record<
    string,
    {
      yaw: number;
      pitch: number;
      zoom: number;
      label: string;
    }
  >;
}

interface Room3DViewerProps {
  roomConfig?: Room3DConfigData | null;
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
  const [activeAngleKey, setActiveAngleKey] = useState<string>("OVERVIEW");
  const [showFloorPlan, setShowFloorPlan] = useState<boolean>(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    startPanX: number;
    startPanY: number;
  }>({ x: 0, y: 0, startPanX: 0, startPanY: 0 });

  const modelType = roomConfig?.roomModelType || (
    roomTypeName.toLowerCase().includes("presidential") || roomTypeName.toLowerCase().includes("royal") || roomTypeName.toLowerCase().includes("penthouse")
      ? "PRESIDENTIAL_ROYAL"
      : roomTypeName.toLowerCase().includes("executive") || roomTypeName.toLowerCase().includes("suite")
      ? "EXECUTIVE_PANORAMIC"
      : roomTypeName.toLowerCase().includes("deluxe") || roomTypeName.toLowerCase().includes("balcony")
      ? "DELUXE_BALCONY"
      : "STANDARD_CLASSIC"
  );

  const fallback3dImages: Record<string, Record<string, string>> = useMemo(() => ({
    PRESIDENTIAL_ROYAL: {
      OVERVIEW: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=2400&q=85",
      BED: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&w=2000&q=85",
      LOUNGE: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85",
      BATH: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=2000&q=85",
      TERRACE: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=2000&q=85",
    },
    EXECUTIVE_PANORAMIC: {
      OVERVIEW: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=2400&q=85",
      BED: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=2000&q=85",
      LOUNGE: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2000&q=85",
      BATH: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=2000&q=85",
      VIEW: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2000&q=85",
    },
    DELUXE_BALCONY: {
      OVERVIEW: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2400&q=85",
      BED: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=2000&q=85",
      BALCONY: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2000&q=85",
      LOUNGE: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=2000&q=85",
    },
    STANDARD_CLASSIC: {
      OVERVIEW: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=2400&q=85",
      BED: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=2000&q=85",
      WINDOW: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=2000&q=85",
      WORKSPACE: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=2000&q=85",
    },
  }), []);

  const floorPlanImage =
    roomConfig?.floorPlanUrl ||
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=85";

  const angleDictionary = useMemo(() => {
    const backendImages = roomConfig?.room3dImages;
    if (backendImages && Object.keys(backendImages).length > 0) {
      return backendImages;
    }
    return fallback3dImages[modelType] || fallback3dImages.STANDARD_CLASSIC;
  }, [roomConfig, fallback3dImages, modelType]);

  const currentImageUrl = useMemo(() => {
    if (showFloorPlan) {
      return floorPlanImage;
    }
    if (isNightMode && roomConfig?.nightLightingImage && activeAngleKey === "OVERVIEW") {
      return roomConfig.nightLightingImage;
    }
    if (!isNightMode && roomConfig?.dayLightingImage && activeAngleKey === "OVERVIEW") {
      return roomConfig.dayLightingImage;
    }
    if (angleDictionary[activeAngleKey]) {
      return angleDictionary[activeAngleKey];
    }
    return (
      roomConfig?.spatialPanoramaUrl ||
      angleDictionary.OVERVIEW ||
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2400&q=85"
    );
  }, [showFloorPlan, isNightMode, roomConfig, activeAngleKey, angleDictionary, floorPlanImage]);

  const selectAngle = (key: string) => {
    setShowFloorPlan(false);
    setActiveAngleKey(key);
    setPanX(0);
    setPanY(0);
    setZoom(1.0);
    setSelectedHotspot(null);
    setImageLoaded(false);
  };

  const toggleFloorPlan = () => {
    setShowFloorPlan((prev) => !prev);
    setSelectedHotspot(null);
    setPanX(0);
    setPanY(0);
    setZoom(1.0);
    setImageLoaded(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (showFloorPlan) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panX,
      startPanY: panY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || showFloorPlan) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const maxPanX = 180 * zoom;
    const maxPanY = 80 * zoom;

    const newX = Math.max(-maxPanX, Math.min(maxPanX, dragStartRef.current.startPanX + deltaX * 0.7));
    const newY = Math.max(-maxPanY, Math.min(maxPanY, dragStartRef.current.startPanY + deltaY * 0.5));

    setPanX(newX);
    setPanY(newY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(1.75, Math.max(0.75, parseFloat((prev + zoomDelta).toFixed(2)))));
  };

  const handleReset = () => {
    setPanX(0);
    setPanY(0);
    setZoom(1.0);
    setSelectedHotspot(null);
    if (showFloorPlan) setShowFloorPlan(false);
  };

  const activeHotspots = useMemo(() => {
    if (showFloorPlan) return [];
    if (roomConfig?.hotspots && roomConfig.hotspots.length > 0) {
      return roomConfig.hotspots;
    }
    if (modelType === "PRESIDENTIAL_ROYAL") {
      return [
        {
          id: "hs_bed",
          title: "Master Four-Poster Canopy Bed",
          description: "Solid dark walnut frame with brushed brass accents and silk damask linens.",
          x: 28,
          y: 52,
          icon: "Bed",
        },
        {
          id: "hs_jacuzzi",
          title: "Carrara Marble Hydro Jacuzzi",
          description: "Freestanding hydrotherapy spa tub with 24k gold fixtures and panoramic views.",
          x: 75,
          y: 42,
          icon: "Bath",
        },
        {
          id: "hs_lounge",
          title: "Chesterfield Leather Parlor",
          description: "Deep button-tufted cognac leather Chesterfield sofa with Italian marble table.",
          x: 52,
          y: 68,
          icon: "Armchair",
        },
      ];
    } else if (modelType === "EXECUTIVE_PANORAMIC") {
      return [
        {
          id: "hs_bed",
          title: "California King Ergonomic Suite",
          description: "High-loft pocket-spring mattress with custom emerald velvet ribbed headboard.",
          x: 35,
          y: 50,
          icon: "Bed",
        },
        {
          id: "hs_skyline",
          title: "Wrap-Around Skyline Windows",
          description: "Floor-to-ceiling acoustic double-glazed glazing with uninterrupted city vistas.",
          x: 78,
          y: 35,
          icon: "Eye",
        },
        {
          id: "hs_jacuzzi",
          title: "Freestanding Soaking Jacuzzi",
          description: "Deep soaking acrylic-core jacuzzi bath with brushed bronze taps.",
          x: 18,
          y: 65,
          icon: "Bath",
        },
      ];
    } else if (modelType === "DELUXE_BALCONY") {
      return [
        {
          id: "hs_bed",
          title: "Plush King Bed Suite",
          description: "King size pocket-spring mattress with teal tufted velvet headboard.",
          x: 38,
          y: 52,
          icon: "Bed",
        },
        {
          id: "hs_balcony",
          title: "Private Furnished Balcony",
          description: "Step out directly to your private terrace overlooking azure ocean waters.",
          x: 76,
          y: 40,
          icon: "Eye",
        },
        {
          id: "hs_espresso",
          title: "Gourmet Nespresso Bar",
          description: "Stocked capsule coffee machine and complimentary minibar amenities.",
          x: 18,
          y: 58,
          icon: "Coffee",
        },
      ];
    } else {
      return [
        {
          id: "hs_bed",
          title: "Comfort Queen Bed",
          description: "Solid oak platform frame with plush 10-inch pocket-spring mattress.",
          x: 48,
          y: 54,
          icon: "Bed",
        },
        {
          id: "hs_window",
          title: "Soundproof Courtyard Glazing",
          description: "Acoustic insulated window framing overlooking landscaped inner court.",
          x: 80,
          y: 38,
          icon: "Eye",
        },
      ];
    }
  }, [showFloorPlan, roomConfig, modelType]);

  const renderHotspotIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case "bed":
        return <Bed className="w-3.5 h-3.5" />;
      case "bath":
        return <Bath className="w-3.5 h-3.5" />;
      case "armchair":
      case "sofa":
        return <Armchair className="w-3.5 h-3.5" />;
      case "coffee":
        return <Coffee className="w-3.5 h-3.5" />;
      case "tv":
        return <Tv className="w-3.5 h-3.5" />;
      default:
        return <Eye className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden select-none bg-slate-950 border border-slate-800 shadow-2xl transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen" : heightClass
      }`}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`relative w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing ${
          showFloorPlan ? "cursor-default" : ""
        }`}
      >
        <div
          className="relative w-full h-full transition-transform duration-150 ease-out will-change-transform"
          style={{
            transform: `scale(${zoom}) translate3d(${panX}px, ${panY}px, 0px)`,
          }}
        >
          <img
            src={currentImageUrl}
            alt={`${roomTypeName} 3D View`}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover pointer-events-none transition-all duration-700 ${
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
            } ${
              isNightMode && !showFloorPlan
                ? "brightness-75 contrast-110 saturate-90 filter hue-rotate-[-5deg]"
                : "brightness-100 contrast-105"
            }`}
          />

          {isNightMode && !showFloorPlan && (
            <div
              className="absolute inset-0 pointer-events-none mix-blend-color-burn opacity-40 bg-gradient-to-t from-amber-950/80 via-transparent to-slate-950/70"
            />
          )}

          {showFloorPlan && (
            <div className="absolute inset-0 pointer-events-none bg-indigo-950/20 backdrop-blur-[1px] border-4 border-indigo-500/30">
              <div className="absolute top-4 left-4 bg-slate-950/90 border border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs font-mono text-indigo-300 shadow-lg flex items-center gap-2">
                <Grid className="w-3.5 h-3.5 text-indigo-400" />
                <span>ARCHITECTURAL FLOOR PLAN • SCALE 1:50</span>
              </div>
            </div>
          )}

          {!showFloorPlan &&
            activeHotspots.map((hs, idx) => {
              const isSelected = selectedHotspot?.id === hs.id;
              const leftPercent = hs.x;
              const topPercent = hs.y;

              return (
                <div
                  key={hs.id || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHotspot(hs);
                  }}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                  }}
                >
                  <span className="absolute -inset-2 rounded-full bg-indigo-500/40 animate-ping group-hover:bg-amber-400/50" />

                  <div
                    className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-2xl backdrop-blur-md transition-all duration-300 transform group-hover:scale-125 ${
                      isSelected
                        ? "bg-amber-500 border-white text-slate-950 shadow-amber-500/50 scale-110"
                        : "bg-slate-950/90 border-indigo-400 text-indigo-300 group-hover:border-amber-400 group-hover:text-amber-300"
                    }`}
                  >
                    {renderHotspotIcon(hs.icon)}
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                    <div className="bg-slate-950/95 border border-indigo-500/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{hs.title}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-10">
            <Compass className="w-8 h-8 text-indigo-400 animate-spin" />
            <span className="text-xs font-mono text-slate-400 tracking-wider">
              Rendering 3D Spatial Environment...
            </span>
          </div>
        )}
      </div>

      <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-4 flex items-center justify-between gap-3 pointer-events-none z-30">
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl px-3.5 py-2 pointer-events-auto flex items-center gap-3 shadow-xl max-w-[70%] sm:max-w-none">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">{roomTypeName}</h4>
              <span className="hidden sm:inline-block text-[10px] bg-indigo-900/80 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">
                {roomSize}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
              <span>{bedType}</span> • <span className="hidden xs:inline">{viewType}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <button
            onClick={toggleFloorPlan}
            className={`p-2 sm:p-2.5 rounded-xl border backdrop-blur-md transition-all shadow-lg flex items-center gap-1.5 text-xs font-bold ${
              showFloorPlan
                ? "bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/25"
                : "bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800"
            }`}
            title="Inspect Architectural Floor Plan"
          >
            <Grid className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">Floor Plan</span>
          </button>

          <button
            onClick={() => setIsNightMode((prev) => !prev)}
            className={`p-2 sm:p-2.5 rounded-xl border backdrop-blur-md transition-all shadow-lg flex items-center gap-1.5 text-xs font-bold ${
              isNightMode
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                : "bg-sky-500/20 text-sky-200 border-sky-400/40 hover:bg-sky-500/30"
            }`}
            title={isNightMode ? "Switch to Natural Daylight" : "Switch to Evening Warm Ambiance"}
          >
            {isNightMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-300" />}
            <span className="hidden md:inline">{isNightMode ? "Warm Night" : "Daylight"}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 backdrop-blur-md transition-all shadow-lg"
            title="Reset Pan & Zoom"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 backdrop-blur-md transition-all shadow-lg"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="absolute bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-4 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none z-30">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl pointer-events-auto shadow-xl overflow-x-auto max-w-full scrollbar-none">
          <span className="text-[10px] text-slate-400 font-mono px-2 hidden lg:inline flex items-center gap-1">
            <Compass className="w-3 h-3 text-indigo-400" /> PERSPECTIVE:
          </span>
          {Object.keys(angleDictionary).map((angleKey) => {
            const isActive = !showFloorPlan && activeAngleKey === angleKey;
            const labelMap: Record<string, string> = {
              OVERVIEW: "360° Tour",
              BED: "Master Bed",
              LOUNGE: "Parlor Lounge",
              BATH: "Spa Bath",
              BALCONY: "Balcony Vista",
              VIEW: "Skyline View",
              WINDOW: "Window Suite",
              TERRACE: "Sun Terrace",
              WORKSPACE: "Work Suite",
            };

            return (
              <button
                key={angleKey}
                onClick={() => selectAngle(angleKey)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <span>{labelMap[angleKey] || angleKey}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-2xl pointer-events-auto shadow-xl">
          <button
            onClick={() => setZoom((z) => Math.max(0.75, parseFloat((z - 0.15).toFixed(2))))}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono text-slate-300 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom((z) => Math.min(1.75, parseFloat((z + 0.15).toFixed(2))))}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {selectedHotspot && (
        <div className="absolute bottom-20 left-4 sm:left-6 max-w-sm bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 shadow-2xl text-white z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Architectural Detail</span>
              </div>
              <h5 className="font-extrabold text-sm text-white mt-0.5">
                {selectedHotspot.title}
              </h5>
            </div>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {selectedHotspot.description}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Verified Finish:</span>
            <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded font-bold border border-indigo-500/30">
              ✓ 5-Star Luxury Grade
            </span>
          </div>
        </div>
      )}

      {onBookNow && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-30">
          <button
            onClick={onBookNow}
            className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm px-6 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-white/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>Reserve {roomTypeName}</span>
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
