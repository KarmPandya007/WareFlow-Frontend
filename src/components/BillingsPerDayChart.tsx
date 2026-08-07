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
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { IndianRupee, ReceiptText, Sparkles, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { getApiUrl } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler);

interface BillingsPerDayChartProps {
  isAdmin?: boolean;
  userId?: string;
  branchId?: string;
  salesPersonId?: string;
  dateRange: DateRangeValue;
}

export default function BillingsPerDayChart({ isAdmin = false, userId, branchId, salesPersonId, dateRange }: BillingsPerDayChartProps) {
  const isDarkTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [previousRevenue, setPreviousRevenue] = useState(0);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      
      const fromTime = new Date(`${dateRange.from}T00:00:00Z`).getTime();
      const toTime = new Date(`${dateRange.to}T00:00:00Z`).getTime();
      const rangeDays = Math.max(1, Math.round((toTime - fromTime) / 86400000) + 1);
      const previousTo = new Date(fromTime - 86400000);
      const previousFrom = new Date(previousTo.getTime() - (rangeDays - 1) * 86400000);
      const previousRange = {
        from: previousFrom.toISOString().slice(0, 10),
        to: previousTo.toISOString().slice(0, 10),
      };
      const params = new URLSearchParams({ fromDate: dateRange.from, toDate: dateRange.to, limit: '10000' });
      const previousParams = new URLSearchParams({ fromDate: previousRange.from, toDate: previousRange.to, limit: '10000' });
      const requestOptions = {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      } as RequestInit;
      const [response, previousResponse] = await Promise.all([
        fetch(`${getApiUrl()}/api/billing?${params.toString()}`, requestOptions),
        fetch(`${getApiUrl()}/api/billing?${previousParams.toString()}`, requestOptions),
      ]);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.billings) {
          const billings = result.billings;
          const dailyMap = new Map<string, { revenue: number; invoices: number }>();

          const matchesSelectedFilters = (billing: any) => {
            if (branchId) {
              const recordBranchId = typeof billing.branch === 'string' ? billing.branch : billing.branch?._id;
              if (String(recordBranchId) !== String(branchId)) return false;
            }
            if (salesPersonId) {
              const recordSalesPersonId = typeof billing.salesPerson === 'object' && billing.salesPerson !== null
                ? billing.salesPerson._id || billing.salesPerson.id
                : billing.salesPerson;
              if (!recordSalesPersonId || String(recordSalesPersonId) !== String(salesPersonId)) return false;
            }
            return true;
          };

          const getRecordDate = (billing: any) => {
            const raw = billing.date || billing.createdAt;
            if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
            const parsed = new Date(raw);
            return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
          };
          
          billings.forEach((billing: any) => {
            const dateStr = getRecordDate(billing);
            
            if (dateRange.from && dateStr < dateRange.from) return;
            if (dateRange.to && dateStr > dateRange.to) return;
            if (!matchesSelectedFilters(billing)) return;
            
            const revenue = Number(billing.totalAmount) || calculateTotalFromProducts(billing);
            const current = dailyMap.get(dateStr) || { revenue: 0, invoices: 0 };
            dailyMap.set(dateStr, { revenue: current.revenue + revenue, invoices: current.invoices + 1 });
          });

          if (previousResponse.ok) {
            const previousResult = await previousResponse.json();
            const previousBillings = previousResult.billings || [];
            const total = previousBillings.reduce((sum: number, billing: any) => {
              const dateStr = getRecordDate(billing);
              if (dateStr < previousRange.from || dateStr > previousRange.to || !matchesSelectedFilters(billing)) return sum;
              return sum + (Number(billing.totalAmount) || calculateTotalFromProducts(billing));
            }, 0);
            setPreviousRevenue(total);
          } else {
            setPreviousRevenue(0);
          }
          
          // Generate all dates in range with zero values for missing dates
          const formattedData: { date: string; revenue: number; invoices: number }[] = [];
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          const currentDate = new Date(fromDate);
          
          while (currentDate <= toDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const daily = dailyMap.get(dateStr) || { revenue: 0, invoices: 0 };
            formattedData.push({ date: dateStr, ...daily });
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
        borderColor: isDarkTheme ? "rgb(249, 115, 22)" : "rgb(37, 99, 235)",
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return isDarkTheme ? "rgba(249, 115, 22, 0.14)" : "rgba(59, 130, 246, 0.12)";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, isDarkTheme ? "rgba(249, 115, 22, 0.24)" : "rgba(59, 130, 246, 0.28)");
          gradient.addColorStop(1, isDarkTheme ? "rgba(249, 115, 22, 0.01)" : "rgba(59, 130, 246, 0.01)");
          return gradient;
        },
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 16,
        pointBackgroundColor: isDarkTheme ? "rgb(249, 115, 22)" : "rgba(59, 130, 246, 1)",
        borderWidth: 2.5,
      },
    ],
  };

  const totalRevenue = dailyRevenueData.reduce((sum, d) => sum + d.revenue, 0);
  const invoiceCount = dailyRevenueData.reduce((sum, d) => sum + (d.invoices || 0), 0);
  const averageInvoice = invoiceCount ? totalRevenue / invoiceCount : 0;
  const bestDay = dailyRevenueData.reduce((best, day) => day.revenue > (best?.revenue || 0) ? day : best, dailyRevenueData[0]);
  const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : null;
  const activeDays = dailyRevenueData.filter(day => day.revenue > 0).length;
  const bestDayShare = totalRevenue > 0 && bestDay ? (bestDay.revenue / totalRevenue) * 100 : 0;
  const formatCompactCurrency = (value: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1
  }).format(value);
  const bestDayLabel = bestDay?.date
    ? new Date(`${bestDay.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        intersect: false,
        mode: 'index' as const,
        displayColors: false,
        padding: 12,
        callbacks: {
          title: (items: any[]) => items[0]?.label || '',
          label: (context: any) => `Revenue: ₹${context.parsed.y.toLocaleString('en-IN')}`,
          afterLabel: (context: any) => `Invoices: ${dailyRevenueData[context.dataIndex]?.invoices || 0}`,
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: isDarkTheme ? "#a3a3a3" : "#6b7280",
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
          color: isDarkTheme ? "#a3a3a3" : "#6b7280",
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
          color: isDarkTheme ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.05)",
          lineWidth: 1,
        },
        border: { display: false },
      },
    },
    elements: {
      line: {
        tension: 0.3,
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6 hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
            <IndianRupee className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {isAdmin ? 'Daily Revenue' : 'My Daily Revenue'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">Performance for the selected period</p>
          </div>
        </div>
        {revenueChange !== null && (
          <div className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold ${revenueChange >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'}`}>
            {revenueChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(revenueChange).toFixed(1)}% vs previous period
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Total revenue', value: formatCompactCurrency(totalRevenue), detail: `${activeDays} active days`, icon: IndianRupee, tone: 'blue' },
          { label: 'Invoices', value: invoiceCount.toLocaleString('en-IN'), detail: `${(invoiceCount / Math.max(1, dailyRevenueData.length)).toFixed(1)} per day`, icon: ReceiptText, tone: 'violet' },
          { label: 'Average invoice', value: formatCompactCurrency(averageInvoice), detail: 'Per billing record', icon: TrendingUp, tone: 'emerald' },
          { label: 'Best day', value: bestDayLabel, detail: formatCompactCurrency(bestDay?.revenue || 0), icon: Trophy, tone: 'amber' },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/80 p-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950/70">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{value}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{detail}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${tone === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50' : tone === 'violet' ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/50' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalRevenue > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <span className="font-bold">Period insight:</span> {bestDayLabel} was the strongest day and generated {bestDayShare.toFixed(0)}% of total revenue. {dailyRevenueData.length - activeDays > 0 ? `${dailyRevenueData.length - activeDays} day${dailyRevenueData.length - activeDays === 1 ? '' : 's'} had no billing activity.` : 'Every day recorded billing activity.'}
          </p>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative" style={{ height: "350px", width: "100%" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
