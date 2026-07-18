"use client";

import { useState, useEffect } from "react";
import { Search, Bell, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export default function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("Admin");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("userName");
      const storedRole = localStorage.getItem("userRole");
      if (storedName) {
        setUserName(storedName);
      }
      if (storedRole) {
        setUserRole(storedRole.charAt(0).toUpperCase() + storedRole.slice(1).toLowerCase());
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
        await fetch(`${getApiUrl()}/api/auth/logout`, { method: "POST", credentials: "include" });
        localStorage.clear();
        router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
      // Fallback
      localStorage.clear();
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
        
      
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 p-1 pl-2 pr-1 rounded-full hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-700 leading-none">{userName}</p>
                <p className="text-xs text-gray-500 mt-1">{userRole}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <User className="w-4 h-4" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
