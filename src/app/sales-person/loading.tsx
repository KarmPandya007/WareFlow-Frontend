"use client";

import AdminLayout from "@/components/AdminLayout";

export default function SalesPersonLoading() {
  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-md" />
          <div className="h-10 w-40 bg-gray-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
