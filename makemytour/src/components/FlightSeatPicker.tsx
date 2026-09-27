import React, { useState, useEffect } from "react";
import { Plane, Check, Sparkles, Shield, BookmarkCheck, AlertCircle } from "lucide-react";
import { getSeatMap, reserveSeat, saveUserPreferences, getUserPreferences } from "@/api";
import { Button } from "./ui/button";

interface FlightSeatPickerProps {
  flightId: string;
  userId?: string;
  userEmail?: string;
  onSeatSelect: (seat: { seatNo: string; tier: string; priceAddon: number }) => void;
  selectedSeatNo?: string;
}

export const FlightSeatPicker: React.FC<FlightSeatPickerProps> = ({
  flightId,
  userId = "",
  userEmail = "",
  onSeatSelect,
  selectedSeatNo = "",
}) => {
  const [seatMap, setSeatMap] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSeat, setActiveSeat] = useState<any | null>(null);
  const [savePreferenceChecked, setSavePreferenceChecked] = useState<boolean>(true);
  const [prefSavedMsg, setPrefSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeatData = async () => {
      setLoading(true);
      try {
        const data = await getSeatMap(flightId);
        setSeatMap(data);

        // Fetch user preferences to auto-highlight matching seat
        if (userId) {
          const userPrefs = await getUserPreferences(userId);
          if (userPrefs && userPrefs.preferredSeatNo && data?.seats) {
            const match = data.seats.find((s: any) => s.seatNo === userPrefs.preferredSeatNo && s.status === "AVAILABLE");
            if (match && !selectedSeatNo) {
              setActiveSeat(match);
              onSeatSelect({ seatNo: match.seatNo, tier: match.tier, priceAddon: match.priceAddon });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load seat map:", err);
      } finally {
        setLoading(false);
      }
    };
    if (flightId) fetchSeatData();
  }, [flightId, userId]);

  const handleSelectSeat = async (seat: any) => {
    if (seat.status === "OCCUPIED") return;

    setActiveSeat(seat);
    onSeatSelect({ seatNo: seat.seatNo, tier: seat.tier, priceAddon: seat.priceAddon });

    // Auto save preference if checked and logged in
    if (savePreferenceChecked && userId) {
      try {
        await saveUserPreferences({
          userId,
          userEmail,
          preferredSeatType: seat.tier === "EXTRA_LEGROOM" ? "Extra Legroom" : seat.column === "A" || seat.column === "F" ? "Window" : "Aisle",
          preferredSeatNo: seat.seatNo,
        });
        setPrefSavedMsg(`Saved seat ${seat.seatNo} as your default preference for future flights!`);
        setTimeout(() => setPrefSavedMsg(null), 3000);
      } catch (e) {
        console.error("Failed to save seat preference", e);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 animate-pulse text-center">
        <Plane className="w-8 h-8 text-cyan-400 mx-auto animate-bounce mb-2" />
        <p className="text-xs text-slate-400">Loading Dynamic Airplane Cabin Map...</p>
      </div>
    );
  }

  const seats = seatMap?.seats || [];
  const rowsCount = seatMap?.totalRows || 12;

  // Group seats by row
  const rowsMap: { [key: number]: any[] } = {};
  seats.forEach((seat: any) => {
    if (!rowsMap[seat.row]) rowsMap[seat.row] = [];
    rowsMap[seat.row].push(seat);
  });

  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-cyan-400" />
            <h3 className="font-extrabold text-base tracking-tight text-white">
              Interactive Flight Seat Map
            </h3>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded border border-cyan-500/30">
              {seatMap?.aircraftType || "Airbus A320"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select your preferred seat. Premium & Extra Legroom seats include upsell perks.
          </p>
        </div>

        {activeSeat && (
          <div className="bg-cyan-950/80 border border-cyan-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <div className="text-xs">
              <span className="text-slate-300">Selected: </span>
              <strong className="text-cyan-300 font-extrabold">{activeSeat.seatNo}</strong>
              <span className="text-slate-400 font-mono ml-1">
                ({activeSeat.priceAddon > 0 ? `+₹${activeSeat.priceAddon}` : "Included"})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-cyan-600 border border-cyan-300 ring-1 ring-cyan-400/50" />
          <span className="text-slate-200 font-bold">Window Seat (+₹350 - ₹850)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-400" />
          <span className="text-slate-300">Exit Row Extra Legroom (+₹650)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-400" />
          <span className="text-slate-300">Front Row (+₹750 - ₹850)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-400" />
          <span className="text-slate-300 font-bold">Selected Seat</span>
        </div>
      </div>

      {/* Aircraft Fuselage Layout */}
      <div className="max-w-md mx-auto bg-slate-900/60 p-4 rounded-3xl border border-slate-800/80 space-y-3 relative">
        {/* Cockpit Front */}
        <div className="text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center justify-center gap-2">
          <Plane className="w-3.5 h-3.5 text-cyan-400 rotate-90" />
          <span>FRONT OF AIRCRAFT / COCKPIT</span>
        </div>

        {/* Rows Grid */}
        <div className="space-y-2">
          {Object.keys(rowsMap).map((rowStr) => {
            const rowNum = parseInt(rowStr);
            const rowSeats = rowsMap[rowNum];
            const leftSeats = rowSeats.filter((s) => ["A", "B", "C"].includes(s.column));
            const rightSeats = rowSeats.filter((s) => ["D", "E", "F"].includes(s.column));

            return (
              <div key={rowNum} className="flex items-center justify-between gap-2">
                {/* Left Column A, B, C */}
                <div className="flex items-center gap-1.5">
                  {leftSeats.map((s) => {
                    const isSelected = activeSeat?.seatNo === s.seatNo;
                    const isOccupied = s.status === "OCCUPIED";
                    const isWindowSeat = s.column === "A" || s.column === "F";

                    let bgClass = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700";
                    if (s.tier?.includes("WINDOW")) {
                      bgClass = "bg-cyan-950/90 border-cyan-400/80 text-cyan-200 font-extrabold hover:bg-cyan-900 shadow-xs ring-1 ring-cyan-500/30";
                    } else if (s.tier?.includes("EXTRA_LEGROOM")) {
                      bgClass = "bg-amber-600/90 border-amber-400 text-white hover:bg-amber-500";
                    } else if (s.tier?.includes("EXIT_ROW")) {
                      bgClass = "bg-purple-700/90 border-purple-400 text-white hover:bg-purple-600";
                    } else if (s.tier?.includes("PREMIUM_FRONT")) {
                      bgClass = "bg-blue-600/90 border-blue-400 text-white hover:bg-blue-500";
                    }

                    if (isSelected) bgClass = "bg-emerald-500 border-emerald-300 text-white ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950 font-black scale-105 shadow-md";
                    if (isOccupied) bgClass = "bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed opacity-40";

                    return (
                      <button
                        key={s.seatNo}
                        disabled={isOccupied}
                        onClick={() => handleSelectSeat(s)}
                        title={`${s.seatNo} - ${s.featureDescription} (${s.priceAddon > 0 ? `+₹${s.priceAddon}` : "Included"})`}
                        className={`w-9 h-9 rounded-lg border font-bold text-xs flex flex-col items-center justify-center transition-all relative ${bgClass}`}
                      >
                        {isSelected ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <>
                            <span>{s.seatNo}</span>
                            {isWindowSeat && !isOccupied && (
                              <span className="text-[7px] text-cyan-300 font-mono leading-none">WIN</span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Aisle & Row Label */}
                <div className={`text-[10px] font-mono font-bold px-1 rounded px-1.5 py-0.5 ${rowNum === 6 ? "bg-purple-950 text-purple-300 border border-purple-800" : "text-slate-500"}`}>
                  {rowNum === 6 ? "EXIT" : `R${rowNum}`}
                </div>

                {/* Right Column D, E, F */}
                <div className="flex items-center gap-1.5">
                  {rightSeats.map((s) => {
                    const isSelected = activeSeat?.seatNo === s.seatNo;
                    const isOccupied = s.status === "OCCUPIED";
                    const isWindowSeat = s.column === "A" || s.column === "F";

                    let bgClass = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700";
                    if (s.tier?.includes("WINDOW")) {
                      bgClass = "bg-cyan-950/90 border-cyan-400/80 text-cyan-200 font-extrabold hover:bg-cyan-900 shadow-xs ring-1 ring-cyan-500/30";
                    } else if (s.tier?.includes("EXTRA_LEGROOM")) {
                      bgClass = "bg-amber-600/90 border-amber-400 text-white hover:bg-amber-500";
                    } else if (s.tier?.includes("EXIT_ROW")) {
                      bgClass = "bg-purple-700/90 border-purple-400 text-white hover:bg-purple-600";
                    } else if (s.tier?.includes("PREMIUM_FRONT")) {
                      bgClass = "bg-blue-600/90 border-blue-400 text-white hover:bg-blue-500";
                    }

                    if (isSelected) bgClass = "bg-emerald-500 border-emerald-300 text-white ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950 font-black scale-105 shadow-md";
                    if (isOccupied) bgClass = "bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed opacity-40";

                    return (
                      <button
                        key={s.seatNo}
                        disabled={isOccupied}
                        onClick={() => handleSelectSeat(s)}
                        title={`${s.seatNo} - ${s.featureDescription} (${s.priceAddon > 0 ? `+₹${s.priceAddon}` : "Included"})`}
                        className={`w-9 h-9 rounded-lg border font-bold text-xs flex flex-col items-center justify-center transition-all relative ${bgClass}`}
                      >
                        {isSelected ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <>
                            <span>{s.seatNo}</span>
                            {isWindowSeat && !isOccupied && (
                              <span className="text-[7px] text-cyan-300 font-mono leading-none">WIN</span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Preference Toggle */}
      {userId && (
        <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={savePreferenceChecked}
              onChange={(e) => setSavePreferenceChecked(e.target.checked)}
              className="rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700"
            />
            <BookmarkCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-medium">Save seat choice to my profile for future bookings</span>
          </label>
        </div>
      )}

      {prefSavedMsg && (
        <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{prefSavedMsg}</span>
        </div>
      )}
    </div>
  );
};

export default FlightSeatPicker;
