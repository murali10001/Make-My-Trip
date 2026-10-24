import React, { useState, useEffect } from "react";
import {
  Star,
  ThumbsUp,
  Flag,
  MessageSquare,
  Camera,
  Plus,
  X,
  Filter,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Send,
  User,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getReviews,
  createReview,
  addReviewReply,
  toggleReviewHelpful,
  flagReview,
} from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ReviewReplyItem {
  replyId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
}

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
  photoUrls: string[];
  helpfulCount: number;
  helpfulUserIds?: string[];
  flagged: boolean;
  flagReason?: string;
  createdAt: string;
  replies: ReviewReplyItem[];
}

interface ReviewsSummaryData {
  reviews: ReviewItem[];
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  photoCount: number;
}

interface ReviewsSectionProps {
  targetId: string;
  targetType: "FLIGHT" | "HOTEL";
  targetTitle?: string;
  currentUser?: {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

const FLAG_REASONS = [
  "Inappropriate or Offensive Language",
  "Spam or Promotional Advertising",
  "False or Misleading Information",
  "Harassment or Hate Speech",
  "Irrelevant or Off-topic Content",
];

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  targetId,
  targetType,
  targetTitle = "Travel Booking",
  currentUser,
}) => {
  const currentUserId = currentUser?._id || currentUser?.id || "guest-user";
  const currentUserName = currentUser?.firstName
    ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim()
    : "Verified Traveler";
  const currentUserEmail = currentUser?.email || "guest@traveler.com";

  const [data, setData] = useState<ReviewsSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState<string>("helpful");
  const [filterRating, setFilterRating] = useState<number>(0);
  const [photosOnly, setPhotosOnly] = useState<boolean>(false);

  const [writeModalOpen, setWriteModalOpen] = useState<boolean>(false);
  const [formRating, setFormRating] = useState<number>(5);
  const [formHoverRating, setFormHoverRating] = useState<number>(0);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formComment, setFormComment] = useState<string>("");
  const [formPhotoUrls, setFormPhotoUrls] = useState<string[]>([]);
  const [photoInputUrl, setPhotoInputUrl] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [flagModalOpen, setFlagModalOpen] = useState<boolean>(false);
  const [flagTargetReview, setFlagTargetReview] = useState<ReviewItem | null>(null);
  const [selectedFlagReason, setSelectedFlagReason] = useState<string>(FLAG_REASONS[0]);
  const [flagSubmitting, setFlagSubmitting] = useState<boolean>(false);

  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const [openReplyBox, setOpenReplyBox] = useState<Record<string, boolean>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({});

  const fetchReviewsData = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const res = await getReviews(targetId, targetType, sortOption, filterRating, photosOnly);
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewsData();
  }, [targetId, targetType, sortOption, filterRating, photosOnly]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Please provide a title for your review.");
      return;
    }
    if (!formComment.trim()) {
      setFormError("Please write your detailed feedback.");
      return;
    }

    setSubmittingReview(true);
    setFormError(null);

    try {
      await createReview({
        targetId,
        targetType,
        targetTitle,
        userId: currentUserId,
        userName: currentUserName,
        userEmail: currentUserEmail,
        rating: formRating,
        title: formTitle.trim(),
        comment: formComment.trim(),
        photoUrls: formPhotoUrls,
      });

      setFormSuccess("Your review and rating have been published successfully!");
      setTimeout(() => {
        setWriteModalOpen(false);
        setFormSuccess(null);
        setFormTitle("");
        setFormComment("");
        setFormPhotoUrls([]);
        fetchReviewsData();
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || "Failed to publish review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddPhotoUrl = () => {
    if (photoInputUrl.trim() && !formPhotoUrls.includes(photoInputUrl.trim())) {
      setFormPhotoUrls([...formPhotoUrls, photoInputUrl.trim()]);
      setPhotoInputUrl("");
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormPhotoUrls(formPhotoUrls.filter((_, i) => i !== index));
  };

  const handleToggleHelpful = async (reviewId: string) => {
    try {
      await toggleReviewHelpful(reviewId, currentUserId);
      fetchReviewsData();
    } catch (err) {
      console.error("Helpful vote error:", err);
    }
  };

  const handleOpenFlagModal = (review: ReviewItem) => {
    setFlagTargetReview(review);
    setSelectedFlagReason(FLAG_REASONS[0]);
    setFlagModalOpen(true);
  };

  const handleSubmitFlag = async () => {
    if (!flagTargetReview) return;
    setFlagSubmitting(true);
    try {
      await flagReview(flagTargetReview.id, currentUserId, selectedFlagReason);
      setFlagModalOpen(false);
      fetchReviewsData();
    } catch (err) {
      console.error("Flag submission error:", err);
    } finally {
      setFlagSubmitting(false);
    }
  };

  const handleSendReply = async (reviewId: string) => {
    const text = replyInputs[reviewId]?.trim();
    if (!text) return;

    setReplySubmitting((prev) => ({ ...prev, [reviewId]: true }));
    try {
      await addReviewReply(reviewId, {
        userId: currentUserId,
        userName: currentUserName,
        comment: text,
      });
      setReplyInputs((prev) => ({ ...prev, [reviewId]: "" }));
      fetchReviewsData();
    } catch (err) {
      console.error("Reply submission error:", err);
    } finally {
      setReplySubmitting((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const ratingLabelMap: Record<number, string> = {
    1: "Terrible Experience",
    2: "Disappointing",
    3: "Average / Satisfactory",
    4: "Very Good & Enjoyable",
    5: "Outstanding & Exceptional",
  };

  const activeReviews = data?.reviews || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">
              Guest Reviews & Traveler Ratings
            </h2>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              Verified Feedback
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real experiences from travelers who booked this {targetType.toLowerCase()}
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setFormSuccess(null);
            setWriteModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Write a Review
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">

          <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 pr-0 md:pr-4 text-center">
            <div className="text-4xl font-black text-slate-900 tracking-tight">
              {data.averageRating > 0 ? data.averageRating.toFixed(1) : "5.0"}
              <span className="text-lg font-medium text-slate-400">/5</span>
            </div>
            <div className="flex items-center gap-1 my-2 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(data.averageRating || 5)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-700">
              Based on {data.totalCount} verified traveler {data.totalCount === 1 ? "review" : "reviews"}
            </p>
            {data.photoCount > 0 && (
              <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                <Camera className="w-3.5 h-3.5" />
                <span>{data.photoCount} Traveler Photos</span>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-1.5 flex flex-col justify-center">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data.ratingDistribution[star] || 0;
              const percentage = data.totalCount > 0 ? Math.round((count / data.totalCount) * 100) : 0;
              const isSelected = filterRating === star;
              return (
                <div
                  key={star}
                  onClick={() => setFilterRating(isSelected ? 0 : star)}
                  className={`flex items-center gap-3 text-xs cursor-pointer py-0.5 px-2 rounded-lg transition-colors ${
                    isSelected ? "bg-amber-100/70 font-bold" : "hover:bg-white"
                  }`}
                >
                  <span className="w-10 flex items-center gap-0.5 font-bold text-slate-700 text-right">
                    {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                  </span>
                  <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        star >= 4 ? "bg-emerald-500" : star === 3 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                    />
                  </div>
                  <span className="w-14 text-right text-[11px] text-slate-500 font-mono">
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none snap-x whitespace-nowrap w-full md:w-auto -mx-1 px-1">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setFilterRating(0)}
            className={`text-xs px-3 py-1 rounded-full font-bold transition-all flex-shrink-0 snap-start ${
              filterRating === 0
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => setFilterRating(filterRating === s ? 0 : s)}
              className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all flex items-center gap-1 flex-shrink-0 snap-start ${
                filterRating === s
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{s}★</span>
            </button>
          ))}

          <button
            onClick={() => setPhotosOnly(!photosOnly)}
            className={`text-xs px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1.5 ml-1 flex-shrink-0 snap-start ${
              photosOnly
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>With Photos Only</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Sort By:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="helpful">Most Helpful</option>
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading verified reviews...</p>
        </div>
      ) : activeReviews.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">No reviews match your selected filter</h4>
          <p className="text-xs text-slate-500 mt-1">
            Try clearing the star or photo filter, or be the first to write a review!
          </p>
          <Button
            onClick={() => {
              setFilterRating(0);
              setPhotosOnly(false);
            }}
            variant="outline"
            className="mt-3 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeReviews.map((rev) => {
            const hasVotedHelpful = rev.helpfulUserIds?.includes(currentUserId);
            const isReplyOpen = openReplyBox[rev.id] || false;

            return (
              <div
                key={rev.id}
                className={`bg-white border rounded-xl p-5 space-y-3 transition-all ${
                  rev.flagged
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200 hover:border-slate-300 shadow-xs"
                }`}
              >

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {rev.userName ? rev.userName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{rev.userName}</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified Traveler
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{rev.createdAt}</span>
                    </div>
                  </div>

                  {rev.flagged ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-1 rounded-md flex items-center gap-1 border border-amber-300">
                      <ShieldAlert className="w-3.5 h-3.5" /> Flagged for Moderation
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenFlagModal(rev)}
                      className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-rose-50"
                      title="Report inappropriate content"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Flag</span>
                    </button>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700 ml-1">
                      {ratingLabelMap[rev.rating] || `${rev.rating} Stars`}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{rev.title}</h4>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {rev.comment}
                </p>

                {rev.photoUrls && rev.photoUrls.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-indigo-600" /> Traveler Photos ({rev.photoUrls.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rev.photoUrls.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setLightboxPhoto(photo)}
                          className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 cursor-pointer transition-all hover:scale-105 shadow-xs relative group"
                        >
                          <img
                            src={photo}
                            alt="Traveler upload"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">

                    <button
                      onClick={() => handleToggleHelpful(rev.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                        hasVotedHelpful
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Helpful ({rev.helpfulCount})</span>
                    </button>

                    <button
                      onClick={() =>
                        setOpenReplyBox((prev) => ({
                          ...prev,
                          [rev.id]: !prev[rev.id],
                        }))
                      }
                      className="text-xs px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Replies ({rev.replies ? rev.replies.length : 0})
                      </span>
                      {isReplyOpen ? (
                        <ChevronUp className="w-3 h-3 ml-0.5" />
                      ) : (
                        <ChevronDown className="w-3 h-3 ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {isReplyOpen && (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-3 mt-2">

                    {rev.replies && rev.replies.length > 0 ? (
                      <div className="space-y-2">
                        {rev.replies.map((rep) => (
                          <div
                            key={rep.replyId}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 text-[11px] flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                {rep.userName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {rep.createdAt}
                              </span>
                            </div>
                            <p className="text-slate-600 text-xs pl-4">{rep.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No replies yet. Start the conversation below!</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Join the discussion or ask a follow-up question..."
                        value={replyInputs[rev.id] || ""}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({
                            ...prev,
                            [rev.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(rev.id);
                          }
                        }}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button
                        onClick={() => handleSendReply(rev.id)}
                        disabled={replySubmitting[rev.id] || !(replyInputs[rev.id]?.trim())}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 h-auto flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>{replySubmitting[rev.id] ? "Posting..." : "Reply"}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={writeModalOpen} onOpenChange={setWriteModalOpen}>
        <DialogContent className="bg-white max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Write a Review for {targetTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Share your authentic experience to help fellow travelers make informed decisions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Overall Rating (1–5 Stars)</label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFormRating(star)}
                      onMouseEnter={() => setFormHoverRating(star)}
                      onMouseLeave={() => setFormHoverRating(0)}
                      className="p-1 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 cursor-pointer ${
                          star <= (formHoverRating || formRating)
                            ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                            : "text-slate-300 hover:text-amber-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-700 ml-2">
                  {ratingLabelMap[formHoverRating || formRating]}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Review Headline</label>
              <input
                type="text"
                placeholder="e.g. Immaculate room, swift check-in, and spectacular views!"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Detailed Feedback</label>
              <textarea
                rows={4}
                placeholder="Describe the cleanliness, comfort, service, punctuality, and highlights of your experience..."
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  Attach Photos (Optional)
                </label>
                <span className="text-[11px] text-slate-400">{formPhotoUrls.length} photos added</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste an image URL (e.g. https://...)"
                  value={photoInputUrl}
                  onChange={(e) => setPhotoInputUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 h-auto"
                >
                  Add
                </Button>
              </div>

              {formPhotoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formPhotoUrls.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 shadow-xs"
                    >
                      <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[11px]">Posting as:</span>
                <p className="font-bold text-slate-800">{currentUserName}</p>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                Verified Booking
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWriteModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingReview}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5"
              >
                {submittingReview ? "Submitting..." : "Publish Review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={flagModalOpen} onOpenChange={setFlagModalOpen}>
        <DialogContent className="bg-white max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Flag Review as Inappropriate
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Our moderation team reviews reported content to maintain traveler safety and credibility.
            </DialogDescription>
          </DialogHeader>

          {flagTargetReview && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-800">"{flagTargetReview.title}"</span>
                <p className="text-slate-500 line-clamp-2">{flagTargetReview.comment}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Select reason for reporting:</label>
                <div className="space-y-1.5">
                  {FLAG_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2 text-xs p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        selectedFlagReason === reason
                          ? "bg-rose-50 border-rose-400 text-rose-900 font-bold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="flagReason"
                        checked={selectedFlagReason === reason}
                        onChange={() => setSelectedFlagReason(reason)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFlagModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitFlag}
                  disabled={flagSubmitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  {flagSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-1.5 rounded-full z-10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxPhoto}
              alt="High resolution traveler photo"
              className="w-full h-full object-contain max-h-[85vh] rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
