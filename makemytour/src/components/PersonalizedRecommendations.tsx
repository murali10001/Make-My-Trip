import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  Sparkles,
  Info,
  ThumbsUp,
  ThumbsDown,
  X,
  Compass,
  MapPin,
  Plane,
  Hotel,
  Star,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Tag,
  AlertCircle,
  Crown,
  Castle,
} from "lucide-react";
import { getRecommendations, submitRecommendationFeedback } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Recommendation {
  id: string;
  targetType: "DESTINATION" | "HOTEL" | "FLIGHT";
  targetId: string;
  title: string;
  subtitle: string;
  destination: string;
  category: "BEACH" | "HERITAGE" | "LUXURY" | "NATURE" | "BUSINESS";
  imageUrl: string;
  priceEstimate: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  matchScore: number;
  tags: string[];
  actionUrl: string;
  reasonTitle: string;
  reasonExplanation: string;
  reasonBreakdown: string[];
  collaborativeFactor?: string;
  popularityScore: number;
  helpfulCount: number;
  irrelevantCount: number;
}

const CATEGORY_TABS = [
  { id: "ALL", label: "All Picks", icon: Sparkles },
  { id: "BEACH", label: "Beach Escapes", icon: Compass },
  { id: "LUXURY", label: "Luxury Stays", icon: Crown },
  { id: "FLIGHT", label: "Top Flights", icon: Plane },
  { id: "HERITAGE", label: "Heritage & Culture", icon: Castle },
  { id: "NATURE", label: "Nature Retreats", icon: Compass },
];

