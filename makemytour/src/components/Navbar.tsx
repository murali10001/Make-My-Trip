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
import { useRouter } from "next/navigation";
import { getAppNotifications, deleteAppNotification } from "@/api";

const Navbar = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const router = useRouter();
  const [showNotifDrawer, setShowNotifDrawer] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifs = async () => {
      const userId = user?.id || user?._id || "";
      if (!userId) {
        setNotifications([]);
        return;
      }
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
        console.error("Failed to fetch navbar notifications", err);
      }
    };
    fetchNotifs();
  }, [user]);

  const logout = () => {
    dispatch(clearUser());
  };

  const removeNotif = async (id: string | number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteAppNotification(id);
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md py-3 sticky top-0 z-50 border-b border-slate-200 shadow-2xs">
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => router.push("/")}
          className="flex items-center space-x-2 cursor-pointer group"
        >
          <div className="p-1.5 bg-red-500 rounded-xl text-white group-hover:scale-105 transition-transform shadow-sm">
            <Plane className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            MakeMyTour
          </span>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center space-x-3">
          
          {/* Features & Updates Dropdown Menu (Clean & Integrated) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs md:text-sm flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Features & Updates</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
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

          {/* Notification Bell Icon 🔔 */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDrawer(!showNotifDrawer)}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all relative shadow-2xs"
              title="Notifications & Updates"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Slide-out Drawer */}
            {showNotifDrawer && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <h3 className="font-extrabold text-slate-900 text-xs">Notifications & Alerts</h3>
                  </div>
                  <button
                    onClick={() => setShowNotifDrawer(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No unread notifications.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 relative group"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 text-[11px]">
                          <span>{n.title}</span>
                          <button
                            onClick={() => removeNotif(n.id)}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-tight">{n.desc}</p>
                        <span className="text-[9px] text-slate-400 font-mono block">{n.time}</span>
                      </div>
                    ))}
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
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full ring-2 ring-blue-500/20"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-blue-600 text-white font-bold">
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
                    <span>Profile</span>
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
