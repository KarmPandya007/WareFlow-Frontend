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
import { Monitor, Laptop, Gamepad2, Computer } from "lucide-react";
import { getApiUrl } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

interface DevicesSoldChartProps {
  isAdmin?: boolean;
  userId?: string;
  branchId?: string;
  salesPersonId?: string;
}

export default function DevicesSoldChart({ isAdmin = false, userId, branchId, salesPersonId }: DevicesSoldChartProps) {
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
    fetchProducts();
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
      setAvailableProducts(productsArray);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/billing/`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          let filteredBillings = data.billings || [];
          
          // Filter by branch if specified
          if (branchId) {
            filteredBillings = filteredBillings.filter((b: any) => {
              const billBranch = typeof b.branch === 'object' ? b.branch?._id : b.branch;
              return billBranch === branchId;
            });
          }
          
          // Filter by salesPerson if specified
          if (salesPersonId) {
            filteredBillings = filteredBillings.filter((b: any) => {
              let billSalesPerson = null;
              if (typeof b.salesPerson === 'object' && b.salesPerson !== null) {
                billSalesPerson = b.salesPerson._id || b.salesPerson.id;
              } else if (typeof b.salesPerson === 'string') {
                billSalesPerson = b.salesPerson;
              }
              return billSalesPerson && String(billSalesPerson) === String(salesPersonId);
            });
          }
          
          setBillingRecords(filteredBillings);
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

  const resolvePrice = (product: any) => {
    if (!product) return 0;
    
    // Try to find product in availableProducts by matching _id or model
    const productId = product._id || product.id;
    const productModel = product.model || product.name;
    
    const found = availableProducts.find((p: any) => 
      p._id === productId || p.model === productModel || p.name === productModel
    );
    
    if (found) {
      return Number(found.supportedAmount || found.srp || found.price || found.sellingPrice || 0);
    }
    
    // Fallback to product's own price fields
    return Number(product.supportedAmount || product.price || product.sellingPrice || product.srp || 0);
  };

  const categorizeProduct = (product: any) => {
    // Use the category field directly from the new billing model
    if (product.category) {
      const category = product.category.toLowerCase();
      // Map backend categories to frontend display categories
      switch (category) {
        case 'laptops': return 'laptops';
        case 'desktops': return 'desktops';
        case 'aios': return 'aios';
        case 'accessories': return 'accessories';
        default: return 'accessories';
      }
    }
    
    // Fallback for old billing records without category field
    const name = (product.name || product.model || product.productName || product.itemName || '').toUpperCase();
    
    if (name.includes('BAGPACK') || name.includes('BAG') || name.includes('MOUSE') || 
        name.includes('KEYBOARD') || name.includes('HEADSET') || name.includes('SPEAKER') || 
        name.includes('CABLE') || name.includes('ADAPTER') || name.includes('WEBCAM') || 
        name.includes('MIC') || name.includes('PAD') || name.includes('COMBO')) return 'accessories';
    
    if (name.includes('ASUS NB ') || name.includes('GAMING CONSOLES') || 
        name.includes(' NB ') || name.includes('NOTEBOOK') || name.includes('LAPTOP') || 
        name.includes('CONSOLES')) return 'laptops';
    
    if (name.includes('ASUS DT ') || name.includes(' DT ') || 
        name.includes('DESKTOP') || name.includes('TOWER') || name.includes(' PC ')) return 'desktops';
    
    if (name.includes('ASUS AIO ') || name.includes(' AIO ') || name.includes('ALL-IN-ONE')) return 'aios';
    
    return 'accessories';
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
    
    billingRecords.forEach((record) => {
      const d = new Date(record.date || record.createdAt || Date.now());
      const recordDateStr = d.toISOString().split('T')[0];
      const fromDateStr = fromDate.toISOString().split('T')[0];
      const toDateStr = toDate.toISOString().split('T')[0];
      
      if (recordDateStr >= fromDateStr && recordDateStr <= toDateStr) {
        const key = recordDateStr;
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
        
        const products = getProductsFromRecord(record);
        
        products.forEach((product: any) => {
          const qty = Number(product?.quantity ?? product?.qty ?? 1) || 1;
          const category = categorizeProduct(product);
          const price = resolvePrice(product);
          const revenue = price * qty;
          
          dayData[category as keyof typeof dayData] += qty;
          dayData[`${category}Revenue` as keyof typeof dayData] += revenue;
        });
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
  }, [billingRecords, availableProducts, dateRange]);

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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-md">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {isAdmin ? 'Products Sold Daily' : 'My Products Sold Daily'}
            </h3>
            <p className="text-sm text-gray-600">Product category breakdown over time</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
        </div>
      </div>

      

      {/* Chart Container */}
      <div className="relative" style={{ height: "350px", width: "100%" }}>
        <Line data={chartData} options={options} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <Laptop className="w-5 h-5 text-green-600" />
            <div className="text-lg font-bold text-gray-800">{dailyDevicesData.reduce((sum, d) => sum + d.laptops, 0)}</div>
          </div>
          <div className="text-xs text-gray-500 mb-1">Laptops</div>
          <div className="text-base font-bold text-green-600">
            ₹{dailyDevicesData.reduce((sum, d) => sum + d.laptopsRevenue, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <Computer className="w-5 h-5 text-purple-600" />
            <div className="text-lg font-bold text-gray-800">{dailyDevicesData.reduce((sum, d) => sum + d.desktops, 0)}</div>
          </div>
          <div className="text-xs text-gray-500 mb-1">Desktops</div>
          <div className="text-base font-bold text-purple-600">
            ₹{dailyDevicesData.reduce((sum, d) => sum + d.desktopsRevenue, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
          <div className="flex items-center justify-between mb-2">
            <Monitor className="w-5 h-5 text-yellow-600" />
            <div className="text-lg font-bold text-gray-800">{dailyDevicesData.reduce((sum, d) => sum + d.aios, 0)}</div>
          </div>
          <div className="text-xs text-gray-500 mb-1">AIOs</div>
          <div className="text-base font-bold text-yellow-600">
            ₹{dailyDevicesData.reduce((sum, d) => sum + d.aiosRevenue, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <Gamepad2 className="w-5 h-5 text-red-600" />
            <div className="text-lg font-bold text-gray-800">{dailyDevicesData.reduce((sum, d) => sum + d.accessories, 0)}</div>
          </div>
          <div className="text-xs text-gray-500 mb-1">Accessories</div>
          <div className="text-base font-bold text-red-600">
            ₹{dailyDevicesData.reduce((sum, d) => sum + d.accessoriesRevenue, 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}