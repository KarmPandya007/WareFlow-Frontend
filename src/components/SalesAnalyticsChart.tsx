"use client";

import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { IndianRupee, Monitor, Laptop, Computer, Gamepad2 } from "lucide-react";
import { getApiUrl } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

interface SalesData {
  revenue: number;
  laptops: number;
  desktops: number;
  aios: number;
  accessories: number;
  date?: string;
  branch?: string;
}

interface SalesAnalyticsChartProps {
  isAdmin?: boolean;
  userId?: string;
  branchId?: string;
  salesPersonId?: string;
}

export default function SalesAnalyticsChart({ isAdmin = false, userId, branchId, salesPersonId }: SalesAnalyticsChartProps) {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [viewType, setViewType] = useState<'revenue' | 'products'>('revenue');

  useEffect(() => {
    fetchBillingData();
  }, [isAdmin, userId, branchId, salesPersonId, dateRange]);

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
          const billings = data.billings || [];
          setBillingRecords(billings);
          processSalesData(billings);
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

  const categorizeProduct = (product: any) => {
    if (product.category) {
      const category = product.category.toLowerCase();
      switch (category) {
        case 'laptops': return 'laptops';
        case 'desktops': return 'desktops';
        case 'aios': return 'aios';
        case 'accessories': return 'accessories';
        default: return 'accessories';
      }
    }
    
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

  const processSalesData = (billings: any[]) => {
    const branchMap = new Map<string, SalesData>();
    
    billings.forEach((record) => {
      // Filter by date range if specified
      if (dateRange.from || dateRange.to) {
        const recordDate = new Date(record.date || record.createdAt);
        if (dateRange.from && recordDate < new Date(dateRange.from)) return;
        if (dateRange.to && recordDate > new Date(dateRange.to)) return;
      }

      // Filter by branchId if specified
      if (branchId) {
        const recordBranchId = typeof record.branch === 'string' ? record.branch : record.branch?._id;
        if (recordBranchId !== branchId) return;
      }

      // Filter by salesPersonId if specified
      if (salesPersonId) {
        const recordSalesPersonId = typeof record.salesPerson === 'string' ? record.salesPerson : record.salesPerson?._id;
        if (recordSalesPersonId !== salesPersonId) return;
      }

      // Get branch identifier
      const branchName = record.branch?.name || record.branch?.branchName || record.branchName || 'Main Branch';
      
      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, {
          revenue: 0,
          laptops: 0,
          desktops: 0,
          aios: 0,
          accessories: 0,
          branch: branchName
        });
      }
      
      const branchData = branchMap.get(branchName)!;
      
      // Add revenue from totalAmount
      const revenue = Number(record.totalAmount) || 0;
      branchData.revenue += revenue;
      
      // Count products by category
      const products = getProductsFromRecord(record);
      products.forEach((product: any) => {
        const qty = Number(product?.quantity ?? product?.qty ?? 1) || 1;
        const category = categorizeProduct(product);
        if (category === 'laptops' || category === 'desktops' || category === 'aios' || category === 'accessories') {
          branchData[category] += qty;
        }
      });
    });
    
    setSalesData(Array.from(branchMap.values()));
  };

  const getChartData = () => {
    if (viewType === 'revenue') {
      return {
        labels: isAdmin ? salesData.map(d => d.branch || 'Branch') : ['Revenue'],
        datasets: [
          {
            label: 'Revenue (₹)',
            data: isAdmin ? salesData.map(d => d.revenue) : [salesData.reduce((sum, d) => sum + d.revenue, 0)],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
          },
        ],
      };
    } else {
      return {
        labels: isAdmin ? salesData.map(d => d.branch || 'Branch') : ['Products Sold'],
        datasets: [
          {
            label: 'Laptops',
            data: isAdmin ? salesData.map(d => d.laptops) : [salesData.reduce((sum, d) => sum + d.laptops, 0)],
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
          },
          {
            label: 'Desktops',
            data: isAdmin ? salesData.map(d => d.desktops) : [salesData.reduce((sum, d) => sum + d.desktops, 0)],
            backgroundColor: 'rgba(168, 85, 247, 0.8)',
            borderColor: 'rgba(168, 85, 247, 1)',
            borderWidth: 2,
          },
          {
            label: 'AIOs',
            data: isAdmin ? salesData.map(d => d.aios) : [salesData.reduce((sum, d) => sum + d.aios, 0)],
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderColor: 'rgba(245, 158, 11, 1)',
            borderWidth: 2,
          },
          {
            label: 'Accessories',
            data: isAdmin ? salesData.map(d => d.accessories) : [salesData.reduce((sum, d) => sum + d.accessories, 0)],
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
          },
        ],
      };
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: viewType === 'products',
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            if (viewType === 'revenue') {
              return `Revenue: ₹${context.parsed.y.toLocaleString()}`;
            }
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
          font: { size: 12, weight: "bold" as const },
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#6b7280",
          font: { size: 12, weight: "bold" as const },
          callback: function(value: any) {
            if (viewType === 'revenue') {
              return '₹' + value.toLocaleString();
            }
            return value;
          }
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          lineWidth: 1,
        },
        border: { display: false },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 p-6 rounded-3xl shadow-xl">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading sales analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 p-6 rounded-3xl shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 group overflow-hidden">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            {viewType === 'revenue' ? (
              <IndianRupee className="w-5 h-5 text-white" />
            ) : (
              <Monitor className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
              {isAdmin ? 'Branch-wise ' : 'My '}{viewType === 'revenue' ? 'Revenue' : 'Products Sold'}
            </h3>
            <p className="text-sm text-gray-500 font-medium">Sales performance analytics</p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewType('revenue')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewType === 'revenue' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setViewType('products')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewType === 'products' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Products
            </button>
          </div>
          
          {/* Date Range */}
          <div className="flex space-x-2 items-center">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="border border-gray-300 rounded-md p-2 text-sm"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="border border-gray-300 rounded-md p-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative z-10" style={{ height: "400px", width: "100%" }}>
        <Bar data={getChartData()} options={options} />
      </div>

      {/* Summary Cards */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 text-center">
          <IndianRupee className="w-5 h-5 mx-auto text-blue-600 mb-1" />
          <div className="text-lg font-bold text-gray-800">
            ₹{salesData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total Revenue</div>
        </div>
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 text-center">
          <Laptop className="w-5 h-5 mx-auto text-green-600 mb-1" />
          <div className="text-lg font-bold text-gray-800">
            {salesData.reduce((sum, d) => sum + d.laptops, 0)}
          </div>
          <div className="text-xs text-gray-500">Laptops</div>
        </div>
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 text-center">
          <Computer className="w-5 h-5 mx-auto text-purple-600 mb-1" />
          <div className="text-lg font-bold text-gray-800">
            {salesData.reduce((sum, d) => sum + d.desktops, 0)}
          </div>
          <div className="text-xs text-gray-500">Desktops</div>
        </div>
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 text-center">
          <Monitor className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
          <div className="text-lg font-bold text-gray-800">
            {salesData.reduce((sum, d) => sum + d.aios, 0)}
          </div>
          <div className="text-xs text-gray-500">AIOs</div>
        </div>
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 text-center">
          <Gamepad2 className="w-5 h-5 mx-auto text-red-600 mb-1" />
          <div className="text-lg font-bold text-gray-800">
            {salesData.reduce((sum, d) => sum + d.accessories, 0)}
          </div>
          <div className="text-xs text-gray-500">Accessories</div>
        </div>
      </div>
    </div>
  );
}