export default function PersonalizedRecommendations() {
  const router = useRouter();
  const user = useSelector((state: any) => state.user?.user);
  const userId = user?.id || user?._id || user?.email || "";

  const [allRecommendations, setAllRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [feedbackState, setFeedbackState] = useState<{ [id: string]: "HELPFUL" | "IRRELEVANT" }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedExplanation, setSelectedExplanation] = useState<Recommendation | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getRecommendations(userId, "ALL");
        if (isMounted) {
          setAllRecommendations(data || []);
        }
      } catch (err) {
        console.error("Error loading recommendations:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const displayedRecommendations = React.useMemo(() => {
    if (activeCategory === "ALL") return allRecommendations;

    return allRecommendations.filter((item) => {
      const cat = (item.category || "").toUpperCase();
      const targetType = (item.targetType || "").toUpperCase();
      const title = (item.title || "").toLowerCase();
      const dest = (item.destination || "").toLowerCase();
      const subtitle = (item.subtitle || "").toLowerCase();

      if (activeCategory === "FLIGHT") {
        return targetType === "FLIGHT" || cat === "FLIGHT" || title.includes("flight");
      }
      if (activeCategory === "HOTEL") {
        return targetType === "HOTEL" || cat === "HOTEL" || title.includes("hotel") || title.includes("resort");
      }
      if (activeCategory === "BEACH") {
        return (
          cat === "BEACH" ||
          dest.includes("beach") ||
          dest.includes("goa") ||
          dest.includes("bali") ||
          dest.includes("maldives") ||
          dest.includes("kerala") ||
          dest.includes("puri") ||
          dest.includes("andaman") ||
          title.includes("beach") ||
          title.includes("bali") ||
          title.includes("goa") ||
          subtitle.includes("beach") ||
          subtitle.includes("coastal")
        );
      }
      if (activeCategory === "LUXURY") {
        return (
          cat === "LUXURY" ||
          title.includes("palace") ||
          title.includes("leela") ||
          title.includes("taj") ||
          title.includes("marriott") ||
          title.includes("luxury") ||
          subtitle.includes("luxury") ||
          dest.includes("dubai") ||
          (item.priceEstimate && item.priceEstimate >= 5000)
        );
      }
      if (activeCategory === "HERITAGE") {
        return (
          cat === "HERITAGE" ||
          dest.includes("jaipur") ||
          dest.includes("udaipur") ||
          dest.includes("agra") ||
          dest.includes("heritage") ||
          dest.includes("delhi") ||
          title.includes("palace") ||
          title.includes("haveli") ||
          title.includes("fort") ||
          title.includes("heritage")
        );
      }
      if (activeCategory === "NATURE") {
        return (
          cat === "NATURE" ||
          dest.includes("manali") ||
          dest.includes("shimla") ||
          dest.includes("munnar") ||
          dest.includes("ooty") ||
          dest.includes("kashmir") ||
          dest.includes("switzerland") ||
          dest.includes("mountain") ||
          dest.includes("hill") ||
          title.includes("nature") ||
          title.includes("mountain")
        );
      }
      return cat === activeCategory;
    });
  }, [allRecommendations, activeCategory]);

  const handleCategorySelect = (e: React.SyntheticEvent, tabId: string) => {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    setActiveCategory(tabId);
  };

  const handleFeedback = async (
    e: React.MouseEvent,
    rec: Recommendation,
    type: "HELPFUL" | "IRRELEVANT"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const current = feedbackState[rec.id];
    if (current === type) return;

    try {
      setFeedbackState((prev) => ({ ...prev, [rec.id]: type }));
      await submitRecommendationFeedback(rec.id, userId, type);

      if (type === "IRRELEVANT") {
        setToastMessage(`"${rec.title}" removed. We won't suggest this again.`);

        setTimeout(() => {
          setAllRecommendations((prev) => prev.filter((item) => item.id !== rec.id));
        }, 300);
      } else {
        setToastMessage("Thanks for the feedback! We'll tailor more picks like this for you.");
      }
    } catch (err) {
      console.error("Feedback failed:", err);
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const openWhyModal = (e: React.MouseEvent, rec: Recommendation) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedExplanation(rec);
  };

  return (
    <div className="w-full my-4 space-y-4">

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setToastMessage(null);
            }}
            className="text-slate-400 hover:text-white ml-2 p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-2xl p-6 md:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-amber-200 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              AI & Collaborative Travel Intelligence
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Personalized Recommendations Just For You
            </h2>
            <p className="text-blue-100 text-sm md:text-base max-w-2xl font-light leading-relaxed">
              Tailored suggestions powered by collaborative travel patterns, your booking history,
              and saved seat/room preferences. Click any card's explanation to see algorithmic transparency.
            </p>
          </div>

          {user && (
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 flex items-center gap-3.5 shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center font-bold text-slate-900 shadow">
                {user.firstName ? user.firstName[0].toUpperCase() : "U"}
              </div>
              <div>
                <div className="text-xs text-blue-200">Personalized for</div>
                <div className="font-bold text-sm text-white">
                  {user.firstName} {user.lastName || ""}
                </div>
                <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> History Profile Active
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-6 pt-2 scrollbar-none border-t border-white/15 overscroll-x-contain touch-pan-x">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={(e) => handleCategorySelect(e, tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap shadow-sm cursor-pointer touch-manipulation select-none ${
                  isActive
                    ? "bg-white text-blue-900 shadow-md scale-105"
                    : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-white"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 animate-pulse space-y-4"
            >
              <div className="h-44 bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : displayedRecommendations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <Compass className="w-12 h-12 text-slate-400 mx-auto animate-bounce" />
          <h3 className="text-lg font-bold text-slate-800">No recommendations found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            No picks available under this category. Switch to "All Picks" to discover more destinations.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setActiveCategory("ALL");
            }}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition cursor-pointer"
          >
            Show All Recommendations
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayedRecommendations.map((rec) => {
            const isHelpful = feedbackState[rec.id] === "HELPFUL";
            const isIrrelevant = feedbackState[rec.id] === "IRRELEVANT";

            return (
              <div
                key={rec.id}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 relative"
              >

                <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                  {rec.imageUrl ? (
                    <img
                      src={rec.imageUrl}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-4 text-center">
                      {rec.targetType === "FLIGHT" ? (
                        <Plane className="w-10 h-10 mb-2 text-sky-400 opacity-90" />
                      ) : rec.targetType === "HOTEL" ? (
                        <Hotel className="w-10 h-10 mb-2 text-amber-400 opacity-90" />
                      ) : (
                        <Compass className="w-10 h-10 mb-2 text-emerald-400 opacity-90" />
                      )}
                      <span className="text-xs font-bold text-white tracking-wide line-clamp-1">{rec.destination || rec.title}</span>
                      <span className="text-[10px] text-blue-200 uppercase font-semibold mt-0.5">{rec.targetType} EXPERIENCE</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                    <Sparkles className="w-3 h-3 text-emerald-200" />
                    <span>{rec.matchScore}% Match</span>
                  </div>

                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full">
                    {rec.targetType}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold mb-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>{rec.destination}</span>
                    </div>
                    <h3 className="font-bold text-base leading-snug line-clamp-1 drop-shadow-sm">
                      {rec.title}
                    </h3>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">

                  <div
                    onClick={(e) => openWhyModal(e, rec)}
                    className="cursor-pointer bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/70 rounded-xl p-2.5 transition flex items-start justify-between gap-2 group/reason"
                  >
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="line-clamp-1">{rec.reasonTitle}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {rec.reasonExplanation}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => openWhyModal(e, rec)}
                      title="View algorithmic reasoning"
                      className="shrink-0 text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-200/50 transition cursor-pointer touch-manipulation"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{rec.rating}</span>
                      <span className="text-slate-400 font-normal">({rec.reviewCount})</span>
                    </div>
                    {rec.collaborativeFactor && (
                      <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {rec.collaborativeFactor.length > 28
                          ? rec.collaborativeFactor.substring(0, 28) + "..."
                          : rec.collaborativeFactor}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Estimated Fare</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-slate-900">
                          ₹{rec.priceEstimate?.toLocaleString()}
                        </span>
                        {rec.originalPrice > rec.priceEstimate && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{rec.originalPrice?.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(rec.actionUrl || "/");
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1 group-hover:gap-1.5 cursor-pointer touch-manipulation"
                    >
                      <span>Explore</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="text-[10px] text-slate-400">Helpful for you?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleFeedback(e, rec, "HELPFUL")}
                        title="Mark as helpful recommendation"
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition text-[11px] font-medium cursor-pointer touch-manipulation ${
                          isHelpful
                            ? "bg-emerald-100 text-emerald-800 font-bold"
                            : "hover:bg-slate-100 text-slate-600 hover:text-emerald-700"
                        }`}
                      >
                        <ThumbsUp className={`w-3 h-3 ${isHelpful ? "fill-emerald-700" : ""}`} />
                        <span>Helpful</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleFeedback(e, rec, "IRRELEVANT")}
                        title="Remove: Not relevant to me"
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition text-[11px] font-medium cursor-pointer touch-manipulation ${
                          isIrrelevant
                            ? "bg-red-100 text-red-800 font-bold"
                            : "hover:bg-slate-100 text-slate-600 hover:text-red-700"
                        }`}
                      >
                        <X className="w-3 h-3" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(selectedExplanation)}
        onOpenChange={(open) => !open && setSelectedExplanation(null)}
      >
        <DialogContent className="max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
          {selectedExplanation && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Recommendation Transparency</span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-900 leading-snug">
                  Why did we recommend {selectedExplanation.title}?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Detailed factors driving our collaborative filtering and personalization algorithms.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-900">Calculated Compatibility</div>
                  <div className="text-2xl font-black text-blue-700">
                    {selectedExplanation.matchScore}% Match
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {selectedExplanation.reasonTitle}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center shadow-md">
                  <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
                  <span className="text-[10px] font-bold mt-0.5">{selectedExplanation.rating}/5.0</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Algorithmic Explanation
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedExplanation.reasonExplanation}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Key Contributing Factors
                </div>
                <div className="space-y-2">
                  {selectedExplanation.reasonBreakdown &&
                    selectedExplanation.reasonBreakdown.map((factor, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-slate-700 bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-xl"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{factor}</span>
                      </div>
                    ))}
                </div>
              </div>

              {selectedExplanation.collaborativeFactor && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="text-xs text-indigo-900 font-medium">
                    <span className="font-bold">Collaborative Trend: </span>
                    {selectedExplanation.collaborativeFactor}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedExplanation(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer touch-manipulation"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const url = selectedExplanation.actionUrl;
                    setSelectedExplanation(null);
                    router.push(url || "/");
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <span>Book / View Experience</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
