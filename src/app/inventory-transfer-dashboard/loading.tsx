"use client";

import AdminLayout from "@/components/AdminLayout";

export default function InventoryTransferDashboardLoading() {
  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-60 bg-gray-200 dark:bg-slate-800 rounded-md" />
          <div className="h-10 w-44 bg-gray-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-md" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
