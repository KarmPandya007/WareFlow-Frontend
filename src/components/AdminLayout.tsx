"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole((localStorage.getItem("userRole") || "user").toLowerCase());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      {userRole ? (
        <Sidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          userRole={userRole}
        />
      ) : (
        <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 animate-pulse border-r border-gray-100 bg-white p-5 md:block dark:border-slate-800 dark:bg-slate-900">
          <div className="h-10 w-28 rounded-lg bg-gray-100 dark:bg-slate-800" />
          <div className="mt-8 space-y-3">
            {[...Array(7)].map((_, index) => <div key={index} className="h-9 rounded-xl bg-gray-100 dark:bg-slate-800/60" />)}
          </div>
        </aside>
      )}
      
      <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
