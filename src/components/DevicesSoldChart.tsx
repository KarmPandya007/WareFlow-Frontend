"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { DateRangeValue } from "@/components/ui/date-range-picker";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Monitor, Laptop, Gamepad2, Computer } from "lucide-react";
import { getApiUrl } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

interface DevicesSoldChartProps {
  isAdmin?: boolean;
  userId?: string;
  branchId?: string;
  salesPersonId?: string;
  dateRange: DateRangeValue;
}

export default function DevicesSoldChart({ isAdmin = false, userId, branchId, salesPersonId, dateRange }: DevicesSoldChartProps) {
  const [deviceRecords, setDeviceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    fetchBillingData();
  }, [isAdmin, userId, branchId, salesPersonId, dateRange]);

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ startDate: dateRange.from, endDate: dateRange.to });
      if (branchId) params.set('branchId', branchId);
      if (salesPersonId || userId) params.set('userId', salesPersonId || userId || '');
      const response = await fetch(`${getApiUrl()}/api/billing-analytics/devices?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) setDeviceRecords(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dailyDevicesData = useMemo(() => {
    const map = new Map<string, { 
      laptops: number; 
      desktops: number; 
      aios: number; 
      accessories: number;
      laptopsRevenue: number;
      desktopsRevenue: number;
      aiosRevenue: number;
      accessoriesRevenue: number;
    }>();
    const fromDate = dateRange.from ? new Date(dateRange.from) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();
    
    deviceRecords.forEach((record) => {
      const key = record.date;
      if (key) {
        if (!map.has(key)) {
          map.set(key, { 
            laptops: 0, 
            desktops: 0, 
            aios: 0, 
            accessories: 0,
            laptopsRevenue: 0,
            desktopsRevenue: 0,
            aiosRevenue: 0,
            accessoriesRevenue: 0
          });
        }
        const dayData = map.get(key)!;
        const category = ['laptops', 'desktops', 'aios', 'accessories'].includes(record.category)
          ? record.category
          : 'accessories';
        dayData[category as keyof typeof dayData] += Number(record.count) || 0;
        dayData[`${category}Revenue` as keyof typeof dayData] += Number(record.totalAmount) || 0;
      }
    });
    
    const out: { 
      date: string; 
      laptops: number; 
      desktops: number; 
      aios: number; 
      accessories: number;
      laptopsRevenue: number;
      desktopsRevenue: number;
      aiosRevenue: number;
      accessoriesRevenue: number;
    }[] = [];
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const key = currentDate.toISOString().slice(0, 10);
      const data = map.get(key) || { 
        laptops: 0, 
        desktops: 0, 
        aios: 0, 
        accessories: 0,
        laptopsRevenue: 0,
        desktopsRevenue: 0,
        aiosRevenue: 0,
        accessoriesRevenue: 0
      };
      out.push({ date: key, ...data });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return out;
  }, [deviceRecords, dateRange]);

  const labels = dailyDevicesData.map((d) => {
    try {
      return new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    } catch {
      return d.date;
    }
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Laptops',
        data: dailyDevicesData.map((d) => d.laptops),
        borderColor: 'rgba(34, 197, 94, 0.8)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
      },
      {
        label: 'Desktops',
        data: dailyDevicesData.map((d) => d.desktops),
        borderColor: 'rgba(168, 85, 247, 0.8)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(168, 85, 247, 1)',
      },
      {
        label: 'AIOs',
        data: dailyDevicesData.map((d) => d.aios),
        borderColor: 'rgba(245, 158, 11, 0.8)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(245, 158, 11, 1)',
      },
      {
        label: 'Accessories',
        data: dailyDevicesData.map((d) => d.accessories),
        borderColor: 'rgba(239, 68, 68, 0.8)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12, weight: 500 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y} units`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#6b7280",
          font: { size: 11, weight: 500 }
        },
        border: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: "#6b7280",
          font: { size: 11, weight: 500 },
          callback: function(value: any) {
            return value + ' units';
          }
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          lineWidth: 1
        },
        border: { display: false }
      },
    },
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading product data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6 hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-md">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {isAdmin ? 'Products Sold Daily' : 'My Products Sold Daily'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">Product category breakdown over time</p>
          </div>
        </div>
      </div>

      

      {/* Chart Container */}
      <div className="relative" style={{ height: "350px", width: "100%" }}>
        <Line data={chartData} options={options} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-100 dark:border-green-900/50">
          <div className="flex items-center justify-between mb-2">
            <Laptop className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div className="text-lg font-bold text-gray-800 dark:text-slate-100">{dailyDevicesData.reduce((sum, d) => sum + d.laptops, 0)}</div>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Laptops</div>
          <div className="text-base font-bold text-green-600 dark:text-green-400">
            ₹{dailyDevicesData.reduce((sum, d) => sum + d.laptopsRevenue, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-100 dark:border-purple-900/50">
          <div className="flex items-center justify-between mb-2">
            <Computer className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div className="text-lg font-bold text-gray-800 dark:text-slate-100">{dailyDevicesData.reduce((sum, d) => sum + d.desktops, 0)}</div>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Desktops</div>
          <div className="text-base font-bold text-purple-600 dark:text-purple-400">
            ₹{dailyDevicesData.reduce((sum, d) => sum + d.desktopsRevenue, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-100 dark:border-yellow-900/50">
          <div className="flex items-center justify-between mb-2">
            <Monitor className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div className="text-lg font-bold text-gray-800 dark:text-slate-100">{dailyDevicesData.reduce((sum, d) => sum + d.aios, 0)}</div>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">AIOs</div>
          <div className="text-base font-bold text-yellow-600 dark:text-yellow-400">
            ₹{dailyDevicesData.reduce((sum, d) => sum + d.aiosRevenue, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-100 dark:border-red-900/50">
          <div className="flex items-center justify-between mb-2">
            <Gamepad2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div className="text-lg font-bold text-gray-800 dark:text-slate-100">{dailyDevicesData.reduce((sum, d) => sum + d.accessories, 0)}</div>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Accessories</div>
          <div className="text-base font-bold text-red-600 dark:text-red-400">
            ₹{dailyDevicesData.reduce((sum, d) => sum + d.accessoriesRevenue, 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
