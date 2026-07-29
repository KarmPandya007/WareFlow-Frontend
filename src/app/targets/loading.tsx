"use client";

import AdminLayout from "@/components/AdminLayout";

export default function TargetsLoading() {
  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 space-y-6 animate-pulse">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-7 w-48 bg-gray-200 dark:bg-slate-800 rounded-md" />
            <div className="flex gap-2">
              <div className="h-9 w-28 bg-gray-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-9 w-32 bg-gray-200 dark:bg-slate-800 rounded-lg" />
            </div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800/60 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
