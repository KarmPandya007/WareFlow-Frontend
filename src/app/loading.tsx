"use client";

import AdminLayout from "@/components/AdminLayout";

export default function Loading() {
  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-slate-800 rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-gray-200 dark:bg-slate-800 rounded-md" />
              <div className="h-3 w-60 bg-gray-200 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-slate-800 rounded-lg hidden sm:block" />
        </div>

        {/* Card Skeleton */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-md" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-slate-800/60 rounded-xl w-full" />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
