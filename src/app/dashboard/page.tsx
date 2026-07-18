"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/AdminLayout";
import { FaSackDollar } from "react-icons/fa6";
import { SiGoogledocs } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { getApiUrl } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";

// Lazy load heavy components
const TargetProgress = dynamic(() => import("@/components/TargetProgress"), { ssr: false });

export default function DashboardPage() {
  const [userName, setUserName] = useState("Admin");
  const [currentDate, setCurrentDate] = useState("");
  const [totals, setTotals] = useState({
    today: { count: 0, totalAmount: 0 },
    week: { count: 0, totalAmount: 0 },
    month: { count: 0, totalAmount: 0 },
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentActivityFull, setRecentActivityFull] = useState<any[]>([]); // Store full records
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [fetchedProductDetails, setFetchedProductDetails] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    fromDate: "",
    toDate: "",
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  const itemsPerPage = 8;

  // Format payment mode from the new API structure - memoized
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

  const getProductsFromRecord = useCallback((record: any) => {
    if (!record) return [];
    if (Array.isArray(record.products) && record.products.length > 0) return record.products;
    if (Array.isArray(record.productDetails) && record.productDetails.length > 0) return record.productDetails;
    if (Array.isArray(record.product_details) && record.product_details.length > 0) return record.product_details;
    if (Array.isArray(record.items) && record.items.length > 0) return record.items;
    if (Array.isArray(record.productsList) && record.productsList.length > 0) return record.productsList;
    return [];
  }, []);

  const numberToWords = useCallback((num: number): string => {
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
  }, []);

  useEffect(() => {
    // Admin-only access check
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("userRole")?.toLowerCase();
      if (role !== "admin") {
        window.location.href = "/billing";
        return;
      }
      const storedName = localStorage.getItem("userName");
      if (storedName) setUserName(storedName);
      setUserRole(role || '');
    }

    setMounted(true);
    const now = new Date();
    setCurrentDate(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );

    // Fetch all data in parallel for faster load
    const fetchAllData = async () => {
      setLoadingTotals(true);
      setLoadingActivities(true);
      
      try {
        // Execute all API calls in parallel
        const [totalsRes, branchesRes, activitiesRes, productsRes] = await Promise.all([
          fetch(`${getApiUrl()}/api/admin/dashboard/totals`, { credentials: "include" }),
          fetch(`${getApiUrl()}/api/branches`, { credentials: "include" }),
          fetch(`${getApiUrl()}/api/billing`, { credentials: "include" }),
          fetch(`${getApiUrl()}/api/products`, { credentials: "include" })
        ]);

        // Process totals
        const totalsData = await totalsRes.json();
        if (totalsData.success) {
          setTotals({
            today: totalsData.totals.today[0] || { count: 0, totalAmount: 0 },
            week: totalsData.totals.week[0] || { count: 0, totalAmount: 0 },
            month: totalsData.totals.month[0] || { count: 0, totalAmount: 0 },
          });
        }
        setLoadingTotals(false);

        // Process branches
        const branchesData = await branchesRes.json();
        if (branchesData && branchesData.success && Array.isArray(branchesData.branches)) {
          setBranches(branchesData.branches);
        } else if (Array.isArray(branchesData)) {
          setBranches(branchesData);
        }

        // Process products
        const productsData = await productsRes.json();
        if (productsData && productsData.products) {
          const all = [
            ...(productsData.products.laptops || []),
            ...(productsData.products.desktops || []),
            ...(productsData.products.aios || [])
          ];
          setAvailableProducts(all);
        } else if (Array.isArray(productsData)) {
          setAvailableProducts(productsData);
        }

        // Process activities
        const activitiesData = await activitiesRes.json();
        if (activitiesData.success) {
          const sortedBillings = [...activitiesData.billings].sort((a: any, b: any) => {
            const aTime = new Date(a.createdAt || a.date || 0).getTime();
            const bTime = new Date(b.createdAt || b.date || 0).getTime();
            return bTime - aTime;
          });

          setRecentActivityFull(sortedBillings);

          const activities = sortedBillings.map((activity: any) => ({
            id: activity._id,
            customer: activity.customerName,
            salesPerson: activity.salesPerson ? `${activity.salesPerson.firstName} ${activity.salesPerson.lastName}` : "",
            branch: activity.branch,
            amount: `Rs. ${(activity.totalAmount || 0).toLocaleString()}`,
            date: new Date(activity.date).toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            salesType: activity.salesType,
            paymentMode: activity.paymentMode,
          }));
          setRecentActivity(activities);
        }
        setLoadingActivities(false);

      } catch (err) {
        logger.error("Failed to fetch dashboard data:", err);
        setLoadingTotals(false);
        setLoadingActivities(false);
      }
    };

    fetchAllData();
  }, []);

  // Memoize resolve price function
  const resolvePrice = useCallback((p: any) => {
    if (!p) return 0;

    const key = p._id || p.apiProductId || p.model || p.name || '';
    if (key && availableProducts && availableProducts.length > 0) {
      const found = availableProducts.find((ap: any) => ap._id === key || ap.model === key || ap.name === key);
      if (found) {
        const v = found.supportedAmount ?? found.srp ?? found.price ?? found.sellingPrice ?? found.rate ?? found.amount ?? 0;
        if (v && !isNaN(Number(v))) return Number(v);
      }
    }

    if (typeof p === 'object') {
      const val = p.supportedAmount ?? p.supportedamount ?? p.price ?? p.sellingPrice ?? p.srp ?? p.rate ?? p.amount ?? p.t2DBP ?? 0;
      if (val && !isNaN(Number(val))) return Number(val);
    }

    return 0;
  }, [availableProducts]);

  // Memoize calculate total function
  const calculateTotalFromRecord = useCallback((record: any) => {
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

  // Memoize branch name resolution
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
    return branch.name || branch.code || branch.branchName;
  }, [branches]);

  // Memoize filtered records with debounced search
  const filteredRecords = useMemo(() => 
    recentActivity.filter((r) => 
      r.customer.toLowerCase().includes(debouncedSearch.toLowerCase())
    ), [recentActivity, debouncedSearch]
  );

  // Memoize paginated records
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const records = filteredRecords.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    return { records, totalPages, startIndex };
  }, [filteredRecords, currentPage, itemsPerPage]);

  const { records: paginatedRecords, totalPages, startIndex } = paginatedData;

  // OLD CODE REMOVED - Now handled in fetchAllData
  const oldFallbackCode = () => {
    if (false) {
        if (recentActivityFull.length > 0) {
          const now = new Date();
          const todayStr = now.toLocaleDateString();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          let todayCount = 0, todayAmount = 0;
          let weekCount = 0, weekAmount = 0;
          let monthCount = 0, monthAmount = 0;

          recentActivityFull.forEach(record => {
            const recordDate = new Date(record.date);
            const amount = record.totalAmount || calculateTotalFromRecord(record) || 0;
            
            if (recordDate.toLocaleDateString() === todayStr) {
              todayCount++;
              todayAmount += amount;
            }
            if (recordDate >= oneWeekAgo) {
              weekCount++;
              weekAmount += amount;
            }
            if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
              monthCount++;
              monthAmount += amount;
            }
          });

          setTotals({
            today: { count: todayCount, totalAmount: todayAmount },
            week: { count: weekCount, totalAmount: weekAmount },
            month: { count: monthCount, totalAmount: monthAmount },
          });
        }
    }
    // Placeholder for removed code
  };

  // Export billing data handler - memoized
  const handleExport = useCallback((format: "csv" | "xlsx") => {
  const params = new URLSearchParams({
    format,
    ...(exportFilters.fromDate && { fromDate: exportFilters.fromDate }),
    ...(exportFilters.toDate && { toDate: exportFilters.toDate }),
  }).toString();

  // Opens download link in new tab
  window.open(`${getApiUrl()}/api/billing/export?${params}`, "_blank");
  }, [exportFilters]);


  // Handle view record with product details fetch - memoized
  const handleViewRecord = useCallback(async (record: any) => {
    setLoadingProductDetails(true);
    setViewingRecord(record);
    setFetchedProductDetails([]);

    // Fetch product details if needed
    if (record.products && record.products.length > 0) {
      const firstProduct = record.products[0];
      const needsFetch =
        typeof firstProduct === "string" || // Product is an ID string
        (typeof firstProduct === "object" && firstProduct._id && (!firstProduct.name && !firstProduct.model)); // ObjectId without details

      if (needsFetch) {
        const productPromises = record.products.map(async (productRef: any) => {
          const productId =
            typeof productRef === "string" ? productRef : productRef._id;
          try {
            const response = await fetch(
              `${getApiUrl()}/api/products/${productId}`,
              { credentials: "include" }
            );
            const productData = await response.json();
            // Handle both direct product object and wrapped response
            return productData.success && productData.product ? productData.product : productData;
          } catch (error) {
            console.error(`Failed to fetch product:`, error);
            return { name: 'Error loading product', model: 'N/A' };
          }
        });

        const fetchedProducts = await Promise.all(productPromises);
        setFetchedProductDetails(fetchedProducts);
      } else {
        // Products are already detailed objects
        setFetchedProductDetails(record.products);
      }
    } 

    setLoadingProductDetails(false);
  }, [getApiUrl]);

  // Download XML - memoized
  const downloadXML = useCallback(async (billingId: string) => {
    try {
      // Find the billing record from stored data
      const billingRecord = recentActivityFull.find((record: any) => record._id === billingId);
      if (!billingRecord) {
        alert('Billing record not found. Please refresh the page and try again.');
        return;
      }

      let products = billingRecord.products || [];

      // Fetch product details if needed
      if (products.length > 0) {
        const firstProduct = products[0];
        const needsFetch =
          typeof firstProduct === "string" || // Product is an ID string
          (typeof firstProduct === "object" && firstProduct._id && (!firstProduct.name && !firstProduct.model)); // ObjectId without details

        if (needsFetch) {
          const productPromises = products.map(async (productRef: any) => {
            const productId =
              typeof productRef === "string" ? productRef : productRef._id;
            try {
              const response = await fetch(
                `${getApiUrl()}/api/products/${productId}`,
                { credentials: "include" }
              );
              const productData = await response.json();
              // Handle both direct product object and wrapped response
              return productData.success && productData.product ? productData.product : productData;
            } catch (error) {
              console.error(`Failed to fetch product:`, error);
              return null;
            }
          });

          const fetchedProducts = await Promise.all(productPromises);
          products = fetchedProducts.filter((p) => p !== null);
        }
      }

      // Generate XML using the same format as invoice form
      const totalAmount = parseFloat(billingRecord.totalAmount) || calculateTotalFromRecord(billingRecord);

      // Calculate GST (assuming 18% GST: 9% CGST + 9% SGST)
      const gstRate = 0.18;
      const taxableAmount = totalAmount / (1 + gstRate);
      const gstPerHead = (totalAmount - taxableAmount) / 2; // Split GST between CGST and SGST

      // Generate voucher number
      const voucherNumber = `INV-${Date.now()}`;
      const reference = voucherNumber;

      // Format date for Tally
      const formatDate = (dateString: string) => {
        const date = dateString ? new Date(dateString) : new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`; // Returns YYYYMMDD format
      };

      const currentDate = formatDate(billingRecord.date);

      // Format payment mode for display
      const paymentModeDisplay = formatPaymentMode(billingRecord.paymentMode);

      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>All Masters</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${billingRecord.customerName}</SVCURRENTCOMPANY>
</STATICVARIABLES>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="${billingRecord.customerName}" RESERVEDNAME="">
<NAME>${billingRecord.customerName}</NAME>
<PARENT>Sundry Debtors</PARENT>
<ACCOUNTTYPE>Sundry Debtor</ACCOUNTTYPE>
</LEDGER>
</TALLYMESSAGE>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="Sales Account" RESERVEDNAME="">
<NAME>Sales Account</NAME>
<PARENT>Indirect Expenses</PARENT>
<ACCOUNTTYPE>Indirect Expenses</ACCOUNTTYPE>
</LEDGER>
</TALLYMESSAGE>

</REQUESTDATA>
</REQUESTDESC>

<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>${billingRecord.customerName}</SVCURRENTCOMPANY>
</STATICVARIABLES>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Sales" ACTION="Create">
<DATE>${currentDate}</DATE>
<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
<VOUCHERNUMBER>AUTO</VOUCHERNUMBER>
<REFERENCE>${reference}</REFERENCE>
<NARRATION>Sales Invoice for ${billingRecord.customerName}</NARRATION>
<PARTYLEDGERNAME>${billingRecord.customerName}</PARTYLEDGERNAME>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${billingRecord.customerName}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>-${totalAmount.toFixed(0)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Sales Account</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>${totalAmount.toFixed(0)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>

<UDF:INVOICEINFO.CUSTOMERNAME>${billingRecord.customerName}</UDF:INVOICEINFO.CUSTOMERNAME>
<UDF:INVOICEINFO.ADDRESS>${billingRecord.address || ''}</UDF:INVOICEINFO.ADDRESS>
<UDF:INVOICEINFO.PINCODE></UDF:INVOICEINFO.PINCODE>
<UDF:INVOICEINFO.CONTACTPERSON></UDF:INVOICEINFO.CONTACTPERSON>
<UDF:INVOICEINFO.MOBILE>${billingRecord.mobile || ''}</UDF:INVOICEINFO.MOBILE>
<UDF:INVOICEINFO.EMAIL>${billingRecord.email || ''}</UDF:INVOICEINFO.EMAIL>
<UDF:INVOICEINFO.GSTNUMBER>${billingRecord.gstNumber || ''}</UDF:INVOICEINFO.GSTNUMBER>
<UDF:INVOICEINFO.SALESPERSON>${billingRecord.salesPerson ? `${billingRecord.salesPerson.firstName} ${billingRecord.salesPerson.lastName}` : 'Admin'}</UDF:INVOICEINFO.SALESPERSON>
  <UDF:INVOICEINFO.BRANCH>${resolveBranchName(billingRecord.branch)}</UDF:INVOICEINFO.BRANCH>
<UDF:INVOICEINFO.SALESTYPE>${billingRecord.salesType || 'Retail'}</UDF:INVOICEINFO.SALESTYPE>
<UDF:INVOICEINFO.PAYMENTMODE>${paymentModeDisplay || 'N/A'}</UDF:INVOICEINFO.PAYMENTMODE>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</REQUESTDESC>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;

      // Download XML file
      const blob = new Blob([xmlData], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Tally_Invoice_${billingRecord.customerName}_${Date.now()}.xml`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      logger.error('Error generating XML:', error);
      alert('Error generating XML. Please check console for details.');
    }
  }, [recentActivityFull, formatPaymentMode, resolveBranchName]);

  // Download Excel - memoized with dynamic import
  const downloadExcel = useCallback(async (billingId: string) => {
    const indianStates = [
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chhattisgarh",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Tamil Nadu",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal"
    ];

    const getStateFromAddress = (address: string): string => {
      if (!address) return 'Gujarat';
      const lowerAddress = address.toLowerCase();
      for (const state of indianStates) {
        if (lowerAddress.includes(state.toLowerCase())) {
          return state;
        }
      }
      return 'Gujarat';
    };

    try {
      // Find the billing record from stored data
      const billingRecord = recentActivityFull.find((record: any) => record._id === billingId);
      if (!billingRecord) {
        alert('Billing record not found. Please refresh the page and try again.');
        return;
      }

      let products = billingRecord.products || [];

      // Fetch product details if needed
      if (products.length > 0) {
        const firstProduct = products[0];
        const needsFetch =
          typeof firstProduct === "string" || // Product is an ID string
          (typeof firstProduct === "object" && firstProduct._id && (!firstProduct.name && !firstProduct.model)); // ObjectId without details

        if (needsFetch) {
          const productPromises = products.map(async (productRef: any) => {
            const productId =
              typeof productRef === "string" ? productRef : productRef._id;
            try {
              const response = await fetch(
                `${getApiUrl()}/api/products/${productId}`,
                { credentials: "include" }
              );
              const productData = await response.json();
              // Handle both direct product object and wrapped response
              return productData.success && productData.product ? productData.product : productData;
            } catch (error) {
              console.error(`Failed to fetch product:`, error);
              return null;
            }
          });

          const fetchedProducts = await Promise.all(productPromises);
          products = fetchedProducts.filter((p) => p !== null);
        }
      }

      // Extract sales person and branch names
      const salesPersonName = billingRecord.salesPerson 
        ? `${billingRecord.salesPerson.firstName || ''} ${billingRecord.salesPerson.lastName || ''}`.trim() 
        : 'N/A';
      
      const branchName = resolveBranchName(billingRecord.branch);

      // Format date as DD-MM-YYYY
      const formattedDate = (() => {
        try {
          const dt = new Date(billingRecord.date);
          if (isNaN(dt.getTime())) return 'N/A';
          const d = String(dt.getDate()).padStart(2, '0');
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const y = dt.getFullYear();
          return `${d}-${m}-${y}`;
        } catch (e) {
          return 'N/A';
        }
      })();

      // Create header row with specified columns
      const sheetData: any[] = [
        [
          'Date',
          'Voucher No',
          'Party Name',
          'Sales Ledger',
          'Item Name',
          'Godown',
          'State',
          'Country',
          'Item Qty',
          'Item Rate',
          'Per',
          'Item Basic Amt',
          'OUTPUT SGST',
          'OUTPUT CGST',
          'OUTPUT IGST',
          'Revenue'
        ]
      ];

      // Calculate total amount using new method
      const totalAmount = billingRecord.totalAmount || calculateTotalFromRecord(billingRecord);

      // Add data rows - one row per product
      if (products && products.length > 0) {
        products.forEach((product: any, idx: number) => {
          const rateIncludingTax = resolvePrice(product) || 0;
          const itemQty = 1; // Default quantity to 1

          // Treat the resolved price as tax-inclusive. Extract taxable base by dividing by 1.18
          const itemBasicAmt = Math.round((rateIncludingTax / 1.18));

          // Determine GST based on state
          const state = getStateFromAddress(billingRecord.address);
          const isGujarat = state.toLowerCase() === 'gujarat';
          let outputSGST = 0, outputCGST = 0, outputIGST = 0;
          if (isGujarat) {
            outputSGST = Math.round(itemBasicAmt * 0.09);
            outputCGST = Math.round(itemBasicAmt * 0.09);
          } else {
            outputIGST = Math.round(itemBasicAmt * 0.18);
          }

          // Revenue = taxable base + tax components
          const revenue = itemBasicAmt + outputSGST + outputCGST + outputIGST;

          // Per request: CGST/SGST should be 9% each of the revenue column value (IGST 18% when applicable)
          if (isGujarat) {
            outputCGST = Math.round(revenue * 0.09);
            outputSGST = Math.round(revenue * 0.09);
            outputIGST = 0;
          } else {
            outputIGST = Math.round(revenue * 0.18);
            outputCGST = 0;
            outputSGST = 0;
          }

          // Use product model as Item Name
          const itemName = product.model && product.model.trim()
            ? product.model
            : (product.name || 'N/A');

          sheetData.push([
            formattedDate,
            billingRecord._id, // Unique voucher number per billing
            billingRecord.customerName || 'N/A',
            'SALES GST',
            itemName,
            branchName,
            state, // State from address
            'India', // Default country
            itemQty,
            rateIncludingTax,
            'Pcs',
            itemBasicAmt,
            outputSGST,
            outputCGST,
            outputIGST,
            revenue
          ]);
        });
      } else {
        // If no products, add a single row with billing info
        const itemBasicAmt = Math.round(totalAmount / 1.18); // Reverse calculate without GST
        
        // Determine GST based on state
        const state = getStateFromAddress(billingRecord.address);
        const isGujarat = state.toLowerCase() === 'gujarat';
        let outputSGST, outputCGST, outputIGST;
        if (isGujarat) {
          outputSGST = Math.round(itemBasicAmt * 0.09);
          outputCGST = Math.round(itemBasicAmt * 0.09);
          outputIGST = 0;
        } else {
          outputSGST = 0;
          outputCGST = 0;
          outputIGST = Math.round(itemBasicAmt * 0.18);
        }

        sheetData.push([
          formattedDate,
          billingRecord._id, // Unique voucher number per billing
          billingRecord.customerName || 'N/A',
          'SALES GST',
          'N/A',
          branchName,
          state,
          'India',
          1,
          itemBasicAmt,
          'Pcs',
          itemBasicAmt,
          outputSGST,
          outputCGST,
          outputIGST,
          totalAmount
        ]);
      }

      // Dynamically import SheetJS and create workbook
      const XLSXModule = await import('xlsx');
      const XLSX = XLSXModule.default || XLSXModule;
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 10 }, // Voucher No
        { wch: 25 }, // Party Name
        { wch: 20 }, // Sales Ledger
        { wch: 30 }, // Item Name
        { wch: 18 }, // Godown
        { wch: 10 }, // State
        { wch: 10 }, // Country
        { wch: 10 }, // Item Qty
        { wch: 12 }, // Item Rate
        { wch: 8 },  // Per
        { wch: 15 }, // Item Basic Amt
        { wch: 12 }, // OUTPUT SGST
        { wch: 12 }, // OUTPUT CGST
        { wch: 12 }, // OUTPUT IGST
        { wch: 12 }  // Revenue
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
      XLSX.writeFile(wb, `Invoice_${billingRecord.customerName}_${Date.now()}.xlsx`);

    } catch (error) {
      logger.error('Error generating Excel:', error);
      alert('Error generating Excel. Please check console for details.');
    }
  }, [recentActivityFull, resolveBranchName, calculateTotalFromRecord, resolvePrice]);

  if (!mounted) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Dashboard Overview
              </h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">{currentDate}</p>
            </div>
            
             <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => (window.location.href = "/invoice-form")}
                className="bg-blue-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30 transition-all active:scale-95 text-xs sm:text-sm font-semibold flex items-center gap-2"
              >
                <span>+</span> <span className="hidden sm:inline">New Billing</span><span className="sm:hidden">Billing</span>
              </button>
              <button
                onClick={() => (window.location.href = "/branches")}
                className="bg-emerald-500 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:shadow-emerald-500/30 transition-all active:scale-95 text-xs sm:text-sm font-semibold flex items-center gap-2"
              >
                <span>+</span> <span className="hidden sm:inline">Add Branch</span><span className="sm:hidden">Branch</span>
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-white border text-gray-700 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-all active:scale-95 text-xs sm:text-sm font-semibold"
              >
                <span className="hidden sm:inline">Export Data</span><span className="sm:hidden">Export</span>
              </button>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {loadingTotals ? (
             [...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  </div>
                </div>
             ))
          ) : (
            <>
              {/* Today's Bill */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Today's Bills</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">
                      {totals.today.count}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                     <SiGoogledocs className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
               
              </div>

               {/* Today's Amount */}
               <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Today's Revenue</p>
                    <h3 className="text-xl sm:text-3xl font-bold text-gray-900 mt-2 group-hover:text-emerald-600 transition-colors">
                      Rs. {totals.today.totalAmount.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                     <FaSackDollar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                </div>
                
              </div>

               {/* Week's Bill */}
               <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Weekly Bills</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 group-hover:text-violet-600 transition-colors">
                      {totals.week.count}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                     <SiGoogledocs className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
                  </div>
                </div>
                
              </div>

              {/* Monthly Sales */}
               <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">Monthly Revenue</p>
                    <h3 className="text-xl sm:text-3xl font-bold text-gray-900 mt-2 group-hover:text-orange-600 transition-colors">
                      Rs. {totals.month.totalAmount.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                     <FaSackDollar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                </div>
                
              </div>
            </>
          )}
        </div>

        {/* Target Progress Section - Only show for non-admin users */}
        {userRole !== 'admin' && <TargetProgress />}

        {/* Recent Activity Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Recent Transactions</h2>
              <p className="text-xs sm:text-sm text-gray-500">Latest billing records</p>
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

          {loadingActivities ? (
             <div className="p-8">
               <div className="space-y-4">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className="flex items-center gap-4 animate-pulse">
                     <div className="h-4 bg-gray-200 rounded w-8"></div>
                     <div className="h-4 bg-gray-200 rounded flex-1"></div>
                     <div className="h-4 bg-gray-200 rounded w-32"></div>
                     <div className="h-4 bg-gray-200 rounded w-24"></div>
                     <div className="h-4 bg-gray-200 rounded w-24"></div>
                     <div className="h-4 bg-gray-200 rounded w-32"></div>
                     <div className="h-4 bg-gray-200 rounded w-20"></div>
                     <div className="h-8 bg-gray-200 rounded w-32"></div>
                   </div>
                 ))}
               </div>
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
                         <th className="px-6 py-4">Sales Person</th>
                         <th className="px-6 py-4">Amount</th>
                         <th className="px-6 py-4">Branch</th>
                         <th className="px-6 py-4">Date</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {paginatedRecords.map((record, index) => {
                          const fullRecord = recentActivityFull.find((r: any) => r._id === record.id);
                          return (
                             <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4 text-gray-500">{startIndex + index + 1}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{record.customer}</td>
                                <td className="px-6 py-4 text-gray-600">{record.salesPerson || '-'}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{record.amount}</td>
                                <td className="px-6 py-4 text-gray-600">
                                  {resolveBranchName(record.branch) || '-'}
                                </td>
                                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{record.date}</td>
                                <td className="px-6 py-4">
                                   <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-100">
                                      Completed
                                   </span>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="flex items-center justify-center gap-3">
                                        <button 
                                          onClick={() => handleViewRecord(fullRecord)}
                                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                                          title="View Details"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        </button>
                                        <button 
                                          onClick={() => downloadXML(record.id)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded-lg hover:bg-orange-100 hover:shadow-sm transition-all active:scale-95"
                                          title="Download XML"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                          XML
                                        </button>
                                        <button 
                                          onClick={() => downloadExcel(record.id)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 hover:shadow-sm transition-all active:scale-95"
                                          title="Download Excel"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                          Excel
                                        </button>
                                   </div>
                                </td>
                             </tr>
                          )
                      })}
                   </tbody>
                </table>
             </div>
             
             {/* Mobile Cards */}
             <div className="md:hidden divide-y divide-gray-100">
               {paginatedRecords.map((record, index) => {
                 const fullRecord = recentActivityFull.find((r: any) => r._id === record.id);
                 return (
                   <div key={record.id} className="p-4 hover:bg-gray-50">
                     <div className="flex justify-between items-start mb-3">
                       <div className="flex-1">
                         <div className="font-semibold text-gray-900 text-sm">{record.customer}</div>
                         <div className="text-xs text-gray-500 mt-1">{record.salesPerson || '-'}</div>
                       </div>
                       <div className="text-right">
                         <div className="font-bold text-gray-900 text-sm">{record.amount}</div>
                         <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-100">
                           Completed
                         </span>
                       </div>
                     </div>
                     
                     <div className="space-y-1.5 text-xs mb-3">
                       <div>
                         <span className="text-gray-500">Branch:</span>
                         <span className="ml-1 text-gray-700 font-medium">{resolveBranchName(record.branch) || '-'}</span>
                       </div>
                       <div>
                         <span className="text-gray-500">Date:</span>
                         <span className="ml-1 text-gray-700 font-medium">{record.date}</span>
                       </div>
                     </div>
                     
                     <div className="flex gap-2">
                       <button 
                         onClick={() => handleViewRecord(fullRecord)}
                         className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                         </svg>
                       </button>
                       <button 
                         onClick={() => downloadXML(record.id)}
                         className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded-lg hover:bg-orange-100 transition-all"
                       >
                         <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                         XML
                       </button>
                       <button 
                         onClick={() => downloadExcel(record.id)}
                         className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-all"
                       >
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                         Excel
                       </button>
                     </div>
                   </div>
                 );
               })}
             </div>
             </>
          )}
          
          {/* Footer Pagination */}
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
      
      {/* Export Modal Logic if needed can be added here or in a separate component */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md m-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Export Billing Data</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input 
                  type="date"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={exportFilters.fromDate}
                  onChange={(e) => setExportFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input 
                  type="date" 
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={exportFilters.toDate}
                  onChange={(e) => setExportFilters(prev => ({ ...prev, toDate: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => handleExport("csv")}
                  className="flex-1 bg-green-50 text-green-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors"
                >
                  Download CSV
                </button>
                <button 
                   onClick={() => handleExport("xlsx")}
                   className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 shadow-md transition-all active:scale-95"
                >
                   Download Excel
                </button>
              </div>
            </div>
            <button 
              onClick={() => setShowExportModal(false)}
              className="mt-4 w-full text-center text-gray-500 text-sm hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* View Record Modal */}
      <AnimatePresence>
        {viewingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setViewingRecord(null);
                setFetchedProductDetails([]);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            ></motion.div>
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
                  onClick={() => {
                    setViewingRecord(null);
                    setFetchedProductDetails([]);
                  }}
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
                          <span className="text-sm text-gray-700">{resolveBranchName(viewingRecord.branch)}</span>
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
                            const displayProducts = fetchedProductDetails.length > 0 ? fetchedProductDetails : products;
                            let subtotal = 0;
                            let totalCGST = 0;
                            let totalSGST = 0;

                            const productRows = displayProducts.map((product: any, idx: number) => {
                              const name = typeof product === 'object' ? (product.name || product.model || product.productName || product.modelName || 'Unknown Product') : String(product || 'Unknown Product');
                              const batch = product.batch || product.batchNo || product.serialNo || '';
                              const qty = Number(product?.quantity ?? product?.qty ?? 1) || 1;
                              const rateIncludingTax = resolvePrice(product);
                              const taxPercent = Number(product?.taxPercent ?? product?.gstPercent ?? viewingRecord.taxPercent ?? 18);
                              
                              const amount = rateIncludingTax * qty;
                              const baseAmount = amount / (1 + (taxPercent / 100));
                              
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
                {/* 3. Attachments Section (Updated) */}
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
                  onClick={() => {
                    setViewingRecord(null);
                    setFetchedProductDetails([]);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-lg shadow-blue-500/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}