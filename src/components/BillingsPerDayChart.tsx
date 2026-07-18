"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { IndianRupee } from "lucide-react";
import { getApiUrl } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

interface BillingsPerDayChartProps {
  isAdmin?: boolean;
  userId?: string;
  branchId?: string;
  salesPersonId?: string;
}

export default function BillingsPerDayChart({ isAdmin = false, userId, branchId, salesPersonId }: BillingsPerDayChartProps) {
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);
    return {
      from: twoWeeksAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  });

  useEffect(() => {
    fetchBillingData();
  }, [isAdmin, userId, branchId, salesPersonId, dateRange]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/products`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json();
      
      let productsArray: any[] = [];
      if (data && data.success && data.products) {
        productsArray = [
          ...(data.products.laptops || []),
          ...(data.products.desktops || []),
          ...(data.products.aios || []),
          ...(data.products.accessories || [])
        ];
      }
      
      const normalizedProducts = (productsArray || []).map((item: any) => {
        const rawSupported = item.supportedAmount ?? item.supportedamount ?? item.supportedT2DBP ?? item.srp ?? item.price ?? item.sellingPrice ?? item.rate ?? item.amount;
        const supportedAmount = rawSupported !== undefined && rawSupported !== null && !isNaN(Number(rawSupported)) ? Number(rawSupported) : undefined;
        const model = (item.model || item.modelNo || item.name || item.productName || item.itemName || '').toString();
        return { ...item, supportedAmount, model };
      });
      
      setAvailableProducts(normalizedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setAvailableProducts([]);
    }
  };

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      await fetchProducts();
      
      const response = await fetch(`${getApiUrl()}/api/billing`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.billings) {
          const billings = result.billings;
          const dailyMap = new Map<string, number>();
          
          billings.forEach((billing: any) => {
            const billingDate = new Date(billing.date || billing.createdAt);
            const dateStr = billingDate.toISOString().split('T')[0];
            
            if (dateRange.from && dateStr < dateRange.from) return;
            if (dateRange.to && dateStr > dateRange.to) return;
            
            // Filter by branchId if specified
            if (branchId) {
              const recordBranchId = typeof billing.branch === 'string' ? billing.branch : billing.branch?._id;
              if (recordBranchId !== branchId) return;
            }
            
            // Filter by salesPersonId if specified
            if (salesPersonId) {
              let recordSalesPersonId = null;
              if (typeof billing.salesPerson === 'object' && billing.salesPerson !== null) {
                recordSalesPersonId = billing.salesPerson._id || billing.salesPerson.id;
              } else if (typeof billing.salesPerson === 'string') {
                recordSalesPersonId = billing.salesPerson;
              }
              if (!recordSalesPersonId || String(recordSalesPersonId) !== String(salesPersonId)) return;
            }
            
            const revenue = Number(billing.totalAmount) || calculateTotalFromProducts(billing);
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + revenue);
          });
          
          // Generate all dates in range with zero values for missing dates
          const formattedData: { date: string; revenue: number }[] = [];
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          const currentDate = new Date(fromDate);
          
          while (currentDate <= toDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            formattedData.push({
              date: dateStr,
              revenue: dailyMap.get(dateStr) || 0
            });
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          setBillingRecords(formattedData);
        }
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProductsFromRecord = (record: any) => {
    if (!record) return [];
    if (Array.isArray(record.products) && record.products.length > 0) return record.products;
    if (Array.isArray(record.productDetails) && record.productDetails.length > 0) return record.productDetails;
    if (Array.isArray(record.product_details) && record.product_details.length > 0) return record.product_details;
    if (Array.isArray(record.items) && record.items.length > 0) return record.items;
    if (Array.isArray(record.productsList) && record.productsList.length > 0) return record.productsList;
    return [];
  };

  const resolvePrice = (p: any) => {
    if (!p) return 0;
    const possibleKeys = [p._id, p.apiProductId, p.productId, p.id, p.model, p.name, p.productName, p.itemName].filter(key => key && typeof key === 'string' && key.trim().length > 0);
    
    if (availableProducts && availableProducts.length > 0) {
      for (const key of possibleKeys) {
        const found = availableProducts.find((ap: any) => {
          const productKeys = [ap._id, ap.apiProductId, ap.productId, ap.id, ap.model, ap.name, ap.productName, ap.itemName].filter(pk => pk && typeof pk === 'string' && pk.trim().length > 0);
          return productKeys.some(pk => pk.toLowerCase() === key.toLowerCase());
        });
        if (found) {
          const priceFields = ['supportedAmount', 'srp', 'price', 'sellingPrice', 'rate', 'amount', 'cost', 'value'];
          for (const field of priceFields) {
            const value = found[field];
            if (value !== undefined && value !== null && !isNaN(Number(value))) {
              const numValue = Number(value);
              if (numValue > 0) return numValue;
            }
          }
        }
      }
    }
    
    if (typeof p === 'object') {
      const priceFields = ['supportedAmount', 'supportedamount', 'price', 'sellingPrice', 'srp', 'rate', 'amount', 'cost', 'value', 't2DBP'];
      for (const field of priceFields) {
        const value = p[field];
        if (value !== undefined && value !== null && !isNaN(Number(value))) {
          const numValue = Number(value);
          if (numValue > 0) return numValue;
        }
      }
    }
    return 0;
  };

  const calculateTotalFromProducts = (record: any) => {
    // Use totalAmount from API if available
    if (record.totalAmount && !isNaN(Number(record.totalAmount))) {
      return Number(record.totalAmount);
    }
    
    // Fallback to calculating from products
    const products = getProductsFromRecord(record);
    let total = 0;
    products.forEach((p: any) => {
      const qty = Number(p?.quantity ?? p?.qty ?? 1) || 1;
      const price = resolvePrice(p);
      total += price * qty;
    });
    return total;
  };

  const dailyRevenueData = useMemo(() => {
    return billingRecords;
  }, [billingRecords]);

  const labels = dailyRevenueData.map((d) => {
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
        label: "Revenue (₹)",
        data: dailyRevenueData.map((d) => d.revenue),
        borderColor: "rgba(59, 130, 246, 0.8)",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
      },
    ],
  };

  const totalRevenue = dailyRevenueData.reduce((sum, d) => sum + d.revenue, 0);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        intersect: false,
        callbacks: {
          label: function(context: any) {
            return `Revenue: ₹${context.parsed.y.toLocaleString()}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#6b7280",
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: "#6b7280",
          font: {
            size: 11,
            weight: 500,
          },
          callback: function(value: any) {
            if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
            if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
            if (value >= 1000) return '₹' + (value / 1000).toFixed(1) + 'K';
            return '₹' + value.toLocaleString();
          }
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          lineWidth: 1,
        },
        border: { display: false },
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 p-6 rounded-3xl shadow-xl">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading revenue data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
            <IndianRupee className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {isAdmin ? 'Daily Revenue' : 'My Daily Revenue'}
            </h3>
            <p className="text-sm text-gray-600">Total: ₹{totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative" style={{ height: "350px", width: "100%" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
