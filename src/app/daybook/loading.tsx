"use client";

import AdminLayout from "@/components/AdminLayout";

export default function DaybookLoading() {
  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-7 w-36 bg-gray-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 space-y-4">
          <div className="h-10 w-full sm:w-64 bg-gray-200 dark:bg-slate-800 rounded-lg" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-slate-800/60 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
