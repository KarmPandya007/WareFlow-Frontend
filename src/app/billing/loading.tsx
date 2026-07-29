"use client";

import AdminLayout from "@/components/AdminLayout";

export default function BillingLoading() {
  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="h-8 w-60 bg-gray-200 dark:bg-slate-800 rounded-md" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
