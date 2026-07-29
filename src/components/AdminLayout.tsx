"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
        const role = localStorage.getItem("userRole");
        if (role) setUserRole(role.toLowerCase());
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
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
