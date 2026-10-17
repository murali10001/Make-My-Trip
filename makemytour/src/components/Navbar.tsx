import React, { useState, useEffect } from "react";
import SignupDialog from "./SignupDialog";
import {
  LogOut,
  Plane,
  User,
  Activity,
  Tag,
  Bell,
  Sparkles,
  ChevronDown,
  CheckCircle,
  X,
  RotateCcw,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { clearUser } from "@/store";
import { useRouter } from "next/router";
import {
  getAppNotifications,
  deleteAppNotification,
  clearAllAppNotifications,
  markAllAppNotificationsRead,
  BACKEND_URL,
} from "@/api";

const Navbar = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const router = useRouter();
  const [showNotifDrawer, setShowNotifDrawer] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const [webPushPermission, setWebPushPermission] = useState<string>("default");

  // Load read notification IDs from localStorage on mount and user change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = `read_notif_ids_${user?.id || user?._id || "guest"}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setReadNotifIds(new Set(parsed));
          }
        } else {
          setReadNotifIds(new Set());
        }
      } catch (e) {
        setReadNotifIds(new Set());
      }
    }
  }, [user]);

  const markIdsAsRead = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      if (typeof window !== "undefined") {
        const storageKey = `read_notif_ids_${user?.id || user?._id || "guest"}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch (e) { }
      }
      return next;
    });
  };

  const isUnread = (n: any) => {
    if (!n || !n.id) return false;
    if (n.isRead === true || n.read === true) return false;
    if (readNotifIds.has(n.id)) return false;
    return true;
  };

  const unreadCount = notifications.filter(isUnread).length;

  const requestBrowserPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setWebPushPermission(perm);
        if (perm === "granted") {
          new window.Notification("MakeMyTour Real-Time Alerts Active", {
            body: "Desktop alerts enabled! You will now see instant popups for flight updates & refund status changes.",
            icon: "/favicon.ico",
          });
        } else if (perm === "denied") {
          alert("Browser notifications are blocked. Please click the lock icon in your address bar to allow Notifications.");
        }
      } catch (err) {
        console.error("Failed to request notification permission", err);
      }
    } else {
      alert("Your browser does not support Desktop Push Notifications.");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setWebPushPermission(Notification.permission);
    }
  }, []);

  // Real-time SSE connection + initial fetch + gentle background sync
  useEffect(() => {
    const userId = user?.id || user?._id || "ALL";

    const fetchNotifs = async () => {
      try {
        const data = await getAppNotifications(userId);
        const filtered = (data || []).filter(
          (n: any) =>
            n &&
            n.type !== "freeze" &&
            (!n.title || !n.title.includes("Fare Locked"))
        );
        setNotifications(filtered);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotifs();

    let eventSource: EventSource | null = null;
    try {
      const streamBase = BACKEND_URL;
      const sseUrl = `${streamBase}/api/notifications/stream?userId=${encodeURIComponent(userId)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("notification", (event: MessageEvent) => {
        try {
          const newNotif = JSON.parse(event.data);
          if (!newNotif || !newNotif.id) return;
          if (newNotif.type === "freeze" || newNotif.title?.includes("Fare Locked")) return;

          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === newNotif.id);
            if (exists) return prev;
            return [newNotif, ...prev];
          });

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new window.Notification(newNotif.title || "MakeMyTour Real-Time Alert", {
                body: newNotif.desc || "New update received",
                icon: "/favicon.ico",
              });
            } catch (e) { }
          }
        } catch (e) {
          console.error("Failed to parse incoming notification SSE:", e);
        }
      });

      eventSource.onerror = () => {
        // EventSource will automatically reconnect on disconnect
      };
    } catch (e) {
      console.error("SSE notification stream connection failed:", e);
    }

    // Gentle fallback sync every 60s and when window regains focus
    const interval = setInterval(fetchNotifs, 60000);
    const onFocus = () => fetchNotifs();
    window.addEventListener("focus", onFocus);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  const logout = () => {
    dispatch(clearUser());
  };

  const removeNotif = async (id: string | number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const userId = user?.id || user?._id || "";
      await deleteAppNotification(id, userId);
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const toggleDrawer = () => {
    const nextState = !showNotifDrawer;
    setShowNotifDrawer(nextState);
    if (nextState) {
      // Mark current notifications as read upon opening drawer
      const currentIds = notifications.map((n) => n.id).filter(Boolean);
      markIdsAsRead(currentIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      const userId = user?.id || user?._id;
      if (userId) {
        markAllAppNotificationsRead(userId).catch(() => { });
      }
      if (webPushPermission === "default") {
        requestBrowserPushPermission();
      }
    }
  };

  const handleMarkAllRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allIds = notifications.map((n) => n.id).filter(Boolean);
    markIdsAsRead(allIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    const userId = user?.id || user?._id;
    if (userId) {
      try {
        await markAllAppNotificationsRead(userId);
      } catch (e) { }
    }
  };

  const handleClearAll = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications([]);
    const userId = user?.id || user?._id;
    if (userId) {
      try {
        await clearAllAppNotifications(userId);
      } catch (e) {
        console.error("Failed to clear notifications:", e);
      }
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md py-2.5 sm:py-3 sticky top-0 z-50 border-b border-slate-200 shadow-2xs w-full max-w-full">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-2">

        <div
          onClick={() => router.push("/")}
          className="flex items-center space-x-1.5 sm:space-x-2 cursor-pointer group shrink-0"
        >
          <div className="p-1 sm:p-1.5 bg-red-500 rounded-xl text-white group-hover:scale-105 transition-transform shadow-sm">
            <Plane className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            MakeMyTour
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs md:text-sm flex items-center gap-1 sm:gap-1.5 shadow-2xs px-2 sm:px-3 py-1 sm:py-1.5 h-8 sm:h-9"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                <span className="hidden sm:inline">Features & Updates</span>
                <span className="sm:hidden text-xs">Tools</span>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end">
              <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Application Tools
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/flight-status")}
                className="cursor-pointer py-2.5"
              >
                <Activity className="mr-2.5 h-4 w-4 text-red-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-xs">Live Flight Tracker</span>
                  <span className="text-[10px] text-slate-500">Real-time status & delays</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/dynamic-pricing")}
                className="cursor-pointer py-2.5"
              >
                <Tag className="mr-2.5 h-4 w-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-xs">Dynamic Rates & Offers</span>
                  <span className="text-[10px] text-slate-500">Price trend graphs & bank cards</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative">
            <button
              type="button"
              onClick={toggleDrawer}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all relative shadow-2xs"
              title="Notifications & Alerts"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              {!showNotifDrawer && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold min-w-4 h-4 px-1 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifDrawer && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] max-w-xs sm:w-84 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <h3 className="font-extrabold text-slate-900 text-xs">Notifications & Alerts</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAllRead(e)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Read</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleClearAll(e)}
                        className="text-[10px] text-slate-500 hover:text-red-600 font-bold flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-red-50 rounded transition-colors"
                        title="Clear all notifications"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifDrawer(false)}
                      className="text-slate-400 hover:text-slate-600 ml-1 p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {webPushPermission !== "granted" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[11px] text-blue-900 space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span>Enable Desktop Alerts</span>
                      <button
                        onClick={requestBrowserPushPermission}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-[10px] font-semibold"
                      >
                        Enable
                      </button>
                    </div>
                    <p className="text-[10px] text-blue-700 leading-tight">
                      Receive instant browser push popups for refund completions and flight updates.
                    </p>
                  </div>
                )}

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">No notifications right now.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {notifications.map((n) => {
                      const unread = isUnread(n);
                      return (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border text-xs space-y-1 relative group transition-colors ${unread
                              ? "bg-blue-50/70 border-blue-200 shadow-2xs"
                              : "bg-slate-50 border-slate-200"
                            }`}
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              {unread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                              )}
                              <span>{n.title}</span>
                            </div>
                            <button
                              onClick={() => removeNotif(n.id)}
                              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete notification"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-tight">{n.desc}</p>
                          <span className="text-[9px] text-slate-400 font-mono block">{n.time}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {notifications.length > 0 && (
                  <div className="border-t border-slate-100 pt-2 flex items-center justify-end text-[10px] text-slate-400">
                    <span>{notifications.length} {notifications.length === 1 ? "alert" : "alerts"}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Button variant="default" onClick={() => router.push("/admin")}>
                  ADMIN
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-blue-500/20 p-0"
                  >
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                      <AvatarFallback className="bg-blue-600 text-white font-bold text-xs sm:text-sm">
                        {user?.firstName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile & Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <RotateCcw className="mr-2 h-4 w-4 text-amber-500" />
                    <span>My Bookings & Refunds</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/flight-status")}>
                    <Activity className="mr-2 h-4 w-4 text-red-500" />
                    <span>Live Flight Status</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/dynamic-pricing")}>
                    <Tag className="mr-2 h-4 w-4 text-emerald-600" />
                    <span>Rates & Offers</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <SignupDialog
              trigger={
                <Button
                  variant="outline"
                  className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                >
                  Sign Up
                </Button>
              }
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
