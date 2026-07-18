"use client"

import Navbar from "@/components/Navbar";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { getApiUrl } from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import { FaSackDollar } from "react-icons/fa6";
import { SiGoogledocs } from "react-icons/si";
import { AiOutlineFilePdf } from "react-icons/ai";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "framer-motion";
import DevicesSoldChart from "@/components/DevicesSoldChart";
import BillingsPerDayChart from "@/components/BillingsPerDayChart";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export default function BillingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedBranchForCharts, setSelectedBranchForCharts] = useState<string>('all');
  const [selectedSalesPersonForCharts, setSelectedSalesPersonForCharts] = useState<string>('all');
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBills: 0,
    totalRevenue: 0,
    todayBills: 0,
    todayRevenue: 0,
    monthRevenue: 0
  });

  // Memoize branch names array
  const branchNames = useMemo(() => 
    branches.map(b => b.name || b.branchName || b.code || 'Unknown'),
    [branches]
  );

  // Memoize totals calculation
  const memoizedTotals = useMemo(() => ({
    totalBills: stats.totalBills,
    totalRevenue: stats.totalRevenue,
    todayBills: stats.todayBills,
    todayRevenue: stats.todayRevenue,
    monthRevenue: stats.monthRevenue
  }), [stats]);

  // Memoize filtered and paginated records
  const filteredRecords = useMemo(() => 
    billingRecords.filter(record =>
      record.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [billingRecords, searchTerm]
  );

  const totalPages = useMemo(() => 
    Math.ceil(filteredRecords.length / itemsPerPage),
    [filteredRecords.length, itemsPerPage]
  );

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Charts configuration for slider
  const charts = [
    { name: 'Billings Per Day', component: 'billings' },
    { name: 'Devices Sold', component: 'devices' }
  ];

  // Check role and redirect if not sales person or admin
  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'user' : 'user';
    const normalizedRole = role.toLowerCase();
    setUserRole(normalizedRole);

    if (normalizedRole !== 'sales_person' && normalizedRole !== 'salesman' && normalizedRole !== 'admin') {
      window.location.href = '/';
      return;
    }
  }, []);

  // Fetch branches so we can resolve branch IDs to human-friendly names
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchBranches(),
        fetchSalesPersons(),
        fetchProducts()
      ]);
    };
    loadData();
  }, []);

  const fetchBranches = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/branches`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.status === 401) {
          logger.warn("Unauthorized - redirecting to login");
          window.location.href = '/';
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data && data.success && Array.isArray(data.branches)) {
          setBranches(data.branches);
        } else if (Array.isArray(data)) {
          setBranches(data);
        } else {
          logger.warn("No branches found in response");
          setBranches([]);
        }
      } catch (err) {
        logger.error('Error fetching branches:', err);
        setBranches([]);
      }
    };

    const fetchSalesPersons = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/salespersons/`, {
          method: 'GET',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.salesPersons) setSalesPersons(data.salesPersons);
        }
      } catch (err) {
        logger.error('Error fetching salespersons:', err);
      }
    };

  // Fetch products so we can resolve prices (supportedAmount) by model or _id
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/products`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        logger.error('Products API request failed with status:', res.status);
        return;
      }
      const data = await res.json();

      let productsArray: any[] = [];

      if (data && data.success && data.products) {
          // Structure: { success: true, products: { laptops: [], desktops: [], aios: [], accessories: [] } }
          productsArray = [
            ...(data.products.laptops || []),
            ...(data.products.desktops || []),
            ...(data.products.aios || []),
            ...(data.products.accessories || [])
          ];
        } else if (data && data.success && data.data) {
          // Structure: { success: true, data: { products: { laptops: [], ... } } }
          if (data.data.products) {
            productsArray = [
              ...(data.data.products.laptops || []),
              ...(data.data.products.desktops || []),
              ...(data.data.products.aios || []),
              ...(data.data.products.accessories || [])
            ];
          } else if (Array.isArray(data.data)) {
            productsArray = data.data;
          }
        } else if (data && data.products && Array.isArray(data.products)) {
          // Structure: { products: [] }
          productsArray = data.products;
        } else if (data && data.data && Array.isArray(data.data)) {
          // Structure: { data: [] }
          productsArray = data.data;
        } else if (Array.isArray(data)) {
          // Direct array response
          productsArray = data;
        } else if (data && typeof data === 'object') {
          // Try to find any array in the response
          const findArrays = (obj: any): any[] => {
            if (Array.isArray(obj)) return obj;
            if (typeof obj === 'object') {
              for (const key in obj) {
                if (Array.isArray(obj[key])) {
                  return obj[key];
                }
                const result = findArrays(obj[key]);
                if (result.length > 0) return result;
              }
            }
            return [];
          };
          productsArray = findArrays(data);
        }

        logger.log('Final products array:', productsArray);

        // Normalize products: ensure `supportedAmount` is present and numeric
        const normalizedProducts = (productsArray || []).map((item: any) => {
          if (!item || typeof item !== 'object') return item;

          // Try common fields that may contain the price
          const rawSupported = item.supportedAmount ?? item.supportedamount ?? item.supportedT2DBP ?? item.srp ?? item.price ?? item.sellingPrice ?? item.rate ?? item.amount;
          const supportedAmount = rawSupported !== undefined && rawSupported !== null && !isNaN(Number(rawSupported)) ? Number(rawSupported) : undefined;

          // Ensure model/name strings are present for matching
          const model = (item.model || item.modelNo || item.name || item.productName || item.itemName || '').toString();

          return {
            ...item,
            supportedAmount,
            model
          };
        });

      setAvailableProducts(normalizedProducts);
      setLoadingProducts(false);
    } catch (err) {
      logger.error('Error fetching products for price resolution:', err);
      setAvailableProducts([]);
      setLoadingProducts(false);
    }
  };

  // Recalculate stats when products are loaded to ensure amounts are updated
  useEffect(() => {
    if (billingRecords.length > 0 && availableProducts.length > 0) {
      calculateStats(billingRecords);
    }
  }, [availableProducts, billingRecords]);

  // Fetch billing records from API
  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'user' : 'user';
    const normalizedRole = role.toLowerCase();
    if (normalizedRole !== 'sales_person' && normalizedRole !== 'salesman' && normalizedRole !== 'admin') {
      return;
    }

    const fetchBillings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${getApiUrl()}/api/billing/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });


        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/';
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          const sortedBillings = [...data.billings].sort((a: any, b: any) => {
            const aTime = new Date(a.createdAt || a.date || 0).getTime();
            const bTime = new Date(b.createdAt || b.date || 0).getTime();
            return bTime - aTime;
          });

          setBillingRecords(sortedBillings);
          calculateStats(sortedBillings);
        } else {
          setError('Failed to fetch billing records');
        }
      } catch (err: any) {
        logger.error('Error fetching billings:', err);
        setError(err.message || 'Failed to fetch billing records');
      } finally {
        setLoading(false);
        setIsInitialLoading(false);
      }
    };

    fetchBillings();
  }, []);

  // Helper to extract product lines from a billing record
  const getProductsFromRecord = useCallback((record: any) => {
    if (!record) return [];
    if (Array.isArray(record.products) && record.products.length > 0) return record.products;
    if (Array.isArray(record.productDetails) && record.productDetails.length > 0) return record.productDetails;
    if (Array.isArray(record.product_details) && record.product_details.length > 0) return record.product_details;
    if (Array.isArray(record.items) && record.items.length > 0) return record.items;
    if (Array.isArray(record.productsList) && record.productsList.length > 0) return record.productsList;
    return [];
  }, []);

  // Resolve price for a product
  const resolvePrice = useCallback((p: any) => {
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
  }, [availableProducts]);

  const calculateTotalFromProducts = useCallback((record: any) => {
    if (record.totalAmount && !isNaN(Number(record.totalAmount))) {
      return Number(record.totalAmount);
    }
    const products = getProductsFromRecord(record);
    let total = 0;
    products.forEach((p: any) => {
      const qty = Number(p?.quantity ?? p?.qty ?? 1) || 1;
      const price = resolvePrice(p);
      total += price * qty;
    });
    return total;
  }, [getProductsFromRecord, resolvePrice]);

  const calculateStats = useCallback((records: any[]) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalBills = 0;
    let totalRevenue = 0;
    let todayBills = 0;
    let todayRevenue = 0;
    let monthRevenue = 0;

    records.forEach(record => {
      const recordDate = new Date(record.date);
      const recordAmt = calculateTotalFromProducts(record) || 0;
      
      totalBills++;
      totalRevenue += recordAmt;

      if (recordDate.toLocaleDateString() === todayStr) {
        todayBills++;
        todayRevenue += recordAmt;
      }

      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        monthRevenue += recordAmt;
      }
    });

    setStats({
      totalBills,
      totalRevenue,
      todayBills,
      todayRevenue,
      monthRevenue
    });
  }, [calculateTotalFromProducts]);

  const handleDelete = useCallback(async (recordId: string) => {
    const role = localStorage.getItem('userRole') || 'user';
    if (role.toLowerCase() !== 'admin') {
      toast({ title: "Error", description: "Only administrators can delete billing records", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/billing/${recordId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({ title: "Error", description: "Session expired. Please login again.", variant: "destructive" });
          setTimeout(() => window.location.href = '/login', 1500);
          return;
        }
        throw new Error('Failed to delete record');
      }

      const updatedRecords = billingRecords.filter(r => r._id !== recordId);
      setBillingRecords(updatedRecords);
      calculateStats(updatedRecords);
      setDeleteConfirmId(null);
      toast({ title: "Success", description: "Billing deleted successfully" });
    } catch (err: any) {
      logger.error('Error deleting record:', err);
      toast({ title: "Error", description: err.message || 'Failed to delete record', variant: "destructive" });
    }
  }, [billingRecords, calculateStats, toast]);



  // Memoize helper functions with useCallback
  const getSalesPersonName = useCallback((salesPerson: any) => {
    if (!salesPerson) return 'N/A';
    if (typeof salesPerson === 'string') return salesPerson;
    return `${salesPerson.firstName || ''} ${salesPerson.lastName || ''}`.trim() || 'N/A';
  }, []);

  const formatAmount = useCallback((amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric'
    });
  }, []);

  const formatDateDDMMYYYY = useCallback((dateString?: string) => {
    const d = dateString ? new Date(dateString) : new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = d.toLocaleString('en-US', { month: 'short' });
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mmm}-${yy}`;
  }, []);

  const resolveBranchName = useCallback((branch: any) => {
    if (!branch) return 'Main Branch';
    if (typeof branch === 'string') {
      const found = branches.find(b => {
        if (!b) return false;
        if (b._id === branch || b.id === branch) return true;
        if (typeof b.name === 'string' && b.name === branch) return true;
        if (typeof b.code === 'string' && b.code === branch) return true;
        if (typeof b.name === 'string' && b.name.toLowerCase() === String(branch).toLowerCase()) return true;
        if (typeof b.code === 'string' && b.code.toLowerCase() === String(branch).toLowerCase()) return true;
        return false;
      });
      if (found) return found.name || found.branchName || found.code || branch;
      return 'Main Branch';
    }
    return branch.name || branch.code || branch.branchName || 'Main Branch';
  }, [branches]);

  // Resolve branch identifier from a billing record which may store it under
  // different keys (`branch`, `branchId`, `branchName`, etc.). Return the
  // value that should be passed to `resolveBranchName`.
  const resolveBranchKey = useCallback((record: any) => {
    if (!record) return null;
    // If branch is an object, prefer explicit identifiers inside it
    if (record.branch && typeof record.branch === 'object') {
      return record.branch._id || record.branch.id || record.branch.name || record.branch.branchName || record.branch.code || record.branch;
    }
    if (record.branch) return record.branch;
    if (record.branchId && typeof record.branchId === 'object') {
      return record.branchId._id || record.branchId.id || record.branchId.name || record.branchId.branchName || record.branchId.code || record.branchId;
    }
    if (record.branchId) return record.branchId;
    if (record.branchName) return record.branchName;
    if (record.branchCode) return record.branchCode;
    return null;
  }, []);



    // Compute daily sold device counts for the last N days (placed after helpers)
    const dailySoldData = useMemo(() => {
      const days = 14;
      const map = new Map<string, number>();

      const add = (key: string, n: number) => map.set(key, (map.get(key) || 0) + n);

      billingRecords.forEach((rec) => {
        const products = getProductsFromRecord(rec) || [];
        const qty = products.reduce((s: number, p: any) => s + (Number(p?.quantity ?? p?.qty ?? 1) || 0), 0);
        const d = new Date(rec.date || rec.createdAt || Date.now());
        const key = d.toISOString().slice(0, 10);
        add(key, qty);
      });

      const out: { date: string; count: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        out.push({ date: key, count: map.get(key) || 0 });
      }
      return out;
    }, [billingRecords, getProductsFromRecord]);

  // Compute number of billing records per day (last N days)
  const dailyBillingData = useMemo(() => {
    const days = 14;
    const map = new Map<string, number>();

    const add = (key: string) => map.set(key, (map.get(key) || 0) + 1);

    billingRecords.forEach((rec) => {
      const d = new Date(rec.date || rec.createdAt || Date.now());
      const key = d.toISOString().slice(0, 10);
      add(key);
    });

    const out: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: map.get(key) || 0 });
    }
    return out;
  }, [billingRecords]);

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const convert = (n: number): string => {
      if (n === 0) return '';
      let result = '';
      let i = 0;
      while (n > 0) {
        if (n % 1000 !== 0) {
          result = convertLessThanThousand(n % 1000) + (thousands[i] ? ' ' + thousands[i] : '') + (result ? ' ' + result : '');
        }
        n = Math.floor(n / 1000);
        i++;
      }
      return result.trim();
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = 'INR ' + convert(rupees) + ' Only';
    if (paise > 0) {
      result = result.replace(' Only', '') + ' and ' + convert(paise) + ' Paise Only';
    }
    return result;
  };

  // Format payment mode from the new API structure
  const formatPaymentMode = useCallback((input: any): string => {
    if (!input) return 'N/A';
    
    // Handle new array structure
    if (Array.isArray(input)) {
      const modes = input.map(payment => {
        // Show only the specific details (text inside brackets)
        if (payment.mode === 'Bank' && payment.bankType) {
          return payment.bankType;
        } else if (payment.mode === 'UPI' && payment.upiProvider) {
          return payment.upiProvider;
        } else if (payment.mode === 'Machine' && payment.machineProvider) {
          return payment.machineProvider;
        }
        
        // Fallback to mode if no specific details
        return payment.mode || 'Unknown';
      });
      return modes.join(', ');
    }
    
    // Fallback for old format or string
    return String(input);
  }, []);

  // Handle view record - synchronous as attachments are embedded
  const handleViewRecord = useCallback((record: any) => {
    setViewingRecord(record);
  }, []);

  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = useCallback(async (record: any) => {
    try {
      setPdfDownloadingId(record._id);

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = (doc as any).getWidth ? (doc as any).getWidth() : (doc as any).internal?.pageSize?.getWidth?.();
      const pageHeight = (doc as any).getHeight ? (doc as any).getHeight() : (doc as any).internal?.pageSize?.getHeight?.();
      
      // Page margins and layout
      const marginLeft = 40;
      const marginRight = 40;
      const marginTop = 40;
      const marginBottom = 40;
      
      let currentY = marginTop;

      // Title - "TAX INVOICE" centered with "(ORIGINAL FOR RECIPIENT)" on right
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.text('TAX INVOICE', pageWidth / 2, currentY, { align: 'center' });
      
      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(7);
      const recipientText = '(ORIGINAL FOR RECIPIENT)';
      doc.text(recipientText, pageWidth - marginRight - (doc as any).getTextWidth(recipientText), currentY);
      currentY += 18;

      // Main border rectangle
      const boxLeft = marginLeft;
      const boxRight = pageWidth - marginRight;
      const boxTop = currentY;
      const boxBottom = pageHeight - marginBottom;
      const boxWidth = boxRight - boxLeft;
      const boxHeight = boxBottom - boxTop;
      
      (doc as any).setLineWidth(1);
      (doc as any).rect(boxLeft, boxTop, boxWidth, boxHeight);

      // Main layout: Two columns (Left 66%, Right 34%)
      const leftBoxWidth = boxWidth * 0.66;
      const rightBoxWidth = boxWidth * 0.34;
      const verticalDividerX = boxLeft + leftBoxWidth;

      // Draw main vertical divider
      (doc as any).setLineWidth(0.5);
      doc.line(verticalDividerX, boxTop, verticalDividerX, boxTop + 175);

      // LEFT COLUMN - Split into two sections
      // Top section: Seller Details
      const leftTopHeight = 55;
      const leftTopBottom = boxTop + leftTopHeight;

      // Draw horizontal divider for left column
      doc.line(boxLeft, leftTopBottom, verticalDividerX, leftTopBottom);

      // LEFT TOP: Seller Details
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(8);
      let textY = boxTop + 10;
      doc.text('HARI PRIYA TECHNOLOGIES PRIVATE LIMITED', boxLeft + 3, textY);
      
      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(7);
      textY += 8;
      doc.text('GF 13, BALAJI CENTRE, OPP GURUKUL ROAD,', boxLeft + 3, textY);
      textY += 7;
      doc.text('DRIVE IN ROAD, MEMNAGAR, AHMEDABAD', boxLeft + 3, textY);
      textY += 7;
      doc.text('-380052', boxLeft + 3, textY);
      textY += 8;
      doc.text('GSTIN/UIN: 24AAFCH6549H1ZG', boxLeft + 3, textY);
      textY += 7;
      doc.text('State Name : Gujarat, Code : 24', boxLeft + 3, textY);

      // LEFT BOTTOM: Buyer Details
      const leftBottomTop = leftTopBottom;
      const leftBottomHeight = 120;
      const leftBottomBottom = leftBottomTop + leftBottomHeight;

      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(8);
      let buyerY = leftBottomTop + 10;
      doc.text('Buyer (Bill to)', boxLeft + 3, buyerY);
      
      (doc as any).setFont(undefined, 'bold');
      buyerY += 10;
      doc.text(record.customerName || '', boxLeft + 3, buyerY);
      
      (doc as any).setFont(undefined, 'normal');
      buyerY += 8;
      const buyerAddr = record.address || record.customerAddress || '';
      if (buyerAddr) {
        const addrLines = (doc as any).splitTextToSize(buyerAddr, leftBoxWidth - 20);
        const linesToShow = addrLines.slice(0, 2);
        doc.text(linesToShow, boxLeft + 3, buyerY);
        buyerY += 8 * linesToShow.length;
      }
      
      buyerY += 7;
      doc.text(`State Name   : ${resolveBranchName(resolveBranchKey(record))}, Code : 24`, boxLeft + 3, buyerY);
      
      buyerY += 8;
      // Prefer explicit mobile field first, then fallback to other contact fields
      const mobileNumber = record.mobile || record.mobileNo || record.customerMobile || '';
      const otherContact = record.contact || record.customerContact || record.phone || '';
      const contactDisplay = mobileNumber && otherContact ? `${mobileNumber} / ${otherContact}` : (mobileNumber || otherContact || '');
      doc.text(`Contact      : ${contactDisplay}`, boxLeft + 3, buyerY);
      
      buyerY += 8;
      const emailInfo = record.email || record.customerEmail || '';
      doc.text(`E-Mail       : ${emailInfo}`, boxLeft + 3, buyerY);

      // RIGHT COLUMN: Invoice Details Grid
      const rightColTop = boxTop;
      const rightColHeight = 175;
      const rightColLeft = verticalDividerX + 2;
      const rightColMiddle = verticalDividerX + (rightBoxWidth * 0.50);
      let gridY = rightColTop;
      
      // Draw vertical divider between two columns in invoice details
      (doc as any).setLineWidth(0.3);
      doc.line(rightColMiddle, rightColTop, rightColMiddle, rightColTop + rightColHeight);
      
      // Row 1: Invoice No. | Dated (BOLD LABELS)
      gridY += 9;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('Invoice No.', rightColLeft, gridY);
      doc.text('Dated', rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 2: AESCGR/2526/0695 | 17-Dec-25 (BOLD VALUES)
      gridY += 10;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(8);
      // Generate invoice number: branchCode/2526/random 4-digit number
      let branchCode = '';
      if (record.branch && typeof record.branch === 'object') {
        branchCode = record.branch.code || record.branch.branchCode || record.branch.name || 'BR';
      } else if (record.branchCode) {
        branchCode = record.branchCode;
      } else if (record.branchName) {
        branchCode = record.branchName;
      } else {
        branchCode = 'BR';
      }
      const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      const invoiceNumber = `${branchCode}/2526/${randomNum}`;
      doc.text(invoiceNumber, rightColLeft, gridY);
      const invoiceDate = formatDateDDMMYYYY(record.date || record.createdAt);
      doc.text(invoiceDate, rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 3: Delivery Note | Mode/Terms of Payment (BOLD LABELS)
      gridY += 9;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('Delivery Note', rightColLeft, gridY);
      doc.text('Mode/Terms of Payment', rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 4: Empty | Phone Pe (BOLD VALUE)
      gridY += 10;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(8);
      // Show actual payment mode from the billing record in the PDF
      doc.text(formatPaymentMode(record.paymentMode) || 'N/A', rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 5: Reference No. & Date. | Other References (BOLD LABELS)
      gridY += 9;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('Reference No. & Date.', rightColLeft, gridY);
      doc.text('Other References', rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 6: Date | Anand Gohel (BOLD VALUES)
      gridY += 10;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(8);
      // Use the same formatted date for Reference Date as the invoice 'Dated' field
      const refDateText = invoiceDate;
      doc.text(refDateText, rightColLeft, gridY);
      doc.text(getSalesPersonName(record.salesPerson), rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 7: Buyer's Order No. | Dated (BOLD LABELS)
      gridY += 9;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text("Buyer's Order No.", rightColLeft, gridY);
      doc.text('Dated', rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 8: Dispatch Doc No. | Delivery Note Date (BOLD LABELS)
      gridY += 12;
      doc.text('Dispatch Doc No.', rightColLeft, gridY);
      doc.text('Delivery Note Date', rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 9: Dispatched through | Destination (BOLD LABELS)
      gridY += 12;
      doc.text('Dispatched through', rightColLeft, gridY);
      doc.text('Destination', rightColMiddle + 2, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 10: Self | (empty) (BOLD VALUE)
      gridY += 10;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text('Self', rightColLeft, gridY);
      gridY += 4;
      doc.line(verticalDividerX, gridY, boxRight, gridY);
      
      // Row 11: Terms of Delivery (BOLD LABEL, spanning both columns)
      gridY += 9;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('Terms of Delivery', rightColLeft, gridY);

      // Horizontal line after both sections
      const sectionsBottom = leftBottomBottom;
      doc.line(boxLeft, sectionsBottom, boxRight, sectionsBottom);

      // Section 3: Table Header
      const tableHeaderTop = sectionsBottom;
      const tableHeaderHeight = 28;
      const tableHeaderBottom = tableHeaderTop + tableHeaderHeight;

      // Define 6 column positions: Description of Goods, Quantity, Rate (Incl. of Tax), Rate, Per, Amount
      const tableWidth = boxRight - boxLeft;
      const colDesc = boxLeft;
      // Reduce description width slightly to give more room for footer content
      const colDescWidth = tableWidth * 0.44;
      const colQty = colDesc + colDescWidth;
      const colQtyWidth = tableWidth * 0.09;
      const colRate1 = colQty + colQtyWidth;
      const colRate1Width = tableWidth * 0.1;
      const colRate2 = colRate1 + colRate1Width;
      const colRate2Width = tableWidth * 0.1;
      const colPer = colRate2 + colRate2Width;
      const colPerWidth = tableWidth * 0.07;
      const colAmount = colPer + colPerWidth;

      // Draw vertical lines for columns - moved after items
      // doc.line(colQty, tableHeaderTop, colQty, tableHeaderBottom);
      // doc.line(colRate1, tableHeaderTop, colRate1, tableHeaderBottom);
      // doc.line(colRate2, tableHeaderTop, colRate2, tableHeaderBottom);
      // doc.line(colPer, tableHeaderTop, colPer, tableHeaderBottom);
      // doc.line(colAmount, tableHeaderTop, colAmount, tableHeaderBottom);

      // Table header text
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      let headerY = tableHeaderTop + 10;
      doc.text('Description of Goods', colDesc + 5, headerY);
      doc.text('Quantity', colQty + 5, headerY);
      doc.text('Rate', colRate1 + 5, headerY);
      doc.text('Rate', colRate2 + 5, headerY);
      doc.text('per', colPer + 5, headerY);
      doc.text('Amount', boxRight - 10, headerY, { align: 'right' });
      headerY += 8;
      doc.text('(Incl. of Tax)', colRate1 + 5, headerY);

      // Horizontal line after header
      doc.line(boxLeft, tableHeaderBottom, boxRight, tableHeaderBottom);

      // Section 4: Product Items
      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(8);
      let itemY = tableHeaderBottom + 10;
      
      const products = getProductsFromRecord(record) || [];
      let subTotal = 0;
      const maxItemY = boxBottom - 260; // Reserve more space for totals and footer to avoid overlap

      // Determine whether to apply CGST+SGST (intra-state) or IGST (inter-state)
      const addressLower = String(record.address || record.customerAddress || '').toLowerCase();
      const isGujarat = addressLower.includes('gujarat');

      products.forEach((p: any, idx: number) => {

        if (itemY > maxItemY) return;

        const name = typeof p === 'object' ? (p.name || p.model || p.productName || 'Item') : String(p || 'Item');
        const serial = p.serialNo || p.serialNumber || p.serial || '';
        const batch = p.batch || p.batchNo || '';
        const qty = Number(p?.quantity ?? p?.qty ?? 1) || 1;
        const rateIncludingTax = resolvePrice(p) || 0;
        // Tax calculation per item depends on whether the address is in Gujarat
        const cgstRate = 9;
        const sgstRate = 9;
        const igstRate = 18;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let rateExcludingTax = 0;
        if (isGujarat) {
          // CGST and SGST are 9% each of the price including tax
          cgstAmount = Number((rateIncludingTax * 0.09).toFixed(2));
          sgstAmount = Number((rateIncludingTax * 0.09).toFixed(2));
          // Rate (Excl. of Tax) = product price - CGST - SGST
          rateExcludingTax = Number((rateIncludingTax - cgstAmount - sgstAmount).toFixed(2));
        } else {
          // Inter-state: IGST at 18% of the price
          igstAmount = Number((rateIncludingTax * 0.18).toFixed(2));
          // Rate (Excl. of Tax) = product price - IGST
          rateExcludingTax = Number((rateIncludingTax - igstAmount).toFixed(2));
        }
        // Use rateExcludingTax as the line rate shown in the "Rate" column.
        // Amount column should equal the displayed Rate (excl. tax) multiplied by qty.
        const amount = rateExcludingTax * qty;
        const roundOff = 0.00;
        subTotal += amount;

        const startY = itemY;
        
        // Product name (bold) in Description column
        (doc as any).setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text(name, colDesc + 5, itemY);
        itemY += 10;

        // Serial number in Description column (under product name, aligned left)
        if (serial) {
          (doc as any).setFont(undefined, 'normal');
          doc.setFontSize(7);
          doc.text(`S/N: ${serial}`, colDesc + 5, itemY); // align with product name
          itemY += 10;
        }

        // Batch number in Description column (if present and not same as serial)
        if (batch && batch !== serial) {
          (doc as any).setFont(undefined, 'normal');
          doc.setFontSize(7);
          doc.text(batch, colDesc + 20, itemY);
          itemY += 10;
        }

        // Add spacing before tax details
        itemY += 2;

        // Tax details in Description column (right-aligned within description)
        (doc as any).setFont(undefined, 'normal');
        doc.setFontSize(7);
        const taxLabelX = colDesc + 135;
        const taxPercentX = colDesc + 195;
        const taxAmountX = colDesc + 225;
        
        if (isGujarat) {
          doc.text('OUTPUT CGST', taxLabelX, itemY);
          doc.text(`${cgstRate}%`, taxPercentX, itemY, { align: 'right' });
          doc.text(cgstAmount.toFixed(2), taxAmountX, itemY, { align: 'right' });
          itemY += 8;

          doc.text('OUTPUT SGST', taxLabelX, itemY);
          doc.text(`${sgstRate}%`, taxPercentX, itemY, { align: 'right' });
          doc.text(sgstAmount.toFixed(2), taxAmountX, itemY, { align: 'right' });
          itemY += 8;
        } else {
          doc.text('OUTPUT IGST', taxLabelX, itemY);
          doc.text(`${igstRate}%`, taxPercentX, itemY, { align: 'right' });
          doc.text(igstAmount.toFixed(2), taxAmountX, itemY, { align: 'right' });
          itemY += 8;
        }
        
        doc.text('ROUND OFF', taxLabelX, itemY);
        doc.text(`${roundOff >= 0 ? '' : '(-)'}${Math.abs(roundOff).toFixed(2)}`, taxAmountX, itemY, { align: 'right' });
        itemY += 12;

        // "Less:" label in Description column (only if round off is negative)
        if (roundOff < 0) {
          doc.text('Less:', colDesc + 5, itemY);
        }

        // Reset position for other columns (all aligned to startY)
        (doc as any).setFont(undefined, 'normal');
        doc.setFontSize(8);
        
        let qtyY = startY;
        // Quantity column - "1 NO." on two lines
        doc.text(`${qty} NO.`, colQty + 10, qtyY);
        qtyY += 10;
        doc.text(`${qty} NO.`, colQty + 10, qtyY);

        // Rate (incl. of Tax) column
        doc.text(rateIncludingTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colRate1 + colRate1Width - 10, startY, { align: 'right' });

        // Rate column (second) - show rate excluding tax
        doc.text(rateExcludingTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colRate2 + colRate2Width - 10, startY, { align: 'right' });

        // Per column
        doc.text('NO.', colPer + 8, startY);

        // Amount column
        doc.text(amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), boxRight - 10, startY, { align: 'right' });

        itemY += 15;
      });

      // Draw vertical lines for columns around the entire table
      doc.line(colQty, tableHeaderTop, colQty, maxItemY);
      doc.line(colRate1, tableHeaderTop, colRate1, maxItemY);
      doc.line(colRate2, tableHeaderTop, colRate2, maxItemY);
      doc.line(colPer, tableHeaderTop, colPer, maxItemY);
      doc.line(colAmount, tableHeaderTop, colAmount, maxItemY);
      // Also draw outer lines if needed
      doc.line(boxLeft, tableHeaderTop, boxLeft, maxItemY);
      doc.line(boxRight, tableHeaderTop, boxRight, maxItemY);

      // Move to totals area
      let totalsY = maxItemY + 5;
      doc.line(boxLeft, totalsY, boxRight, totalsY);

      // Calculate subtotal as sum of rateIncludingTax × qty
      let subtotalExcludingTax = 0;
      let subtotalIncludingTax = 0;
      products.forEach((p: any) => {
        const qty = Number(p?.quantity ?? p?.qty ?? 1) || 1;
        const rateIncludingTax = resolvePrice(p) || 0;
        // Calculate rateExcludingTax for each product
        let cgstAmount = 0;
        let sgstAmount = 0;
        let rateExcludingTax = 0;
        if (isGujarat) {
          cgstAmount = Number((rateIncludingTax * 0.09).toFixed(2));
          sgstAmount = Number((rateIncludingTax * 0.09).toFixed(2));
          rateExcludingTax = Number((rateIncludingTax - cgstAmount - sgstAmount).toFixed(2));
        } else {
          const igstAmount = Number((rateIncludingTax * 0.18).toFixed(2));
          rateExcludingTax = Number((rateIncludingTax - igstAmount).toFixed(2));
        }
        subtotalExcludingTax += rateExcludingTax * qty;
        subtotalIncludingTax += rateIncludingTax * qty;
      });
      subtotalExcludingTax = Number(subtotalExcludingTax.toFixed(2));
      subtotalIncludingTax = Number(subtotalIncludingTax.toFixed(2));
      const roundOff = 0.00;

      // Compute tax totals depending on state
      let displayCgstAmount = 0;
      let displaySgstAmount = 0;
      let displayIgstAmount = 0;
      let totalTax = 0;
      if (isGujarat) {
        displayCgstAmount = Number((subtotalIncludingTax * 0.09).toFixed(2));
        displaySgstAmount = Number((subtotalIncludingTax * 0.09).toFixed(2));
        totalTax = Number((displayCgstAmount + displaySgstAmount).toFixed(2));
      } else {
        displayIgstAmount = Number((subtotalIncludingTax * 0.18).toFixed(2));
        totalTax = Number((displayIgstAmount).toFixed(2));
      }

      const totalAmount = subtotalIncludingTax;

      // Subtotal row (show subtotal including tax)
      totalsY += 12;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text('Subtotal', colDesc + 5, totalsY);
      doc.text(String(subtotalExcludingTax.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

      // Tax rows (CGST/SGST for Gujarat, IGST otherwise)
      totalsY += 10;
      if (isGujarat) {
        doc.text('Output CGST (9%)', colDesc + 5, totalsY);
        doc.text(String(displayCgstAmount.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

        totalsY += 10;
        doc.text('Output SGST (9%)', colDesc + 5, totalsY);
        doc.text(String(displaySgstAmount.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
      } else {
        doc.text('Output IGST (18%)', colDesc + 5, totalsY);
        doc.text(String(displayIgstAmount.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
      }

      // Round off row
      totalsY += 10;
      doc.text('Round Off', colDesc + 5, totalsY);
      doc.text(String(roundOff.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

      // Total row
      totalsY += 10;
      doc.line(boxLeft, totalsY, boxRight, totalsY);
      totalsY += 10;
      doc.text('Total', colDesc + 5, totalsY);
      doc.text(String(subtotalIncludingTax.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

      // Tax breakdown header
      totalsY += 12;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('HSN/SAC', boxLeft + 40, totalsY);
      doc.text('Taxable', boxLeft + 140, totalsY);
      doc.text('Value', boxLeft + 140, totalsY + 7);
      doc.text('Central Tax', boxLeft + 240, totalsY);
      doc.text('Rate    Amount', boxLeft + 240, totalsY + 7);
      doc.text('State Tax', boxLeft + 360, totalsY);
      doc.text('Rate    Amount', boxLeft + 360, totalsY + 7);
      doc.text('Total', boxLeft + 480, totalsY);
      doc.text('Tax Amount', boxLeft + 470, totalsY + 7);

      totalsY += 14;
      doc.line(boxLeft, totalsY, boxRight, totalsY);

      // Tax calculation row - show breakdown depending on state
      const cgstRate = 9;
      const sgstRate = 9;
      const igstRate = 18;
      const breakdownTaxTotal = totalTax; // from earlier computation (displayCgst+displaySgst or displayIgst)
      
      // Calculate taxable value (subtotal excluding tax)
      const taxableValue = Number((subtotalIncludingTax - totalTax).toFixed(2));

      totalsY += 10;
      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.text(String(taxableValue.toFixed(2)), boxLeft + 200, totalsY, { align: 'right' });
      if (isGujarat) {
        doc.text(`${cgstRate}%`, boxLeft + 240, totalsY);
        doc.text(String(displayCgstAmount.toFixed(2)), boxLeft + 320, totalsY, { align: 'right' });
        doc.text(`${sgstRate}%`, boxLeft + 360, totalsY);
        doc.text(String(displaySgstAmount.toFixed(2)), boxLeft + 440, totalsY, { align: 'right' });
        doc.text(String(breakdownTaxTotal.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
      } else {
        doc.text(`${igstRate}%`, boxLeft + 240, totalsY);
        doc.text(String(displayIgstAmount.toFixed(2)), boxLeft + 320, totalsY, { align: 'right' });
        // leave SGST column blank for IGST
        doc.text('-', boxLeft + 360, totalsY);
        doc.text('-', boxLeft + 440, totalsY);
        doc.text(String(breakdownTaxTotal.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
      }

      totalsY += 10;
      doc.line(boxLeft, totalsY, boxRight, totalsY);

      // Grand total row
      totalsY += 10;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('Total', boxLeft + 40, totalsY);
      doc.text(String(subTotal.toFixed(2)), boxLeft + 160, totalsY, { align: 'right' });
      doc.text(String(totalTax.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

      totalsY += 8;
      doc.line(boxLeft, totalsY, boxRight, totalsY);

      // Footer area: Amount in words (kept concise) and the requested left/right bottom content
      totalsY += 12;
      (doc as any).setFont(undefined, 'normal');
      const amountWordsFont = 8;
      doc.setFontSize(amountWordsFont);
      doc.text('Amount Chargeable (in words)', boxLeft + 5, totalsY);
      totalsY += amountWordsFont + 4;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(amountWordsFont);
      doc.text(numberToWords(totalAmount), boxLeft + 5, totalsY);

      totalsY += amountWordsFont + 6;
      doc.line(boxLeft, totalsY, boxRight, totalsY);

      // Now render the left Declaration and right Bank Details side-by-side
      totalsY += 8;
      const footerDividerX = boxLeft + (boxWidth * 0.5);

      // LEFT: Declaration (as the user specified)
      const declarationText = [
        'Declaration',
        '1) We declare that this invoice shows the actual price of the',
        'goods described and that all particulars are true and correct.',
        '2) Parts once sold will not be taken back',
        '3) We are not responsible for any shortage/lose/damage once the parts are delivered to',
        'buyer or their Agent.',
        '4) Cheque Return Charges Rs.500/-',
        '5) '
      ].join(' ');

      const leftFont = 7;
      doc.setFontSize(leftFont);
      (doc as any).setFont(undefined, 'bold');
      doc.text('Declaration', boxLeft + 5, totalsY);
      (doc as any).setFont(undefined, 'normal');
      const declLines = (doc as any).splitTextToSize(declarationText.replace(/\s+/g, ' '), boxWidth * 0.48 - 10);
      let declY = totalsY + 10;
      declLines.forEach((line: string) => {
        doc.text(line, boxLeft + 5, declY);
        declY += leftFont + 2;
      });

      // RIGHT: Bank Details
      const bankFont = 7;
      doc.setFontSize(bankFont);
      (doc as any).setFont(undefined, 'bold');
      doc.text("Company's Bank Details", footerDividerX + 10, totalsY);
      (doc as any).setFont(undefined, 'normal');
      let bankY = totalsY + 10;
      doc.setFontSize(bankFont);
      doc.text("A/c Holder's Name : HARI PRIYA TECHNOLOGIES PRIVATE LIMITED", footerDividerX + 10, bankY);
      bankY += bankFont + 2;
      doc.text('Bank Name : ICICI BANK A/C', footerDividerX + 10, bankY);
      bankY += bankFont + 2;
      doc.text('A/c No. : 777705010091', footerDividerX + 10, bankY);
      bankY += bankFont + 2;
      doc.text('Branch & IFS Code : CG ROAD & ICIC0001367', footerDividerX + 10, bankY);

      // Draw a horizontal separator above final footer note
      const footerBottomY = Math.max(declY, bankY) + 10;
      // removed the full-width horizontal separator here to avoid a line above the
      // signature texts; the signature area will show only vertical separators
      // so the texts are not underlined.

      // Signature box: use the already-drawn separator as the top border, draw a bottom border and small divider
      const footerDividerX2 = boxLeft + (boxWidth * 0.5);
      const sigBoxTop = footerBottomY; // top border already exists here

      // Desired signature box height (adjust visually as needed)
      const desiredSigBoxHeight = 64; // a modest, visually pleasing size
      // Ensure signature box stays within the main framed rectangle (no overflow)
      const maxAllowedBottom = boxBottom - 8; // leave small clearance from main frame bottom
      const boxBottomY = Math.min(sigBoxTop + desiredSigBoxHeight, maxAllowedBottom);
      const sigBoxHeight = boxBottomY - sigBoxTop;

      // Borders for the signature area removed per request; no lines are drawn here.

      // Place texts with comfortable top and bottom padding inside the rect
      // Move primary signature text a bit higher and keep the "Authorised Signatory"
      // aligned near the bottom of the signature rectangle so centered notes stay below.
      // Position primary signature texts nearer the bottom of the signature box
      // to match the provided layout: main lines just above the bottom border,
      // 'Authorised Signatory' placed just above the bottom edge inside the box.
      const primaryBaselineY = boxBottomY - 18; // main text baseline

      // Draw a thin horizontal line above the main signature texts
      // so both the left and right signature labels have a separator above them.
      (doc as any).setLineWidth(0.5);
      const signatureSeparatorY = primaryBaselineY - 10;
      doc.line(boxLeft + 2, signatureSeparatorY, boxRight - 2, signatureSeparatorY);

      // LEFT: Customer's Seal and Signature (left-aligned, baseline near bottom)
      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text("Customer's Seal and Signature", boxLeft + 8, primaryBaselineY);

      // RIGHT: Company signature block (right-aligned, same baseline)
      doc.setFontSize(9);
      (doc as any).setFont(undefined, 'bold');
      doc.text('for HARI PRIYA TECHNOLOGIES PRIVATE LIMITED', boxRight - 8, primaryBaselineY, { align: 'right' });
      (doc as any).setFont(undefined, 'normal');
      // place 'Authorised Signatory' slightly above the bottom of the box
      doc.setFontSize(7.5);
      const authorisedY = boxBottomY - 6;
      doc.text('Authorised Signatory', boxRight - 8, authorisedY, { align: 'right' });

      // Small vertical divider between left and right signature texts
      (doc as any).setLineWidth(0.6);
      // extend further toward the bottom edge for a slightly longer divider
      const vertTop = signatureSeparatorY + 2;
      // extend the divider a bit further down for a slightly longer visual
      // keep it well above the centered notes (which start at boxBottomY + 22)
      const vertBottom = boxBottomY + 6;
      doc.line(footerDividerX2, vertTop, footerDividerX2, vertBottom);

      // Centered final notes below the signature boxes (safe distance below the rect)
      // Move centered notes further down to avoid overlap with the signature box
      const centerNoteY1 = boxBottomY + 22;
      const centerNoteY2 = boxBottomY + 36;
      (doc as any).setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('SUBJECT TO AHMEDABAD JURISDICTION', pageWidth / 2, centerNoteY1, { align: 'center' });
      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.text('This is a Computer Generated Invoice', pageWidth / 2, centerNoteY2, { align: 'center' });

      // Final centered jurisdiction and generated-note at the very bottom
      // Final centered jurisdiction and generated-note removed per request

      const safeName = (record.customerName || record._id).toString().replace(/[^a-z0-9\-_.]/gi, '_');
      const datePart = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
      const filename = `invoice-${safeName}-${datePart || record._id}.pdf`;
      doc.save(filename);
    } catch (err: any) {
      logger.error('PDF generation error:', err);
      alert(err.message || 'Failed to generate PDF');
    } finally {
      setPdfDownloadingId(null);
    }
  }, [getProductsFromRecord, resolvePrice, resolveBranchName, resolveBranchKey, getSalesPersonName, formatPaymentMode, formatDateDDMMYYYY, numberToWords]);

  // Show loading or redirect message while checking role
  if (!userRole || (userRole !== 'sales_person' && userRole !== 'salesman' && userRole !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * itemsPerPage;

  const SkeletonLoader = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
          <tr>
            <th className="px-6 py-4">S.No</th>
            <th className="px-6 py-4">Customer</th>
            <th className="px-6 py-4">Mobile</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Sales Type</th>
            <th className="px-6 py-4">Sales Person</th>
            <th className="px-6 py-4">Branch</th>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[...Array(8)].map((_, i) => (
            <tr key={i} className="hover:bg-gray-50/50">
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-8" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-16" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-28" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>
              <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></td>
              <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded animate-pulse w-32 mx-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


  return (
    <AdminLayout>
       <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
          {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Billing Management
              </h1>
            </div>
            
             <div className="flex gap-2">
              <button
                onClick={() => (window.location.href = "/invoice-form")}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30 transition-all active:scale-95 text-sm font-semibold flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <span>+</span> <span className="hidden sm:inline">New Billing</span><span className="sm:hidden">New</span>
              </button>
            </div>
        </div>

        {/* Stats Grid */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bills</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">
                  {stats.totalBills}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <SiGoogledocs className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Revenue</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-emerald-600 transition-colors">
                  {formatAmount(stats.todayRevenue)}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                  <FaSackDollar className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Bills</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-violet-600 transition-colors">
                  {stats.todayBills}
                </h3>
              </div>
              <div className="p-3 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                  <SiGoogledocs className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </div>

        
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-orange-600 transition-colors">
                  {formatAmount(stats.monthRevenue)}
                </h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                  <FaSackDollar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div> */}

        {/* Charts Slider */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Analytics
                </h3>
                <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentChartIndex(prev => prev === 0 ? charts.length - 1 : prev - 1)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Previous Chart"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-gray-500 min-w-[100px] text-center">
                  {currentChartIndex === 0 ? 'Billings Per Day' : 'Devices Sold Per Day'}
                </span>
                <button
                  onClick={() => setCurrentChartIndex(prev => prev === charts.length - 1 ? 0 : prev + 1)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Next Chart"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              </div>
              {userRole === 'admin' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Branch:</label>
                    <select
                      value={selectedBranchForCharts}
                      onChange={(e) => setSelectedBranchForCharts(e.target.value)}
                      className="w-40 sm:w-48 px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="all">All Branches</option>
                      {branches.map(branch => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name || branch.branchName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Sales:</label>
                    <select
                      value={selectedSalesPersonForCharts}
                      onChange={(e) => {
                        console.log('Selected value:', e.target.value);
                        setSelectedSalesPersonForCharts(e.target.value);
                      }}
                      className="w-40 sm:w-48 px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="all">All Sales Persons</option>
                      {salesPersons.map((person, index) => (
                        <option key={person._id || person.id || `sp-${index}`} value={person._id || person.id}>
                          {`${person.firstName || person.name} ${person.lastName || ''}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative overflow-hidden">
              <div 
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentChartIndex * 100}%)` }}
              >
                <div className="w-full flex-shrink-0">
                  <BillingsPerDayChart 
                    isAdmin={userRole === 'admin'} 
                    userId={userRole !== 'admin' ? localStorage.getItem('userId') || undefined : undefined}
                    branchId={userRole === 'admin' && selectedBranchForCharts !== 'all' ? selectedBranchForCharts : undefined}
                    salesPersonId={userRole === 'admin' && selectedSalesPersonForCharts !== 'all' ? selectedSalesPersonForCharts : undefined}
                  />
                </div>
                <div className="w-full flex-shrink-0">
                  <DevicesSoldChart 
                    isAdmin={userRole === 'admin'} 
                    userId={userRole !== 'admin' ? localStorage.getItem('userId') || undefined : undefined}
                    branchId={userRole === 'admin' && selectedBranchForCharts !== 'all' ? selectedBranchForCharts : undefined}
                    salesPersonId={userRole === 'admin' && selectedSalesPersonForCharts !== 'all' ? selectedSalesPersonForCharts : undefined}
                  />
                </div>
              </div>
            </div>
            
            {/* Chart Indicators */}
            <div className="flex justify-center mt-4 gap-2">
              {charts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentChartIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentChartIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  title={`Go to ${index === 0 ? 'Billings Chart' : 'Devices Chart'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Record Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="p-3 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Billing Records</h2>
              <p className="text-xs sm:text-sm text-gray-500">View and manage transactions</p>
            </div>
             <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-medium"
                />
            </div>
          </div>

          {loading && isInitialLoading ? (
             <SkeletonLoader />
          ) : loading ? (
             <div className="h-64 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium shadow-md transition-all duration-200"
              >
                Retry
              </button>
            </div>
          ) : billingRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No billing records found
            </div>
          ) : (
            <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
                     <tr>
                        <th className="px-6 py-4">S.No</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Mobile</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Sales Type</th>
                        <th className="px-6 py-4">Sales Person</th>
                        <th className="px-6 py-4">Branch</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRecords.map((record, index) => (
                      <tr key={record._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 text-gray-500">{startIndex + index + 1}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{record.customerName}</td>
                        <td className="px-6 py-4 text-gray-600">{record.mobile || 'N/A'}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {loadingProducts ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-gray-500">Calculating...</span>
                            </div>
                          ) : (
                            formatAmount(calculateTotalFromProducts(record))
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{record.salesType || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-600">{getSalesPersonName(record.salesPerson)}</td>
                        <td className="px-6 py-4 text-gray-600">{resolveBranchName(resolveBranchKey(record))}</td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(record.date)}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleViewRecord(record)}
                                disabled={loadingProductDetails}
                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="View Details"
                              >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                 </svg>
                              </button>
                                <button
                                  onClick={() => handleDownloadPdf(record)}
                                  className="p-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                  title="Download PDF"
                                  disabled={pdfDownloadingId === record._id}
                                >
                                  {pdfDownloadingId === record._id ? (
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                  ) : (
                                    <AiOutlineFilePdf className="w-4 h-4" />
                                  )}
                                </button>
                              {userRole === 'admin' && (
                                <button
                                  onClick={() => setDeleteConfirmId(record._id)}
                                  className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                                  title="Delete Record"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
            
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedRecords.map((record, index) => (
                <div key={record._id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{record.customerName}</div>
                        <div className="text-xs text-gray-500 mt-1">{record.mobile || 'N/A'}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-gray-900 text-sm whitespace-nowrap">
                          {loadingProducts ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            formatAmount(calculateTotalFromProducts(record))
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 flex-shrink-0">Type:</span>
                        <span className="text-gray-700 font-medium text-right">{record.salesType || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 flex-shrink-0">Sales:</span>
                        <span className="text-gray-700 font-medium text-right truncate">{getSalesPersonName(record.salesPerson)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 flex-shrink-0">Branch:</span>
                        <span className="text-gray-700 font-medium text-right truncate">{resolveBranchName(resolveBranchKey(record))}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 flex-shrink-0">Date:</span>
                        <span className="text-gray-700 font-medium text-right whitespace-nowrap">{formatDate(record.date)}</span>
                      </div>
                    </div>
                  
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleViewRecord(record)}
                        disabled={loadingProductDetails}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(record)}
                        className="p-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-60"
                        disabled={pdfDownloadingId === record._id}
                      >
                        {pdfDownloadingId === record._id ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                        ) : (
                          <AiOutlineFilePdf className="w-4 h-4" />
                        )}
                      </button>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => setDeleteConfirmId(record._id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 sm:p-4 border-t border-gray-100">
               <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
               </button>
               <span className="text-xs sm:text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
               </span>
               <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  Next
               </button>
            </div>
          )}

        </div>

       </div>

      {/* View Record Modal */}
      <AnimatePresence>
        {viewingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingRecord(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-800">Bill Details</h3>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                
                {/* 1. Customer & Sales Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Customer Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Customer Information
                        </h3>
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-3">
                            <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase block">Name</span>
                                <span className="text-base font-medium text-gray-900">{viewingRecord.customerName}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase block">Mobile</span>
                                    <span className="text-sm text-gray-700">{viewingRecord.mobile || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase block">Phone</span>
                                    <span className="text-sm text-gray-700">{viewingRecord.phone || 'N/A'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase block">Email</span>
                                <span className="text-sm text-gray-700">{viewingRecord.email || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase block">Address</span>
                                <span className="text-sm text-gray-700">{viewingRecord.address || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase block">Pin Code</span>
                                    <span className="text-sm text-gray-700">{viewingRecord.pinCode || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase block">GST Number</span>
                                    <span className="text-sm text-gray-700">{viewingRecord.gstNumber || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            Transaction Details
                        </h3>
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase block">Date</span>
                                    <span className="text-sm text-gray-700">{new Date(viewingRecord.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase block">Sales Type</span>
                                    <span className="text-sm text-gray-700">{viewingRecord.salesType || 'Retail'}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-xs font-semibold text-gray-500 uppercase block">Branch</span>
                                  <span className="text-sm text-gray-700">{resolveBranchName(resolveBranchKey(viewingRecord))}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase block">Sales Person</span>
                                    <span className="text-sm text-gray-700">
                                        {viewingRecord.salesPerson ? `${viewingRecord.salesPerson.firstName} ${viewingRecord.salesPerson.lastName}` : 'Admin'}
                                    </span>
                                </div>
                            </div>
                            {viewingRecord.referralSource && (
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase block">Referral Source</span>
                                <span className="text-sm text-gray-700">
                                  {viewingRecord.referralSource === 'Any other' && viewingRecord.referralSourceOther 
                                    ? viewingRecord.referralSourceOther 
                                    : viewingRecord.referralSource}
                                </span>
                              </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Payment Information
                    </h3>
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-3">
                        {Array.isArray(viewingRecord.paymentMode) && viewingRecord.paymentMode.length > 0 ? (
                            viewingRecord.paymentMode.map((payment: any, idx: number) => (
                                <div key={idx} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-gray-900 text-base">{payment.mode}</span>
                                        <span className="font-bold text-blue-600 text-lg">₹{payment.amount?.toLocaleString()}</span>
                                    </div>
                                    {payment.mode === 'Bank' && (
                                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                            {payment.bankType && <div className="flex justify-between"><span className="text-gray-500">Bank Type:</span><span className="text-gray-700 font-medium">{payment.bankType}</span></div>}
                                            {payment.utrNumber && <div className="flex justify-between"><span className="text-gray-500">UTR Number:</span><span className="text-gray-700 font-medium">{payment.utrNumber}</span></div>}
                                            {payment.chequeNumber && <div className="flex justify-between"><span className="text-gray-500">Cheque Number:</span><span className="text-gray-700 font-medium">{payment.chequeNumber}</span></div>}
                                        </div>
                                    )}
                                    {payment.mode === 'UPI' && (
                                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                            {payment.upiProvider && <div className="flex justify-between"><span className="text-gray-500">UPI Provider:</span><span className="text-gray-700 font-medium">{payment.upiProvider}</span></div>}
                                            {payment.upiTransactionId && <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="text-gray-700 font-medium">{payment.upiTransactionId}</span></div>}
                                        </div>
                                    )}
                                    {payment.mode === 'Machine' && (
                                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                            {payment.machineProvider && <div className="flex justify-between"><span className="text-gray-500">Machine Provider:</span><span className="text-gray-700 font-medium">{payment.machineProvider}</span></div>}
                                            {payment.machineCardType && <div className="flex justify-between"><span className="text-gray-500">Card Type:</span><span className="text-gray-700 font-medium">{payment.machineCardType}</span></div>}
                                            {payment.machineCardLast4Digits && <div className="flex justify-between"><span className="text-gray-500">Card Last 4 Digits:</span><span className="text-gray-700 font-medium">**** {payment.machineCardLast4Digits}</span></div>}
                                            {payment.machineIdProofType && <div className="flex justify-between"><span className="text-gray-500">ID Proof Type:</span><span className="text-gray-700 font-medium">{payment.machineIdProofType}</span></div>}
                                            {payment.machineIdProofNumber && <div className="flex justify-between"><span className="text-gray-500">ID Proof Number:</span><span className="text-gray-700 font-medium">{payment.machineIdProofNumber}</span></div>}
                                            {payment.machineTransactionId && <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="text-gray-700 font-medium">{payment.machineTransactionId}</span></div>}
                                        </div>
                                    )}
                                    {payment.mode === 'Bajaj Finance' && (
                                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                            {payment.loanAmount && <div className="flex justify-between"><span className="text-gray-500">Loan Amount:</span><span className="text-gray-700 font-medium">₹{payment.loanAmount?.toLocaleString()}</span></div>}
                                            {payment.loanId && <div className="flex justify-between"><span className="text-gray-500">Loan ID:</span><span className="text-gray-700 font-medium">{payment.loanId}</span></div>}
                                        </div>
                                    )}
                                    {payment.mode === 'Brand Order' && (
                                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                            {payment.brandOrderType && <div className="flex justify-between"><span className="text-gray-500">Brand Order Type:</span><span className="text-gray-700 font-medium">{payment.brandOrderType}</span></div>}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500">No payment information available</div>
                        )}
                    </div>
                </div>

                {/* 2. Products Table */}
                <div className="space-y-4">
                     <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        Purchased Items
                    </h3>
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3">Description of Goods</th>
                                    <th className="px-4 py-3">Serial Number</th>
                                    <th className="px-4 py-3 text-center">Quantity</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingProductDetails ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading product details...</td></tr>
                                ) : (
                                  (() => {
                                    const products = getProductsFromRecord(viewingRecord);
                                    let subtotal = 0;
                                    let totalCGST = 0;
                                    let totalSGST = 0;

                                    const productRows = products.map((product: any, idx: number) => {
                                      const name = typeof product === 'object' ? (product.name || product.model || product.productName || product.modelName || 'Unknown Product') : String(product || 'Unknown Product');
                                      const batch = product.batch || product.batchNo || product.serialNo || '';
                                      const qty = Number(product?.quantity ?? product?.qty ?? 1) || 1;
                                      const rateIncludingTax = resolvePrice(product);
                                      const taxPercent = Number(product?.taxPercent ?? product?.gstPercent ?? viewingRecord.taxPercent ?? 18);
                                      
                                      // Amount is the full price including tax
                                      const amount = rateIncludingTax * qty;
                                      const baseAmount = amount / (1 + (taxPercent / 100));
                                      
                                      // Calculate CGST and SGST on the base amount
                                      const cgstRate = taxPercent / 2;
                                      const sgstRate = taxPercent / 2;
                                      const cgstAmount = (baseAmount * cgstRate) / 100;
                                      const sgstAmount = (baseAmount * sgstRate) / 100;
                                      
                                      subtotal += baseAmount;
                                      totalCGST += cgstAmount;
                                      totalSGST += sgstAmount;

                                      return (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                          <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{name}</div>
                                            {batch && <div className="text-xs text-gray-500 mt-1">Batch: {batch}</div>}
                                          </td>
                                          <td className="px-4 py-3 text-gray-600">{product.serialNo || product.serialNumber || 'N/A'}</td>
                                          <td className="px-4 py-3 text-center text-gray-600">{qty} NO.</td>
                                          <td className="px-4 py-3 text-right font-medium text-gray-900">{amount.toFixed(2)}</td>
                                        </tr>
                                      );
                                    });

                                    const calculatedTotal = subtotal + totalCGST + totalSGST;

                                    return (
                                      <>
                                        {productRows}
                                        {/* Total Row */}
                                        <tr className="bg-blue-50 border-t-2 border-gray-300">
                                          <td colSpan={3} className="px-4 py-4 text-right font-bold text-gray-800 text-base">Total</td>
                                          <td className="px-4 py-4 text-right font-bold text-blue-600 text-lg">
                                            ₹ {calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      </>
                                    );
                                  })()
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Attachments Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attachments
                  </h3>

                  {(!viewingRecord.attachments || 
                    (!viewingRecord.attachments.customerID && 
                     !viewingRecord.attachments.paymentSlip && 
                     !viewingRecord.attachments.googleReview && 
                     (!viewingRecord.attachments.inventoryPics || viewingRecord.attachments.inventoryPics.length === 0))
                  ) && (
                    <div className="text-center text-gray-500 text-sm py-6 bg-gray-50 rounded-xl border border-gray-200">
                      No attachments available
                    </div>
                  )}

                  {viewingRecord.attachments && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Customer ID */}
                      {viewingRecord.attachments.customerID && (
                        <a
                          href={String(viewingRecord.attachments.customerID)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all"
                        >
                          <img
                            src={String(viewingRecord.attachments.customerID)}
                            alt="Customer ID"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                            <p className="text-white text-xs font-bold text-center">Customer ID</p>
                          </div>
                        </a>
                      )}

                      {/* Payment Slip */}
                      {viewingRecord.attachments.paymentSlip && (
                        <a
                          href={String(viewingRecord.attachments.paymentSlip)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all"
                        >
                          <img
                            src={String(viewingRecord.attachments.paymentSlip)}
                            alt="Payment Slip"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                            <p className="text-white text-xs font-bold text-center">Payment Slip</p>
                          </div>
                        </a>
                      )}

                      {/* Google Review */}
                      {viewingRecord.attachments.googleReview && (
                        <a
                          href={String(viewingRecord.attachments.googleReview)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all"
                        >
                          <img
                            src={String(viewingRecord.attachments.googleReview)}
                            alt="Google Review"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                            <p className="text-white text-xs font-bold text-center">Google Review</p>
                          </div>
                        </a>
                      )}

                      {/* Inventory Pics */}
                      {viewingRecord.attachments.inventoryPics && 
                       Array.isArray(viewingRecord.attachments.inventoryPics) && 
                       viewingRecord.attachments.inventoryPics.map((pic: string, idx: number) => (
                        <a
                          key={`inventory-${idx}`}
                          href={pic}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all"
                        >
                          <img
                            src={pic}
                            alt={`Inventory Pic ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                            <p className="text-white text-xs font-bold text-center">Inventory Pic {idx + 1}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-lg shadow-blue-500/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Billing</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this billing record? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}