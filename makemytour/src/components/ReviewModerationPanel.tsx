import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle,
  Trash2,
  RefreshCw,
  Star,
  Camera,
  AlertTriangle,
  Eye,
  MessageSquare,
} from "lucide-react";
import { getFlaggedReviews, moderateReview } from "@/api";
import { Button } from "@/components/ui/button";

interface ReviewItem {
  id: string;
  targetId: string;
  targetType: string;
  targetTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  title: string;
  comment: string;
  photoUrls?: string[];
  flagged: boolean;
  flagReason?: string;
  flaggedByUserId?: string;
  createdAt: string;
  replies?: Array<{
    replyId: string;
    userName: string;
    comment: string;
    createdAt: string;
  }>;
}

export const ReviewModerationPanel: React.FC = () => {
  const [flaggedReviews, setFlaggedReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchFlagged = async () => {
    setLoading(true);
    try {
      const data = await getFlaggedReviews();
      setFlaggedReviews(data || []);
    } catch (err) {
      console.error("Failed to load flagged reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlagged();
  }, []);

  const handleAction = async (reviewId: string, action: "DISMISS" | "REMOVE") => {
    setActionLoading((prev) => ({ ...prev, [reviewId]: true }));
    setMessage(null);
    try {
      const res = await moderateReview(reviewId, action);
      setMessage({
        type: "success",
        text: res?.message || (action === "DISMISS" ? "Flag dismissed." : "Review removed."),
      });
      fetchFlagged();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to process moderation action.",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-extrabold tracking-tight">Review & Content Moderation Queue</h2>
          </div>
          <p className="text-xs text-slate-400">
            Review community-flagged reviews and enforce platform safety by dismissing false reports or removing inappropriate content.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold px-3 py-1.5 rounded-full">
            {flaggedReviews.length} Flagged {flaggedReviews.length === 1 ? "Item" : "Items"}
          </span>
          <Button
            onClick={fetchFlagged}
            disabled={loading}
            variant="outline"
            className="text-xs font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
              : "bg-rose-50 text-rose-800 border border-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-500 space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold">Scanning flagged content from database...</p>
        </div>
      ) : flaggedReviews.length === 0 ? (
        <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 space-y-2">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-900">All Clear! No Flagged Reviews</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All traveler reviews meet community guidelines. When users flag inappropriate feedback, items will appear here for review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {flaggedReviews.map((rev) => {
            const isProcessing = actionLoading[rev.id] || false;
            return (
              <div
                key={rev.id}
                className="bg-white border-2 border-amber-300/80 rounded-2xl p-6 shadow-sm space-y-4"
              >

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black px-2.5 py-1 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Report Reason: {rev.flagReason || "Inappropriate Content"}
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-md">
                      {rev.targetType}: {rev.targetTitle || rev.targetId}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {rev.id}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{rev.userName}</span>
                      <span className="text-slate-400 text-xs">({rev.userEmail || "No email"})</span>
                      <div className="flex text-amber-400 ml-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{rev.createdAt}</span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{rev.title}</h4>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed">
                    {rev.comment}
                  </p>
                </div>

                {rev.photoUrls && rev.photoUrls.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Camera className="w-3 h-3 text-indigo-600" /> Attached Photos ({rev.photoUrls.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {rev.photoUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-16 h-16 rounded-lg overflow-hidden border border-slate-300 block hover:opacity-80 transition-opacity"
                        >
                          <img src={url} alt="Attached" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    onClick={() => handleAction(rev.id, "DISMISS")}
                    disabled={isProcessing}
                    variant="outline"
                    className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Dismiss Report (Keep Review)
                  </Button>

                  <Button
                    onClick={() => handleAction(rev.id, "REMOVE")}
                    disabled={isProcessing}
                    className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove & Delete Review
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewModerationPanel;
