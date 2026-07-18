"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
        const role = localStorage.getItem("userRole");
        setUserRole(role?.toLowerCase() || "user");
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        userRole={userRole} 
      />
      
      <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
