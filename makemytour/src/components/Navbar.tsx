import React from "react";
import SignupDialog from "./SignupDialog";
import { LogOut, Plane, User, Activity } from "lucide-react";
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

const Navbar = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const router = useRouter();

  const logout = () => {
    dispatch(clearUser());
  };

  return (
    <header className="bg-white/90 backdrop-blur-md py-3 sticky top-0 z-50 border-b border-slate-200 shadow-2xs">
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => router.push("/")}
          className="flex items-center space-x-2 cursor-pointer group"
        >
          <div className="p-1.5 bg-red-500 rounded-xl text-white group-hover:scale-105 transition-transform">
            <Plane className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            MakeMyTour
          </span>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center space-x-3">
          {/* Task 1: Live Flight Radar Navigation Button */}
          <Button
            variant="outline"
            onClick={() => router.push("/flight-status")}
            className="border-red-200 hover:border-red-400 bg-red-50/50 hover:bg-red-50 text-red-700 font-semibold text-xs md:text-sm flex items-center gap-1.5 shadow-2xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <Activity className="w-4 h-4 text-red-600" />
            <span>Live Flight Tracker</span>
          </Button>

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
