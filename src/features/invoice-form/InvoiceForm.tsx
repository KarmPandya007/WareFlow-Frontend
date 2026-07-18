"use client"

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";
import { CheckCircle, QrCode, Smartphone, Camera, X, Download, Scan } from "lucide-react";
import QRCode from "qrcode";
import AdminLayout from "@/components/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiUrl } from "@/lib/api";

// Sanitize user input for logging to prevent log injection
const sanitizeForLog = (input: any): any => {
  if (typeof input === 'string') {
    return input.replace(/[\r\n]/g, ' ').substring(0, 200);
  }
  if (typeof input === 'object' && input !== null) {
    return JSON.stringify(input).replace(/[\r\n]/g, ' ').substring(0, 200);
  }
  return input;
};

interface Product {
  id: number;
  name: string;
  model: string;
  serialNumber: string;
  checkCode: string;
  price: string;
  type?: string;
  apiProductId?: string; // Store the API product _id if selected from dropdown
  claimCode?: string;
  timePeriod?: string;
  cnToPartner?: string | number;
  supportedAmount?: number; // Add this for discount logic
}

interface ApiProduct {
  _id: string;
  name: string;
  model: string;
  serialNumber?: string;
  checkCode?: string;
  checkNumber?: string;
  price?: number;
  srp?: number;
  supportedAmount?: number;
  type?: string;
  category?: string;
}

interface CustomAttachment {
  id: number;
  name: string;
}

interface Branch {
  _id: string;
  id?: string;
  name?: string;
  code?: string;
  branchName?: string;
}

interface FilesState {
  // allow single filename or multiple filenames for fields like Payment Slip
  [key: string]: string | string[];
}

interface FileObjectsState {
  // allow single File or array of Files (for Payment Slip multiple files)
  [key: string]: File | File[];
}



export default function InvoiceForm() {
  // Date filter states for ledger modal
  const [ledgerFilterFrom, setLedgerFilterFrom] = useState("");
  const [ledgerFilterTo, setLedgerFilterTo] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);

  const [productData, setProductData] = useState({
    name: "",
    model: "",
    serialNumber: "",
    checkCode: "",
    price: "",
    claimCode: "",
    timePeriod: "",
    cnToPartner: "",
    category: ""
  });

  const router = useRouter();
  const { toast } = useToast();
  const [files, setFiles] = useState<FilesState>({});
  const [fileObjects, setFileObjects] = useState<FileObjectsState>({});
  const [products, setProducts] = useState<Product[]>([{
    id: 1,
    name: "LAPTOP",
    model: "",
    serialNumber: "",
    checkCode: "",
    price: "",
    claimCode: "",
    timePeriod: "",
    cnToPartner: ""
  }]);
  const [customAttachments, setCustomAttachments] = useState<CustomAttachment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showLedgerListModal, setShowLedgerListModal] = useState(false);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [matchingLedgers, setMatchingLedgers] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>("");
  const [fieldName, setFieldName] = useState("");
  const [ledgerData, setLedgerData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    pincode: "",
    gstNo: "",
    panCard: "",
    state: "",
    country: ""
  });
  const [hasGST, setHasGST] = useState("no");
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Normalize frontend category values to backend enum keys (plural, lowercase)
  const normalizeCategory = (value?: string) => {
    if (!value) return null;

    const map: Record<string, string> = {
      laptop: 'laptops',
      laptops: 'laptops',

      desktop: 'desktops',
      desktops: 'desktops',

      aio: 'aios',
      aios: 'aios',

      accessory: 'accessories',
      accessories: 'accessories',
    };

    return map[value.toLowerCase().trim()] || null;
  };


  // Clear GST and PAN card when hasGST changes to 'no'
  useEffect(() => {
    if (hasGST === "no") {
      setLedgerData(prev => ({
        ...prev,
        gstNo: "",
        panCard: ""
      }));
    }
  }, [hasGST]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);
  // Map of product entry id -> filtered API products for selected category
  const [filteredProductsMap, setFilteredProductsMap] = useState<Record<number, ApiProduct[]>>({});
  // Map of product entry id -> current search suggestions
  const [searchResultsMap, setSearchResultsMap] = useState<Record<number, ApiProduct[]>>({});
  // Track the search input value for each product row
  const [productSearchInputMap, setProductSearchInputMap] = useState<Record<number, string>>({});
  const productSearchRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelCategory, setExcelCategory] = useState<string>("");
  const [qrUploads, setQrUploads] = useState<any[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [paymentMismatch, setPaymentMismatch] = useState<boolean>(false);
  const [gstVerifying, setGstVerifying] = useState<boolean>(false);
  const [ledgerGstVerifying, setLedgerGstVerifying] = useState<boolean>(false);
  const [ledgerPhoneError, setLedgerPhoneError] = useState<string>("");
  const [ledgerEmailError, setLedgerEmailError] = useState<string>("");
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [showCheckCodeScanner, setShowCheckCodeScanner] = useState(false);
  const [showModelScanner, setShowModelScanner] = useState(false);
  const [scanningProductId, setScanningProductId] = useState<number | null>(null);
  const [scannedValue, setScannedValue] = useState<string>("");
  const [scannerType, setScannerType] = useState<'serial' | 'checkCode' | 'model'>('serial');
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    branch: "",
    salesPerson: "",
    date: new Date().toISOString().split('T')[0],
    salesType: "Retail",
    customerName: "",
    address: "",
    pinCode: "",
    contactPerson: "",
    mobile: "",
    phone: "",
    email: "",
    gstNumber: "",
    referralSource: "",
    referralSourceOther: "",
    paymentMode: [] as Array<{
      mode: string;
      amount?: number;
      bankType?: string;
      utrNumber?: string;
      chequeNumber?: string;
      upiProvider?: string;
      upiTransactionId?: string;
      machineProvider?: string;
      machineCardType?: string;
      machineCardLast4Digits?: string;
      machineIdProofType?: string;
      machineIdProofNumber?: string;
      machineTransactionId?: string;
      loanAmount?: number;
      loanId?: string;
      brandOrderType?: string;
    }>,
    totalAmount: "",
    _accessoryDiscount: 0,
    _paymentModes: {
      Cash: { selected: false, amount: "" },
      Bank: { selected: false, amount: "", bankType: "", utrNumber: "", chequeNumber: "" },
      UPI: { selected: false, amount: "", upiProvider: "PhonePe", upiTransactionId: "" },
      Machine: { selected: false, amount: "", machineProvider: "", machineCardType: "", machineCardLast4Digits: "", machineIdProofType: "", machineIdProofNumber: "", machineTransactionId: "" },
      "Bajaj Finance": { selected: false, amount: "", loanAmount: "", loanId: "" },
      "Brand Order": { selected: false, amount: "", brandOrderType: "" }
    }
  });


  // Fetch branches on component mount with progressive loading
  useEffect(() => {
    const loadData = async () => {
      // Load critical data in parallel
      await Promise.all([
        fetchBranches(),
        fetchSalesPersons()
      ]);
      
      // Hide skeleton after critical data loads
      setIsInitialLoading(false);
      
      // Load non-critical data after
      fetchAvailableProducts();
    };
    
    loadData();
    
    // Generate or retrieve unique session ID for QR uploads
    if (typeof window !== 'undefined') {
      const storedSessionId = sessionStorage.getItem('invoiceSessionId');
      if (storedSessionId) {
        setSessionId(storedSessionId);
      } else {
        const newSessionId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        sessionStorage.setItem('invoiceSessionId', newSessionId);
      }
    }
  }, []);

  const fetchAvailableProducts = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/products/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        logger.warn("Unauthorized - redirecting to login");
        router.push("/");
        return;
      }

      if (response.ok) {
        const result = await response.json();
        logger.log('Initial products fetch:', result);

        // Handle new API structure with categorized products
        if (result.success && result.products) {
          const allProducts = [
            ...(result.products.laptops || []).map((p: ApiProduct) => ({ ...p, category: 'Laptop' })),
            ...(result.products.desktops || []).map((p: ApiProduct) => ({ ...p, category: 'Desktop' })),
            ...(result.products.aios || []).map((p: ApiProduct) => ({ ...p, category: 'AIO' })),
            ...(result.products.accessories || []).map((p: ApiProduct) => ({ ...p, category: 'Accessory' }))
          ];
          setAvailableProducts(allProducts);
          logger.log('Loaded products from new API structure:', allProducts.length);
        } else if (result.products && Array.isArray(result.products)) {
          setAvailableProducts(result.products);
        } else if (result.data && Array.isArray(result.data)) {
          setAvailableProducts(result.data);
        } else if (Array.isArray(result)) {
          setAvailableProducts(result);
        }
      }
    } catch (error) {
      logger.error('Error fetching products:', error);
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setExcelFile(file);
  };

  const uploadExcel = async () => {
    if (!excelFile) {
      toast({ title: 'No file', description: 'Please select an Excel file to upload', variant: 'destructive' });
      return;
    }

    setUploadingExcel(true);
    try {
      const form = new FormData();
      form.append('file', excelFile);
      if (excelCategory) {
        // map display names to API category keys
        const mapping: Record<string, string> = {
          'Laptops': 'laptops',
          'Desktops': 'desktops',
          'AIOs': 'aios',
          'Accessories': 'accessories'
        };
        form.append('category', mapping[excelCategory] || excelCategory.toLowerCase());
      }

      const res = await fetch(`${getApiUrl()}/api/products/upload-excel`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      const result = await res.json().catch(() => ({}));
      if (res.ok && result && result.success) {
        toast({ title: 'Upload successful', description: result.message || 'Products updated from Excel' });
        // Refresh products shown in the form
        fetchAvailableProducts();
        setExcelFile(null);
      } else {
        toast({ title: 'Upload failed', description: result.message || 'Failed to upload Excel', variant: 'destructive' });
      }
    } catch (err) {
      logger.error('Excel upload error:', err);
      toast({ title: 'Error', description: 'Failed to upload Excel file', variant: 'destructive' });
    } finally {
      setUploadingExcel(false);
    }
  };

  // Close any open suggestion lists when clicking outside product search wrappers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const refs = productSearchRefs.current;
      if (!refs) return;
      // If click is inside any wrapper, do nothing
      for (const key of Object.keys(refs)) {
        const el = refs[Number(key)];
        if (el && e.target instanceof Node && el.contains(e.target)) return;
      }
      // click was outside all wrappers -> clear all suggestion lists
      setSearchResultsMap({});
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Generate QR code when sessionId is available (deferred)
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      // Defer QR generation to not block initial render
      setTimeout(() => {
        const uploadUrl = `${window.location.origin}/qr-upload/${sessionId}`;
        QRCode.toDataURL(uploadUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }).then(url => {
          setQrCodeDataUrl(url);
        }).catch(err => {
          logger.error('Error generating QR code:', err);
        });
      }, 200);
    }
  }, [sessionId]);

  const createProduct = async () => {
    // Validation
    if (!productData.name.trim() || !productData.price.trim() || !productData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: Product Name, Price, and Category",
        variant: "destructive",
      });
      return;
    }

    try {
      // Map frontend category values to backend enum keys expected by the API
      const catKey = normalizeCategory(productData.category) || productData.category;
      const payload = { ...productData, category: catKey };

      const response = await fetch(`${getApiUrl()}/api/products`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.message || "Failed to create product",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product created successfully!",
      });

      setShowProductModal(false);

      // Clear state
      setProductData({
        name: "",
        model: "",
        serialNumber: "",
        checkCode: "",
        price: "",
        claimCode: "",
        timePeriod: "",
        cnToPartner: "",
        category: ""
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong creating the product",
        variant: "destructive",
      });
    }
  };


  // Check for new QR uploads
  const checkQRUploads = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`${getApiUrl()}/api/uploads/qr/${sessionId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.uploads && Array.isArray(data.uploads)) {
        setQrUploads(prevUploads => {
          const newCount = data.uploads.length;
          const prevCount = prevUploads.length;

          // Only show toast if there are new uploads
          if (newCount > prevCount) {
            toast({
              title: "New upload received!",
              description: `${newCount - prevCount} image(s) uploaded via QR code.`,
            });
          }

          return data.uploads;
        });
      }
    } catch (error) {
      logger.error('Failed to check QR uploads:', error);
    }
  }, [sessionId, toast]);

  // Poll for QR uploads when sessionId is available (reduced frequency, deferred start)
  useEffect(() => {
    if (!sessionId) return;

    // Defer initial check to not block render
    const initialTimer = setTimeout(() => {
      checkQRUploads();
    }, 500);

    // Then poll every 10 seconds
    const pollInterval = setInterval(() => {
      checkQRUploads();
    }, 10000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
    };
  }, [sessionId, checkQRUploads]);

  // Fetch all ledgers
  const fetchLedgers = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/ledgers/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        logger.warn("Unauthorized - redirecting to login");
        router.push("/");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        // Ensure we always set an array
        if (Array.isArray(data)) {
          setLedgers(data);
        } else if (data.ledgers && Array.isArray(data.ledgers)) {
          setLedgers(data.ledgers);
        } else if (data.data && Array.isArray(data.data)) {
          setLedgers(data.data);
        } else {
          setLedgers([]);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch ledgers",
          variant: "destructive",
        });
        setLedgers([]);
      }
    } catch (error) {
      logger.error('Error fetching ledgers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ledgers. Please try again.",
        variant: "destructive",
      });
      setLedgers([]);
    }
  }, [toast, router]);

  // Fetch ledgers on mount so we can match by mobile as user types (deferred)
  useEffect(() => {
    // Defer ledger fetch to not block initial render
    const timer = setTimeout(() => {
      try {
        fetchLedgers();
      } catch (err) {
        logger.warn('fetchLedgers failed on mount', err);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [fetchLedgers]);

  // Debounce mobile input to reduce filtering frequency
  const debouncedMobile = useDebounce(formData.mobile, 300);

  // Filter ledgers when mobile changes and autofill GST
  useEffect(() => {
    const mobile = (debouncedMobile || '').replace(/\D/g, '');
    if (mobile && mobile.length >= 3) {
      const matches = ledgers.filter((l: any) => {
        const phone = (l.phone || '').replace(/\D/g, '');
        return phone.includes(mobile);
      });
      setMatchingLedgers(matches);
      if (matches.length === 1) {
        const ledger = matches[0];
        const id = ledger._id || ledger.id || '';
        setSelectedLedgerId(id);
        setFormData(prev => ({
          ...prev,
          companyName: ledger.name || prev.companyName,
          gstNumber: ledger.gstNo || prev.gstNumber,
          customerName: ledger.name || prev.customerName,
          address: ledger.address || prev.address,
          pinCode: ledger.pincode || prev.pinCode,
          email: ledger.email || prev.email
        }));
        }
    } else {
      setMatchingLedgers([]);
      setSelectedLedgerId('');
    }
  }, [debouncedMobile, ledgers]);

  // Create new ledger
  const createLedger = useCallback(async () => {
    // Client-side validations
    const phone = ledgerData.phone.trim();
    const email = ledgerData.email.trim();
    const phoneValid = phone === '' || /^\d{10}$/.test(phone); // allow empty but if present must be 10 digits
    const emailValid = email === '' || /\S+@\S+\.\S+/.test(email); // allow empty but if present must be basic email
    if (!phoneValid) {
      setLedgerPhoneError('Phone number must be 10 digits');
      return;
    } else {
      setLedgerPhoneError('');
    }
    if (!emailValid) {
      setLedgerEmailError('Enter a valid email address');
      return;
    } else {
      setLedgerEmailError('');
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/ledgers/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: ledgerData.name.trim(),
          phone: ledgerData.phone.trim(),
          email: ledgerData.email.trim(),
          address: ledgerData.address.trim(),
          pincode: ledgerData.pincode.trim(),
          gstNo: hasGST === "yes" ? ledgerData.gstNo.trim() : "",
          panCard: hasGST === "yes" ? ledgerData.panCard.trim() : "",
          state: ledgerData.state.trim(),
          country: ledgerData.country.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const created = data.ledger || data.data || data.created || data;
        toast({
          title: "Success",
          description: "Ledger created successfully!",
        });
        // Reset form and close modal
        setLedgerData({
          name: "",
          phone: "",
          email: "",
          address: "",
          pincode: "",
          gstNo: "",
          panCard: "",
          state: "",
          country: ""
        });
        setHasGST("no");
        setShowLedgerModal(false);
        // Refresh ledgers list so new ledger appears
        try {
          await fetchLedgers();
        } catch (err) {
          logger.warn('Failed to refresh ledgers after create', err);
        }

        // Auto-select the newly created ledger in the form (if available)
        const newId = created && (created._id || created.id || created._doc?._id);
        if (newId) {
          setSelectedLedgerId(newId);
          setFormData(prev => ({
            ...prev,
            companyName: created.name || prev.companyName,
            mobile: created.phone || prev.mobile
          }));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: errorData.message || "Failed to create ledger",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error creating ledger:', error);
      toast({
        title: "Error",
        description: "Failed to create ledger. Please try again.",
        variant: "destructive",
      });
    }
  }, [ledgerData, hasGST, toast, showLedgerListModal, fetchLedgers]);

  // Memoize branch names
  const branchNames = useMemo(() => 
    branches.map(b => b.name || b.branchName || b.code || 'Unknown'),
    [branches]
  );

  // Memoize calculations
  const { invoiceTotal, accessoryDiscount } = useMemo(() => {
    // Separate products and accessories
    const productItems = products.filter(
      (p) => (p.type || '').toLowerCase() !== 'accessory' && (p.type || '').toLowerCase() !== 'accessories'
    );
    const accessoryItems = products.filter(
      (p) => (p.type || '').toLowerCase() === 'accessory' || (p.type || '').toLowerCase() === 'accessories'
    );

    const productTotal = productItems.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
    const accessoryTotal = accessoryItems.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

    let total = 0;
    let discount = 0;

    if (accessoryItems.length > 0 && productItems.length > 0) {
      // Accessories involved, apply discount to accessories
      if (productTotal > 65000) {
        discount = 1000;
      } else {
        discount = 500;
      }
      total = productTotal + Math.max(accessoryTotal - discount, 0);
    } else if (accessoryItems.length > 0 && productItems.length === 0) {
      // Only accessories
      total = accessoryTotal;
    } else {
      // No accessories, show supportedAmount sum if available, else productTotal
      const supportedAmountTotal = productItems.reduce((sum, p) => {
        const supported = p.supportedAmount !== undefined ? Number(p.supportedAmount) : undefined;
        return sum + (supported || (parseFloat(p.price) || 0));
      }, 0);
      total = supportedAmountTotal;
    }

    return { invoiceTotal: total, accessoryDiscount: discount };
  }, [products]);

  // Update formData when calculated values change
  useEffect(() => {
    const totalString = invoiceTotal % 1 === 0 ? invoiceTotal.toString() : invoiceTotal.toFixed(2).replace(/\.0+$/, '');
    setFormData(prev => ({
      ...prev,
      totalAmount: totalString,
      _accessoryDiscount: accessoryDiscount
    }));
  }, [invoiceTotal, accessoryDiscount]);

  // Memoize payment mode total calculation
  const paymentModeTotal = useMemo(() => {
    let total = 0;
    Object.values(formData._paymentModes).forEach(data => {
      if (data.selected) {
        if ('loanAmount' in data && data.loanAmount) {
          total += parseFloat(data.loanAmount) || 0;
        } else if ('amount' in data && data.amount) {
          total += parseFloat(data.amount) || 0;
        }
      }
    });
    return Math.round(total * 100) / 100;
  }, [formData._paymentModes]);

  // Check payment mode total vs total amount
  useEffect(() => {
    const totalAmount = parseFloat(formData.totalAmount) || 0;
    setPaymentMismatch(Math.abs(paymentModeTotal - totalAmount) >= 0.01);
  }, [paymentModeTotal, formData.totalAmount]);

  // Email validation function (memoized)
  const validateEmail = useCallback((email: string) => {
    if (!email) {
      setEmailError("");
      return true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address (must contain @ and .)");
      return false;
    }

    setEmailError("");
    return true;
  }, []);

  // GST verification function for ledger form
  const verifyLedgerGST = async (gstNumber: string) => {
    if (!gstNumber || gstNumber.length !== 15) return;

    setLedgerGstVerifying(true);
    try {
      logger.log('Verifying Ledger GST:', gstNumber);
      const response = await fetch(`${getApiUrl()}/api/gst/verify/${gstNumber}`);

      const result = await response.json();
      logger.log('Ledger GST API Response:', result);

      if (result.success) {
        // Extract from raw.data if available, otherwise from result.data
        const apiData = result.data?.raw?.data || result.data;
        const { legalName, tradeName, pincode, adr, pan } = apiData;
        logger.log('Extracted ledger data:', { legalName, tradeName, pincode, adr, pan });

        // Extract state from address
        const indianStates = [
          'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
          'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
          'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
          'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
          'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
        ];

        let detectedState = '';
        if (adr) {
          for (const state of indianStates) {
            if (adr.toLowerCase().includes(state.toLowerCase())) {
              detectedState = state;
              break;
            }
          }
        }

        // Auto-fill the ledger fields - name, PAN, address, pincode, and state
        setLedgerData(prev => ({
          ...prev,
          name: legalName || tradeName || prev.name,
          panCard: pan || prev.panCard,
          address: adr || prev.address,
          pincode: pincode || prev.pincode,
          state: detectedState || prev.state
        }));

        logger.log('Ledger form data updated successfully');

        toast({
          title: "GST Verified",
          description: "GST details fetched successfully!",
        });
      } else {
        logger.error('Ledger GST verification failed:', result.message);
        toast({
          title: "Verification Failed",
          description: result.message || "Could not verify GST number. Please enter details manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error verifying ledger GST:', error);
      toast({
        title: "Error",
        description: "Failed to verify GST number. Please enter details manually.",
        variant: "destructive",
      });
    } finally {
      setLedgerGstVerifying(false);
    }
  };

  // GST verification function
  const verifyGST = async (gstNumber: string) => {
    if (!gstNumber || gstNumber.length !== 15) return;

    setGstVerifying(true);
    try {
      logger.log('Verifying GST:', gstNumber);
      const response = await fetch(`${getApiUrl()}/api/gst/verify/${gstNumber}`);

      const result = await response.json();
      logger.log('GST API Response:', result);

      if (result.success) {
        // Extract from raw.data if available, otherwise from result.data
        const apiData = result.data?.raw?.data || result.data;
        const { legalName, tradeName, pincode, adr } = apiData;
        logger.log('Extracted data:', { legalName, tradeName, pincode, adr });

        // Auto-fill the fields - only company name, address, and pincode
        setFormData(prev => ({
          ...prev,
          customerName: legalName || tradeName || prev.customerName,
          pinCode: pincode || prev.pinCode,
          address: adr || prev.address
        }));

        logger.log('Form data updated successfully');

        toast({
          title: "GST Verified",
          description: "Company details fetched successfully!",
        });
      } else {
        logger.warn('GST verification failed:', result.message);
        toast({
          title: "Verification Failed",
          description: result.message || "Could not verify GST number. Please enter details manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error verifying GST:', error);
      toast({
        title: "Error",
        description: "Failed to verify GST number. Please enter details manually.",
        variant: "destructive",
      });
    } finally {
      setGstVerifying(false);
    }
  };

  const fetchBranches = async () => {
    try {
      logger.log("Attempting to fetch branches from backend...");
      const response = await fetch(`${getApiUrl()}/api/branches`, {
        credentials: 'include'
      });

      logger.log("Response status:", response.status);

      if (response.status === 401) {
        logger.warn("Unauthorized - redirecting to login");
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logger.log("Fetched branches data:", data);

      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
        logger.log("✓ Successfully loaded", data.branches.length, "branches");
      } else {
        logger.warn("No branches found in response, creating sample branches");
        // Try to create sample branches via API
        try {
          const initResponse = await fetch(`${getApiUrl()}/api/branches/init`, {
            method: 'POST',
            credentials: 'include'
          });
          const initData = await initResponse.json();
          if (initData.success && initData.branches) {
            setBranches(initData.branches);
            logger.log("✓ Sample branches created and loaded");
          } else {
            setBranches([]);
          }
        } catch (initError) {
          logger.error("Failed to create sample branches:", initError);
          setBranches([]);
        }
      }
    } catch (error) {
      logger.error("❌ Error fetching branches:", error);
      logger.log("Attempting to create sample branches...");

      // Try to create sample branches when backend is available but no branches exist
      try {
        const initResponse = await fetch(`${getApiUrl()}/api/branches/`, {
          method: 'POST',
          credentials: 'include'
        });
        const initData = await initResponse.json();
        if (initData.success && initData.branches) {
          setBranches(initData.branches);
          logger.log("✓ Sample branches created successfully");
        } else {
          setBranches([]);
          logger.warn("No branches available - please add branches first");
        }
      } catch (initError) {
        logger.error("Failed to create sample branches:", initError);
        setBranches([]);
        logger.warn("Backend not available - please start the server and add branches");
      }
    }
  };

  const fetchSalesPersons = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/salespersons/`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        logger.warn("Unauthorized - redirecting to login");
        router.push("/");
        return;
      }

      const data = await res.json();
      if (data?.salesPersons) setSalesPersons(data.salesPersons);
    } catch (err) {
      logger.error("Error fetching salespersons:", err);
    }
  };

  // Payment mode helper functions (memoized)
  const handlePaymentModeChange = useCallback((mode: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      _paymentModes: {
        ...prev._paymentModes,
        [mode]: {
          ...prev._paymentModes[mode as keyof typeof prev._paymentModes],
          selected: checked,
          ...(mode === 'Bajaj Finance'
            ? { amount: checked ? (prev._paymentModes[mode as keyof typeof prev._paymentModes] as any).amount || "" : "", loanAmount: checked ? (prev._paymentModes[mode as keyof typeof prev._paymentModes] as any).loanAmount || "" : "" }
            : { amount: checked ? (prev._paymentModes[mode as keyof typeof prev._paymentModes] as any).amount || "" : "" }
          )
        }
      }
    }));
  }, []);

  const handlePaymentAmountChange = useCallback((mode: string, amount: string) => {
    setFormData(prev => ({
      ...prev,
      _paymentModes: {
        ...prev._paymentModes,
        [mode]: {
          ...prev._paymentModes[mode as keyof typeof prev._paymentModes],
          ...(mode === 'Bajaj Finance'
            ? { loanAmount: amount }
            : { amount: amount }
          )
        }
      }
    }));
  }, []);

  // Calculate total of selected payment mode amounts (now returns memoized value)
  const calculatePaymentModeTotal = useCallback(() => {
    return paymentModeTotal;
  }, [paymentModeTotal]);

  // Validate required fields for selected payment modes (memoized)
  const validatePaymentModeFields = useCallback(() => {
    const missingFields: string[] = [];

    Object.entries(formData._paymentModes).forEach(([mode, data]) => {
      if (data.selected) {
        // Check amount for all modes except Bajaj Finance
        if (mode !== 'Bajaj Finance' && (!('amount' in data) || !data.amount || parseFloat(data.amount) <= 0)) {
          missingFields.push(`${mode}: Amount is required`);
        }

        // Mode-specific validations
        switch (mode) {
          case 'Bank':
            if ('bankType' in data && !data.bankType) {
              missingFields.push(`${mode}: Bank type is required (NEFT/RTGS/IMPS/Net Banking/Cheque)`);
            }
            if ('bankType' in data && data.bankType === 'Net Banking' && 'utrNumber' in data && !data.utrNumber) {
              missingFields.push(`${mode}: UTR number is required for Net Banking`);
            }
            if ('bankType' in data && data.bankType === 'Cheque' && 'chequeNumber' in data && !data.chequeNumber) {
              missingFields.push(`${mode}: Cheque number is required for Cheque payments`);
            }
            break;

          case 'UPI':
            if ('upiTransactionId' in data && !data.upiTransactionId) {
              missingFields.push(`${mode}: PhonePe Transaction ID is required`);
            }
            break;

          case 'Machine':
            if ('machineProvider' in data && !data.machineProvider) {
              missingFields.push(`${mode}: Machine provider is required (Pinelabs/Paytm)`);
            }
            if ('machineTransactionId' in data && !data.machineTransactionId) {
              missingFields.push(`${mode}: Transaction ID is required`);
            }
            break;

          case 'Bajaj Finance':
            if ('amount' in data && (!data.amount || parseFloat(data.amount) <= 0)) {
              missingFields.push(`${mode}: Amount is required`);
            }
            if ('loanAmount' in data && (!data.loanAmount || parseFloat(data.loanAmount) <= 0)) {
              missingFields.push(`${mode}: Loan amount is required`);
            }
            break;

          case 'Brand Order':
            if ('amount' in data && (!data.amount || parseFloat(data.amount) <= 0)) {
              missingFields.push(`${mode}: Amount is required`);
            }
            if ('brandOrderType' in data && !data.brandOrderType) {
              missingFields.push(`${mode}: Brand order type is required (Lenovo OMO/Asus Eshop)`);
            }
            break;
        }
      }
    });

    return missingFields;
  }, [formData._paymentModes]);

  const addAttachment = () => {
    setShowModal(true);
  };

  const handleAddField = () => {
    if (fieldName.trim()) {
      const newId = Date.now();
      setCustomAttachments([...customAttachments, { id: newId, name: fieldName.trim() }]);
      setFieldName("");
      setShowModal(false);
    }
  };

  const cancelModal = () => {
    setFieldName("");
    setShowModal(false);
  };

  const openQRModal = () => {
    setShowQRModal(true);
  };

  const closeQRModal = () => {
    setShowQRModal(false);
  };

  const removeAttachment = (id: number, name: string) => {
    setCustomAttachments(customAttachments.filter(att => att.id !== id));
    const newFiles = { ...files };
    const newFileObjects = { ...fileObjects };
    delete newFiles[name];
    delete newFileObjects[name];
    setFiles(newFiles);
    setFileObjects(newFileObjects);
  };

  const updateProduct = async (id: number, field: keyof Product, value: string) => {
    logger.log('Updating product:', { id, field, value: sanitizeForLog(value) });

    // If selecting a product from the dropdown, auto-fill the details
    if (field === 'name' && value.startsWith('API_')) {
      const productId = value.replace('API_', '');
      try {
        const res = await fetch(`${getApiUrl()}/api/products/${productId}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.status === 401) {
          logger.warn("Unauthorized - redirecting to login");
          router.push("/");
          return;
        }

        if (res.ok) {
          const selectedProduct = await res.json();
          const updatedProducts = products.map(p =>
            p.id === id
              ? {
                ...p,
                name: selectedProduct.model || selectedProduct.name || '',
                model: selectedProduct.model || '',
                // serialNumber and checkCode intentionally left unchanged for manual entry
                price: (selectedProduct.supportedAmount ?? selectedProduct.srp ?? selectedProduct.price ?? '').toString(),
                claimCode: selectedProduct.claimCode ?? '',
                timePeriod: selectedProduct.programPeriod ?? '',
                cnToPartner: selectedProduct.cnToPartner ?? '',
                type: selectedProduct.category || p.type || '',
                apiProductId: selectedProduct._id // Store the API product ID
              }
              : p
          );
          logger.log('Updated products with API data:', sanitizeForLog(updatedProducts));
          setProducts(updatedProducts);
          return;
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        // Fallback to availableProducts
        const selectedProduct = availableProducts.find(p => p._id === productId);
        if (selectedProduct) {
          const updatedProducts = products.map(p =>
            p.id === id
              ? {
                ...p,
                name: selectedProduct.model || selectedProduct.name || '',
                model: selectedProduct.model || '',
                // serialNumber and checkCode intentionally left unchanged for manual entry
                price: (selectedProduct.supportedAmount ?? selectedProduct.srp ?? selectedProduct.price ?? '').toString(),
                claimCode: (selectedProduct as any).claimCode ?? '',
                timePeriod: (selectedProduct as any).timePeriod ?? '',
                cnToPartner: (selectedProduct as any).cnToPartner ?? '',
                type: (selectedProduct as any).type || (selectedProduct as any).category || p.type || '',
                apiProductId: selectedProduct._id // Store the API product ID
              }
              : p
          );
          logger.log('Updated products with cached API data:', sanitizeForLog(updatedProducts));
          setProducts(updatedProducts);
          return;
        }
      }
    }

    // If deselecting product (empty or manual entry), clear auto-filled fields
    if (field === 'name' && (value === '' || value === 'LAPTOP')) {
      const updatedProducts = products.map(p =>
        p.id === id
          ? {
            ...p,
            name: value,
            model: '',
            serialNumber: '',
            checkCode: '',
            price: '',
            apiProductId: undefined // Clear API product ID
          }
          : p
      );
      logger.log('Cleared product fields:', sanitizeForLog(updatedProducts));
      setProducts(updatedProducts);
      return;
    }

    const updatedProducts = products.map(p => p.id === id ? { ...p, [field]: value } : p);
    logger.log('Updated products:', sanitizeForLog(updatedProducts));
    setProducts(updatedProducts);
  };

  // Memoize search function with useCallback
  const searchProducts = useCallback((productIdNum: number, query: string) => {
    setProductSearchInputMap(prev => ({ ...prev, [productIdNum]: query }));
    // If empty query, show all items for this product entry's category (if any)
    let list = filteredProductsMap[productIdNum] ?? availableProducts;

    const prodEntry = products.find(p => p.id === productIdNum);
    if (prodEntry && prodEntry.type) {
      const ct = prodEntry.type.toString().toLowerCase();
      if (!(filteredProductsMap[productIdNum] && filteredProductsMap[productIdNum].length)) {
        list = availableProducts.filter(api => {
          const apiCat = ((api as any).category || (api as any).type || '').toString().toLowerCase();
          if (apiCat && apiCat === ct) return true;
          if (api.model && api.model.toLowerCase().includes(ct)) return true;
          return false;
        });
      }
    }

    const q = (query || '').toLowerCase();
    const matches = list.filter(p => {
      if (!q) return true;
      const label = ((p.model || p.name) || '').toString().toLowerCase();
      const code = (p.checkCode || p.serialNumber || '').toString().toLowerCase();
      return label.includes(q) || code.includes(q);
    });

    setSearchResultsMap(prev => ({ ...prev, [productIdNum]: matches }));
  }, [filteredProductsMap, availableProducts, products]);

  // When a category is selected, if exactly one API product matches that category
  // auto-fill the product fields to save a click.
  const handleCategoryChange = useCallback((productIdNum: number, category: string) => {
    logger.log('Category changed:', { productIdNum, category: sanitizeForLog(category) });
    // Clear product fields when category changes
    const updatedProducts = products.map(p =>
      p.id === productIdNum
        ? {
          ...p,
          type: category,
          name: '',
          model: '',
          serialNumber: '',
          checkCode: '',
          price: '',
          claimCode: '',
          timePeriod: '',
          cnToPartner: '',
          apiProductId: undefined // Clear API product ID
        }
        : p
    );
    setProducts(updatedProducts);

    // Filter products by category
    const categoryLower = category.toLowerCase();
    const filtered = availableProducts.filter(api => {
      const apiCat = ((api as any).category || (api as any).type || '').toString().toLowerCase();
      return apiCat === categoryLower;
    });
    setFilteredProductsMap(prev => ({ ...prev, [productIdNum]: filtered }));

    logger.log('Cleared product fields for category change');
  }, [products, availableProducts]);

  const handleProductChange = useCallback((productIdNum: number, productId: string) => {
    logger.log('Product changed:', { productIdNum, productId: sanitizeForLog(productId) });
    // When a product is selected, update the search input to show the selected product's name/model
    const selectedProduct = availableProducts.find(p => p._id === productId);
    setProductSearchInputMap(prev => ({
      ...prev,
      [productIdNum]: selectedProduct ? (selectedProduct.name || selectedProduct.model || '') : ''
    }));
    if (selectedProduct) {
      // Directly update the product with API data from availableProducts, but do NOT autofill serialNumber or checkCode
      const updatedProducts = products.map(p =>
        p.id === productIdNum
          ? {
            ...p,
            name: selectedProduct.model || selectedProduct.name || '',
            model: selectedProduct.model || '',
            // serialNumber and checkCode intentionally left unchanged for manual entry
            price: (selectedProduct.supportedAmount != null) ? selectedProduct.supportedAmount.toString() : (selectedProduct.srp && selectedProduct.srp > 0) ? selectedProduct.srp.toString() : (selectedProduct.price && selectedProduct.price > 0) ? selectedProduct.price.toString() : '',
            claimCode: (selectedProduct as any).claimCode ?? '',
            timePeriod: (selectedProduct as any).programPeriod ?? '',
            cnToPartner: (selectedProduct as any).cnToPartner ?? '',
            type: selectedProduct.category || p.type || '',
            apiProductId: selectedProduct._id // Store the API product ID
          }
          : p
      );
      setProducts(updatedProducts);
    }
  }, [availableProducts, products]);

  const handleModelChange = async (productIdNum: number, model: string) => {
    logger.log('Model changed:', { productIdNum, model: sanitizeForLog(model) });
    // Find the product entry
    const product = products.find(p => p.id === productIdNum);
    if (!product) return;

    // helper to match by model and category
    const categoryLower = ((product.type || '') as string).toLowerCase();
    const matchIn = (list?: ApiProduct[]) => (list || []).find(p => {
      const label = (p.model || p.name || '').toString();
      const apiCat = ((p.category || p.type || '') || '').toString().toLowerCase();
      return label === model && apiCat === categoryLower;
    });

    // try suggestions, then filtered, then availableProducts
    let selectedProduct = matchIn(searchResultsMap[productIdNum]);
    if (!selectedProduct) selectedProduct = matchIn(filteredProductsMap[productIdNum]);
    if (!selectedProduct) selectedProduct = matchIn(availableProducts);

    if (selectedProduct) {
      try {
        let sp: ApiProduct | undefined = selectedProduct;
        // Try to fetch full details from API (if _id present)
        if (sp._id) {
          const response = await fetch(`${getApiUrl()}/api/products/${sp._id}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          if (response.status === 401) {
            console.warn("Unauthorized - redirecting to login");
            router.push("/");
            return;
          }

          if (response.ok) {
            const details = await response.json().catch(() => (sp as any));
            sp = { ...sp, ...(details || {}) } as ApiProduct;
          }
        }

        // Update fields: price, claimCode, timePeriod, cnToPartner (editable)
        const updatedProducts = products.map(p =>
          p.id === productIdNum
            ? {
              ...p,
              name: sp!.model || sp!.name || '',
              model: sp!.model || sp!.name || '',
              price: (sp!.supportedAmount != null) ? String(sp!.supportedAmount) : (sp!.srp && sp!.srp > 0) ? String(sp!.srp) : (sp!.price && sp!.price > 0) ? String(sp!.price) : p.price,
              claimCode: (sp as any).claimCode ?? p.claimCode ?? '',
              timePeriod: (sp as any).programPeriod ?? (sp as any).timePeriod ?? p.timePeriod ?? '',
              cnToPartner: (sp as any).cnToPartner ?? p.cnToPartner ?? '',
              type: sp!.category || p.type || '',
              apiProductId: sp!._id || p.apiProductId
            }
            : p
        );

        setProducts(updatedProducts);
      } catch (err) {
        logger.error('Error handling selected model:', err);
      }
    } else {
      // no API match — just set model text, keep other fields as-is
      const updatedProducts = products.map(p => p.id === productIdNum ? { ...p, model } : p);
      setProducts(updatedProducts);
    }
  };

  // Fetch products/models for a specific category from API (populate suggestions)
  const fetchProductsByCategory = async (productIdNum: number, category?: string) => {
    if (!category) return [] as ApiProduct[];
    const key = normalizeCategory(category) || category.toString().toLowerCase();
    try {
      const resp = await fetch(`${getApiUrl()}/api/products?category=${encodeURIComponent(key)}`, {
        credentials: 'include'
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        let list: ApiProduct[] = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data.products)) list = data.products;
        else if (Array.isArray(data.data)) list = data.data;
        else if (data.products && data.products[key] && Array.isArray(data.products[key])) list = data.products[key];

        if (!list.length) {
          // fallback to client-side availableProducts filtered by category
          const catLower = (category || '').toString().toLowerCase();
          list = availableProducts.filter(ap => ((ap as any).category || (ap as any).type || '').toString().toLowerCase() === catLower);
        }

        setSearchResultsMap(prev => ({ ...prev, [productIdNum]: list }));
        setFilteredProductsMap(prev => ({ ...prev, [productIdNum]: list }));
        return list;
      }
    } catch (err) {
      logger.error('Error fetching products by category:', err);
    }

    // Final fallback: use availableProducts filtered by category
    const catLower = (category || '').toString().toLowerCase();
    const fallbackList = availableProducts.filter(ap => ((ap as any).category || (ap as any).type || '').toString().toLowerCase() === catLower);
    setSearchResultsMap(prev => ({ ...prev, [productIdNum]: fallbackList }));
    setFilteredProductsMap(prev => ({ ...prev, [productIdNum]: fallbackList }));
    return fallbackList;
  };

  const addProduct = () => {
    const newId = Math.max(...products.map(p => p.id)) + 1;
    setProducts([...products, {
      id: newId,
      name: "LAPTOP",
      model: "",
      serialNumber: "",
      checkCode: "",
      price: "",
      claimCode: "",
      timePeriod: "",
      cnToPartner: ""
    }]);
  };

  const deleteProduct = (id: number) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // External Scanner functions
  const openExternalScanner = (productId: number, type: 'serial' | 'checkCode' | 'model' = 'serial') => {
    setScanningProductId(productId);
    setScannerType(type);
    if (type === 'serial') {
      setShowSerialScanner(true);
    } else if (type === 'checkCode') {
      setShowCheckCodeScanner(true);
    } else {
      // Pre-populate model suggestions for this product's category
      const prod = products.find(p => p.id === productId);
      if (prod && prod.type) {
        fetchProductsByCategory(productId, prod.type).catch(err => logger.error(err));
      }
      setShowModelScanner(true);
    }
    setScannedValue("");

    // Auto-focus the input field after modal renders
    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 100);
  };
  const handleScannerInput = async (value: string) => {
    if (scanningProductId !== null && value.trim()) {
      // Update the appropriate field based on scanner type
      if (scannerType === 'serial') {
        updateProduct(scanningProductId, 'serialNumber', value.trim());
        toast({
          title: "Serial Number Scanned!",
          description: `Serial number: ${value.trim()}`,
          variant: "default",
        });
      } else if (scannerType === 'checkCode') {
        updateProduct(scanningProductId, 'checkCode', value.trim());
        toast({
          title: "CHECK Code Scanned!",
          description: `CHECK Code: ${value.trim()}`,
          variant: "default",
        });
      } else {
        const scanned = value.trim();

        // Ensure suggestions for this product's category are loaded
        const prod = products.find(p => p.id === scanningProductId);
        if (prod && prod.type) {
          try {
            await fetchProductsByCategory(scanningProductId, prod.type);
          } catch (err) {
            logger.error('Failed to fetch models for category before validating scanned model', err);
          }
        }

        updateProduct(scanningProductId, 'model', scanned);
        setProductSearchInputMap(prev => ({ ...prev, [scanningProductId]: scanned }));

        // Check whether scanned model exists in suggestions
        const suggestions = searchResultsMap[scanningProductId] ?? [];
        const found = suggestions.some(s => ((s.model || s.name) || '').toString().toLowerCase() === scanned.toLowerCase());

        toast({
          title: found ? "Model Scanned (Found)" : "Model Scanned (Not Found)",
          description: found ? `Model "${scanned}" exists in selected category.` : `Model "${scanned}" not found in the selected category.`,
          variant: found ? "default" : "destructive",
        });
      }

      // Close the scanner
      closeExternalScanner();
    }
  };

  const closeExternalScanner = () => {
    setShowSerialScanner(false);
    setShowCheckCodeScanner(false);
    setShowModelScanner(false);
    setScanningProductId(null);
    setScannedValue("");
  };

  // Handle Enter key press in scanner input
  const handleScannerKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScannerInput(scannedValue);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    if (!e.target.files) return;

    if (e.target.files[0]) {
      const file = e.target.files[0];
      setFiles({ ...files, [label]: file.name });
      setFileObjects({ ...fileObjects, [label]: file });
    }
  };

  const removeFile = (label: string) => {
    const newFiles = { ...files } as FilesState;
    const newFileObjects = { ...fileObjects } as FileObjectsState;

    delete newFiles[label];
    delete newFileObjects[label];

    setFiles(newFiles);
    setFileObjects(newFileObjects);
  };

  const removeQRUpload = async (index: number) => {
    try {
      const uploadToDelete = qrUploads[index];

      if (!uploadToDelete || !uploadToDelete._id) {
        // Fallback: remove locally if no ID yet
        setQrUploads(prev => prev.filter((_, i) => i !== index));
        return;
      }


      const response = await fetch(`${getApiUrl()}/api/uploads/qr/${uploadToDelete._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setQrUploads(prev => prev.filter((_, i) => i !== index));
      } else {
        logger.error("Failed to delete upload:", sanitizeForLog(data.message));
        alert(`Delete failed: ${data.message}`);
      }
    } catch (error) {
      logger.error("Error deleting QR upload:", error);
      alert("An error occurred while deleting this upload.");
    }
  };


  const handleSubmit = async () => {
    logger.log('handleSubmit called at:', new Date().toISOString());
    logger.log('formData.branch:', formData.branch, 'type:', typeof formData.branch);

    // Prevent double submission
    if (loading) {
      logger.log('Submit already in progress, ignoring duplicate call');
      return;
    }

    // Validation
    logger.log('Validation - formData.branch:', formData.branch, 'branches available:', branches.length);
    if (!formData.companyName || !formData.branch || !formData.customerName) {
      alert('Please fill in all required fields: Company Name, Branch, and Customer Name');
      return;
    }

    // Email validation
    if (formData.email && !validateEmail(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Check if branch is valid
    const selectedBranch = branches.find(b => b._id === formData.branch);
    logger.log('Selected branch found:', !!selectedBranch, selectedBranch);
    if (!selectedBranch) {
      alert('Please select a valid branch. If no branches are available, please add branches first.');
      return;
    }

    // Check if any payment mode is selected
    const hasSelectedPaymentMode = Object.values(formData._paymentModes).some(data => data.selected);
    if (!hasSelectedPaymentMode) {
      alert('Please select at least one payment mode.');
      return;
    }

    // Validate required fields for selected payment modes
    const missingPaymentFields = validatePaymentModeFields();
    if (missingPaymentFields.length > 0) {
      alert('Please fill in the required payment mode fields:\n\n' + missingPaymentFields.join('\n'));
      return;
    }

    // Check if payment mode amounts equal total amount
    const paymentModeTotal = calculatePaymentModeTotal();
    const totalAmount = parseFloat(formData.totalAmount) || 0;

    if (totalAmount > 0 && Math.abs(Math.round(paymentModeTotal * 100) - Math.round(totalAmount * 100)) > 1) {
      alert(`Payment mode amounts (₹${paymentModeTotal}) must equal the total amount (₹${totalAmount})`);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Apply accessories rules to products for submission
      // Separate products and accessories
      const productItems = products.filter(
        (p) => (p.type || '').toLowerCase() !== 'accessory' && (p.type || '').toLowerCase() !== 'accessories'
      );
      const accessoryItems = products.filter(
        (p) => (p.type || '').toLowerCase() === 'accessory' || (p.type || '').toLowerCase() === 'accessories'
      );

      const productTotal = productItems.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
      const accessoryTotal = accessoryItems.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

      let freeAccessoryAmount = 0;
      if (productItems.length > 0) {
        freeAccessoryAmount = productTotal > 65000 ? 1000 : 500;
      }

      // Always include all accessories, mark free ones with price 0
      let accessoriesForSubmission: typeof accessoryItems = [];
      if (productItems.length > 0 && accessoryItems.length > 0) {
        let runningTotal = 0;
        // Sort accessories by price descending to maximize free value
        const sortedAccessories = [...accessoryItems].sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        for (const acc of sortedAccessories) {
          const price = parseFloat(acc.price) || 0;
          if (runningTotal + price <= freeAccessoryAmount) {
            // Free accessory, set price to 0 for submission
            accessoriesForSubmission.push({ ...acc, price: "0" });
            runningTotal += price;
          } else {
            // Only the portion above free limit is chargeable
            if (runningTotal < freeAccessoryAmount) {
              const chargeablePart = price - (freeAccessoryAmount - runningTotal);
              accessoriesForSubmission.push({ ...acc, price: chargeablePart.toString() });
              runningTotal = freeAccessoryAmount;
            } else {
              accessoriesForSubmission.push(acc);
            }
          }
        }
      } else if (productItems.length === 0 && accessoryItems.length > 0) {
        // Only accessories: all are chargeable
        accessoriesForSubmission = accessoryItems;
      }

      // Prepare the list of products to actually submit (all products + all accessories)
      const productsToSubmit = [
        ...productItems,
        ...accessoriesForSubmission
      ];

      const productIds: string[] = [];

      logger.log('Processing products for invoice:', productsToSubmit.length, 'products');
      logger.log('Products data:', productsToSubmit);

      for (const product of productsToSubmit) {
        logger.log('Processing product:', product);
        const modelValue = (product.model && product.model.trim()) || (product.name && product.name.trim()) || "";
        const hasValidModel = modelValue.length > 0;
        const hasValidPrice = product.price && product.price.trim().length > 0 && !isNaN(parseFloat(product.price)) && parseFloat(product.price) > 0;
        if (!hasValidModel || !hasValidPrice) {
          logger.log('Skipping incomplete product:', product);
          continue;
        }
        // If product was selected from API dropdown, use its existing ID
        if (product.apiProductId) {
          logger.log('Using existing API product ID:', product.apiProductId);
          productIds.push(product.apiProductId);
          continue;
        }

        // Otherwise, create a new product
        try {
          // Ensure category is set - map type to valid category values
          let categoryValue = 'laptop'; // Default fallback

          if (product.type) {
            const typeNormalized = product.type.trim().toLowerCase();
            if (typeNormalized === 'laptop' || typeNormalized.includes('laptop')) {
              categoryValue = 'laptop';
            } else if (typeNormalized === 'desktop' || typeNormalized.includes('desktop')) {
              categoryValue = 'desktop';
            } else if (typeNormalized === 'console' || typeNormalized.includes('console')) {
              categoryValue = 'console';
            } else if (typeNormalized === 'aio' || typeNormalized.includes('aio')) {
              categoryValue = 'aio';
            } else if (typeNormalized === 'accessory' || typeNormalized.includes('accessory')) {
              categoryValue = 'accessory';
            }
          }

          const safeCategory = normalizeCategory(categoryValue) || categoryValue;

          const productPayload = {
            name: modelValue,
            model: modelValue,
            price: parseFloat(product.price),
            srp: parseFloat(product.price),
            checkCode: (product.checkCode && product.checkCode.trim()) || "",
            serialNumber: (product.serialNumber && product.serialNumber.trim()) || "",
            category: safeCategory
          };

          logger.log('Creating new product with payload:', JSON.stringify(productPayload, null, 2));

          const productResponse = await fetch(`${getApiUrl()}/api/products`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(productPayload)
          });

          const productData = await productResponse.json();
          logger.log('Product creation response:', productData);

          if (productData.success && productData.product) {
            productIds.push(productData.product._id);
            logger.log('Product created successfully, ID:', productData.product._id);
          } else {
            logger.error('Product creation failed:', productData.message);
            alert(`Failed to create product "${product.name}": ${productData.message || 'Unknown error'}.`);
            setLoading(false);
            return;
          }
        } catch (error) {
          logger.error('Error creating product:', error);
          alert(`Error creating product: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setLoading(false);
          return;
        }
      }

      logger.log('Total product IDs collected:', productIds.length);
      logger.log('Product IDs:', productIds);

      if (productIds.length === 0) {
        logger.warn('No products were created in backend. Proceeding to create billing using product details only.');
      }

      // Step 2: Validate required fields
      if (!formData.companyName || !formData.branch || !formData.customerName) {
        alert('Missing required fields: Company Name, Branch, and Customer Name are required.');
        setLoading(false);
        return;
      }

      if (productIds.length === 0) {
        logger.warn('productIds is empty; will submit billing with product details only.');
      }

      // Step 2: Validate required fields before submission
      if (!formData.companyName || !formData.branch || !formData.customerName) {
        alert('Missing required fields: Company Name, Branch, and Customer Name are required.');
        setLoading(false);
        return;
      }

      // allow billing even when no product IDs were created; product details will be submitted instead

      // Step 2: Create FormData for billing with file uploads
      const formDataToSend = new FormData();

      // Add all form fields
      // Ensure all required fields have proper values
      formDataToSend.append('companyName', formData.companyName.trim() || 'Default Company');
      // Normalize branch data before sending to backend. The UI stores selected branch as an _id string.
      const branchValue = formData.branch || '';
      // Try to resolve branch object from fetched branches using multiple possible keys
      const selectedBranch = branches.find((b: any) => {
        if (!b) return false;
        if (b._id === branchValue || b.id === branchValue) return true;
        if (typeof b.name === 'string' && b.name === branchValue) return true;
        if (typeof b.code === 'string' && b.code === branchValue) return true;
        return false;
      }) || null;

      // Always append branchId and branchName for backend compatibility (use branchValue as fallback)
      const branchIdToSend = (selectedBranch && (selectedBranch._id || selectedBranch.id)) ? (selectedBranch._id || selectedBranch.id) : (branchValue || '');
      const branchNameToSend = (selectedBranch && (selectedBranch.name || selectedBranch.branchName)) ? (selectedBranch.name || selectedBranch.branchName) : '';

      // Ensure the canonical `branch` field holds the branch ObjectId string the backend expects
      if (branchIdToSend) {
        formDataToSend.append('branch', String(branchIdToSend));
      } else {
        formDataToSend.append('branch', String(branchValue));
      }

      formDataToSend.append('branchId', String(branchIdToSend));
      if (branchNameToSend) formDataToSend.append('branchName', String(branchNameToSend));
      formDataToSend.append('salesPerson', formData.salesPerson || 'Unknown');
      formDataToSend.append('date', formData.date || new Date().toISOString());
      formDataToSend.append('salesType', formData.salesType || 'Retail');
      formDataToSend.append('customerName', formData.customerName.trim());
      formDataToSend.append('address', formData.address || "");
      formDataToSend.append('pinCode', formData.pinCode || "");
      formDataToSend.append('contactPerson', formData.contactPerson || formData.customerName);
      formDataToSend.append('mobile', formData.mobile || "");
      formDataToSend.append('phone', formData.phone || formData.mobile || "");
      formDataToSend.append('email', formData.email || "");
      formDataToSend.append('gstNumber', formData.gstNumber || "");
      formDataToSend.append('referralSource', formData.referralSource || "");
      formDataToSend.append('referralSourceOther', formData.referralSourceOther || "");

      // Handle payment modes - convert to new billing model format
      const paymentModeArray = Object.entries(formData._paymentModes)
        .filter(([mode, data]) => data.selected)
        .map(([mode, data]) => {
          const paymentObj: any = {
            mode: mode,
            amount: ('amount' in data) ? parseFloat(data.amount || '0') || 0 : 0
          };

          // Add sub-fields based on payment mode
          if (mode === 'Bank') {
            if ('bankType' in data && data.bankType) {
              paymentObj.bankType = data.bankType;
              if (data.bankType === 'Net Banking' && 'utrNumber' in data && data.utrNumber) {
                paymentObj.utrNumber = data.utrNumber;
              }
              if (data.bankType === 'Cheque' && 'chequeNumber' in data && data.chequeNumber) {
                paymentObj.chequeNumber = data.chequeNumber;
              }
            }
          } else if (mode === 'UPI') {
            if ('upiProvider' in data && data.upiProvider) {
              paymentObj.upiProvider = data.upiProvider;
            }
            if ('upiTransactionId' in data && data.upiTransactionId) {
              paymentObj.upiTransactionId = data.upiTransactionId;
            }
          } else if (mode === 'Machine') {
            if ('machineProvider' in data && data.machineProvider) {
              paymentObj.machineProvider = data.machineProvider;
            }
            if ('machineCardType' in data && data.machineCardType) {
              paymentObj.machineCardType = data.machineCardType;
            }
            if ('machineCardLast4Digits' in data && data.machineCardLast4Digits) {
              paymentObj.machineCardLast4Digits = data.machineCardLast4Digits;
            }
            if ('machineIdProofType' in data && data.machineIdProofType) {
              paymentObj.machineIdProofType = data.machineIdProofType;
            }
            if ('machineIdProofNumber' in data && data.machineIdProofNumber) {
              paymentObj.machineIdProofNumber = data.machineIdProofNumber;
            }
            if ('machineTransactionId' in data && data.machineTransactionId) {
              paymentObj.machineTransactionId = data.machineTransactionId;
            }
          } else if (mode === 'Bajaj Finance') {
            if ('loanAmount' in data && data.loanAmount) {
              paymentObj.loanAmount = parseFloat(data.loanAmount || '0') || 0;
            }
            if ('loanId' in data && data.loanId) {
              paymentObj.loanId = data.loanId;
            }
          } else if (mode === 'Brand Order') {
            if ('brandOrderType' in data && data.brandOrderType) {
              paymentObj.brandOrderType = data.brandOrderType;
            }
          }

          return paymentObj;
        });

      formDataToSend.append('paymentMode', JSON.stringify(paymentModeArray));

      // Calculate total amount and ensure it's valid
      const calculatedTotal = products.reduce((sum, product) => sum + (parseFloat(product.price) || 0), 0);
      const finalTotalAmount = parseFloat(formData.totalAmount) || calculatedTotal;

      if (finalTotalAmount <= 0) {
        alert('Total amount must be greater than 0');
        setLoading(false);
        return;
      }

      formDataToSend.append('totalAmount', finalTotalAmount.toString());



      // Prepare product data in multiple formats for backend compatibility
      const validProducts = products.filter(product => {
        const nameValue = (product.name && String(product.name)) || (product.model && String(product.model)) || '';
        const priceValue = product.price != null ? String(product.price) : '';
        const hasValidName = nameValue.trim().length > 0;
        const hasValidPrice = priceValue.trim().length > 0 && !isNaN(parseFloat(priceValue)) && parseFloat(priceValue) > 0;
        return hasValidName && hasValidPrice;
      });

      // Build fullProductDetails using productsToSubmit and productIds so IDs align with product entries
      const fullProductDetails = productsToSubmit.map((product, index) => ({
        _id: productIds[index] || product.apiProductId || null,
        name: ((product.name && String(product.name)) || (product.model && String(product.model)) || '').trim(),
        model: ((product.model && String(product.model)) || (product.name && String(product.name)) || '').trim(),
        price: parseFloat(String(product.price)),
        checkCode: (product.checkCode && String(product.checkCode).trim()) || "",
        serialNumber: (product.serialNumber && String(product.serialNumber).trim()) || "",
        claimCode: (product.claimCode && String(product.claimCode).trim()) || "",
        timePeriod: (product.timePeriod && String(product.timePeriod).trim()) || "",
        cnToPartner: product.cnToPartner ? Number(product.cnToPartner) : 0
      }));

      logger.log('Debug - Full product details being sent:', fullProductDetails);
      logger.log('Debug - Valid products count:', validProducts.length);
      logger.log('Debug - Created product IDs count:', productIds.length);

      // Send products as array of ObjectIds (not JSON string)
      productIds.forEach(productId => {
        formDataToSend.append('products', productId);
      });
      formDataToSend.append('productDetails', JSON.stringify(fullProductDetails)); // Full product objects


      const customerIdFile = fileObjects["Customer ID"];
      if (customerIdFile) {
        if (Array.isArray(customerIdFile)) {
          customerIdFile.forEach((f) => formDataToSend.append('customerID', f));
        } else {
          formDataToSend.append('customerID', customerIdFile as File);
        }
      }

      const paymentSlipFile = fileObjects["Payment Slip"];
      if (paymentSlipFile) {
        if (Array.isArray(paymentSlipFile)) {
          paymentSlipFile.forEach((f) => formDataToSend.append('paymentSlip', f));
        } else {
          formDataToSend.append('paymentSlip', paymentSlipFile as File);
        }
      }
      // Note: inventoryPics can accept multiple files
      const inventoryImageFile = fileObjects["Inventory Image"];
      if (inventoryImageFile) {
        if (Array.isArray(inventoryImageFile)) {
          inventoryImageFile.forEach((f) => formDataToSend.append('inventoryPics', f));
        } else {
          formDataToSend.append('inventoryPics', inventoryImageFile as File);
        }
      }
      const googleReviewFile = fileObjects["Google Review"];
      if (googleReviewFile) {
        if (Array.isArray(googleReviewFile)) {
          googleReviewFile.forEach((f) => formDataToSend.append('googleReview', f));
        } else {
          formDataToSend.append('googleReview', googleReviewFile as File);
        }
      }

      // Add custom attachments as inventoryPics (multiple allowed)
      customAttachments.forEach(att => {
        const customFile = fileObjects[att.name];
        if (customFile) {
          if (Array.isArray(customFile)) {
            customFile.forEach((f) => formDataToSend.append('inventoryPics', f));
          } else {
            formDataToSend.append('inventoryPics', customFile as File);
          }
        }
      });

      // Add QR uploads - send sessionId so backend can associate uploads
      if (qrUploads.length > 0) {
        formDataToSend.append('sessionId', sessionId);
        qrUploads.forEach(upload => {
          // The server should handle these based on the session ID or upload IDs
          if (upload._id) {
            formDataToSend.append('qrUploads', upload._id);
          }
        });
      }

      // Step 3: Submit billing to backend
      logger.log('Submitting billing with data:');
      logger.log('Created product IDs:', productIds);
      logger.log('Required fields check:');
      logger.log('- customerName:', formData.customerName);
      logger.log('- totalAmount:', formData.totalAmount);
      logger.log('- branch:', formData.branch);
      logger.log('- companyName:', formData.companyName);

      logger.log('Form data fields:');
      for (let [key, value] of formDataToSend.entries()) {
        if (key === 'products') {
          logger.log(`${key}:`, 'JSON array of', productIds.length, 'product IDs');
        } else if (key === 'productDetails') {
          logger.log(`${key}:`, 'Full product details for', validProducts.length, 'products');
          try {
            const productDetailsValue = JSON.parse(value as string);
            logger.log('Product details preview:', sanitizeForLog(productDetailsValue));
          } catch (e) {
            logger.log('Product details (raw):', sanitizeForLog(value));
          }
        } else {
          logger.log(`${key}:`, sanitizeForLog(value));
        }
      }

      const response = await fetch(`${getApiUrl()}/api/billing/`, {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include'
      });

      logger.log('Billing API response status:', response.status);
      logger.log('Billing API response headers:', Object.fromEntries(response.headers.entries()));

      let data;
      const responseText = await response.text();
      logger.log('Raw response:', responseText);

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('Failed to parse response as JSON:', parseError);
        logger.error('Response text:', responseText);
        throw new Error(`Invalid response from server: ${responseText.substring(0, 200)}`);
      }

      logger.log('Parsed billing API response data:', data);

      // Debug the created billing record to see if products are saved correctly
      if (data.billing) {
        logger.log('Debug - Created billing record:', data.billing);
        logger.log('Debug - Billing products field:', data.billing.products);
        logger.log('Debug - Billing products type:', typeof data.billing.products);
        logger.log('Debug - Billing products length:', data.billing.products?.length);
      }

      if (data.success) {
        setSubmitSuccess(true);
        toast({
          title: "Success!",
          description: "Billing created successfully!",
        });

        // Stop loading immediately so UI reflects success
        setLoading(false);

        // Clear QR uploads after successful submission
        setQrUploads([]);

        // Clear sessionId from sessionStorage and generate a new one for next invoice
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('invoiceSessionId');
          const newSessionId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setSessionId(newSessionId);
          sessionStorage.setItem('invoiceSessionId', newSessionId);
        }

        // Save to localStorage for compatibility
        const billingData = {
          id: data.billing._id,
          customer: formData.customerName || formData.companyName || 'New Customer',
          amount: `Rs. ${formData.totalAmount || totalAmount}`,
          salesPerson: formData.salesPerson || localStorage.getItem('userName') || 'Sales Person',
          branch: formData.branch || 'Branch',
          date: new Date(data.billing.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        };

        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'temp-user' : 'temp-user';
        const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'user' : 'user';
        const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';
        const recordWithUser = { ...billingData, userId, userName };

        if (typeof window !== 'undefined') {
          const records = JSON.parse(localStorage.getItem('billingRecords') || '[]');
          records.push(recordWithUser);
          localStorage.setItem('billingRecords', JSON.stringify(records));
        }

        // Redirect based on role
        setTimeout(() => {
          if (role === 'admin') {
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/billing';
          }
        }, 800);
      } else {
        logger.error('Billing submission failed:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          url: `${getApiUrl()}/api/billing/`,
          responseText: responseText
        });

        let errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
        if (response.status === 400) {
          errorMessage = `Bad Request: ${data.message || 'Invalid data sent to server. Please check all required fields are filled correctly.'}`;
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized: Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Forbidden: You do not have permission to create billing records.';
        } else if (response.status >= 500) {
          errorMessage = 'Server Error: Please try again later or contact support.';
        }

        logger.error('Full error details:', {
          errorMessage,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          parsedData: data,
          rawResponse: responseText
        });

        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('Submission error - Full details:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        stringified: JSON.stringify(error, null, 2)
      });

      // Try to extract meaningful error message
      let errorMessage = 'Failed to submit billing';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }

      alert(`Error: ${errorMessage}. Please check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  // Fix date format for Tally
  const formatDateForTally = (dateString: string) => {
    const date = dateString ? new Date(dateString) : new Date();
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };

  // Helper function to get ledger name based on payment mode
  const getPaymentLedgerName = (paymentMode: string) => {
    switch (paymentMode.toLowerCase()) {
      case 'cash': return 'Cash Account';
      case 'cheque': return 'Bank Account';
      case 'credit card': return 'Card Payments';
      case 'debit card': return 'Card Payments';
      case 'bajaj finance': return 'Bajaj Finance Account';
      case 'imps': return 'Bank Account';
      case 'upi': return 'UPI Account';
      case 'neft': return 'Bank Account';
      case 'bank transfer': return 'Bank Account';
      case 'rgts': return 'Bank Account';
      case 'pinelabs': return 'Pinelabs Account';
      case 'paytm machine': return 'Paytm Machine Account';
      default: return 'Bank Account';
    }
  };

  const exportToTallyXML = () => {
    const currentDate = formatDateForTally(formData.date);
    const totalAmount = parseFloat(formData.totalAmount as string) || products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

    // Calculate GST (assuming 18% GST: 9% CGST + 9% SGST)
    const gstRate = 0.18;
    const taxableAmount = totalAmount / (1 + gstRate);
    const gstPerHead = (totalAmount - taxableAmount) / 2; // Split GST between CGST and SGST

    // Generate voucher number
    const voucherNumber = `INV-${Date.now()}`;

    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${formData.customerName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>

      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">

            <DATE>${currentDate}</DATE>
            <EFFECTIVEDATE>${currentDate}</EFFECTIVEDATE>
            <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <PARTYLEDGERNAME>${formData.customerName}</PARTYLEDGERNAME>
            <PARTYNAME>${formData.customerName}</PARTYNAME>
            <NARRATION>Sales Invoice</NARRATION>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>

            <!-- CUSTOMER ENTRY -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${formData.customerName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalAmount.toFixed(2)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${voucherNumber}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>-${totalAmount.toFixed(2)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </ALLLEDGERENTRIES.LIST>

            <!-- INCOME LEDGER -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${taxableAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- TAX ENTRIES -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>CGST Output</LEDGERNAME>
              <TAXCLASSIFICATIONNAME>Output CGST</TAXCLASSIFICATIONNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${gstPerHead.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>SGST Output</LEDGERNAME>
              <TAXCLASSIFICATIONNAME>Output SGST</TAXCLASSIFICATIONNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${gstPerHead.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- INVENTORY ENTRIES -->
            ${products && products.length > 0 ?
        products.map((product, index) => `
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${product.model || product.name || 'PRODUCT'}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <RATE>${(parseFloat(product.price) || 0).toFixed(2)}/Nos</RATE>
              <AMOUNT>${(parseFloat(product.price) || 0).toFixed(2)}</AMOUNT>
              <BILLEDQTY>1 Nos</BILLEDQTY>
              <ACTUALQTY>1 Nos</ACTUALQTY>
            </ALLINVENTORYENTRIES.LIST>`).join('') : `
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>PRODUCT</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <RATE>${totalAmount.toFixed(2)}/Nos</RATE>
              <AMOUNT>${totalAmount.toFixed(2)}</AMOUNT>
              <BILLEDQTY>1 Nos</BILLEDQTY>
              <ACTUALQTY>1 Nos</ACTUALQTY>
            </ALLINVENTORYENTRIES.LIST>`}

          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    // Download XML file
    const blob = new Blob([xmlData], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_Invoice_${formData.customerName}_${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-6 border rounded-lg shadow bg-white">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(j => (
                <div key={j}>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-10 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            {isInitialLoading ? (
              <SkeletonLoader />
            ) : (
            <>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">Create Invoice</h1>

              <div className="flex gap-2 flex-wrap">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowExcelModal(true)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium text-sm shadow-sm transition-colors"
                  >
                    Upload Products
                  </button>
                  <Dialog open={showExcelModal} onOpenChange={(open) => setShowExcelModal(open)}>
                    <DialogContent className="sm:max-w-[640px]">
                      <DialogHeader>
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16v4h10v-4M12 12v8m0-8l-4 4m4-4l4 4M12 3v9" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <DialogTitle className="text-lg">Upload Products Excel</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">Upload Excel to import products.</DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!excelCategory) {
                            toast({ title: 'Select category', description: 'Please choose a category', variant: 'destructive' });
                            return;
                          }
                          if (!excelFile) {
                            toast({ title: 'No file', description: 'Please choose an Excel file', variant: 'destructive' });
                            return;
                          }
                          await uploadExcel();
                          setShowExcelModal(false);
                        }}
                        className="pt-2"
                      >
                        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <Label className="mb-2">Category</Label>
                              <Select value={excelCategory} onValueChange={(v) => setExcelCategory(v)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Laptops">Laptops</SelectItem>
                                  <SelectItem value="Desktops">Desktops</SelectItem>
                                  <SelectItem value="AIOs">AIOs</SelectItem>
                                  <SelectItem value="Accessories">Accessories</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="mb-2">Excel File</Label>
                              <div className="flex items-center gap-3">
                                <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-background border border-dashed rounded-lg cursor-pointer hover:bg-accent">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16v4h10v-4M12 12v8m0-8l-4 4m4-4l4 4M12 3v9" />
                                  </svg>
                                  <div className="flex flex-col text-sm text-muted-foreground">
                                    <span>{excelFile ? excelFile.name : 'Choose a .xlsx file'}</span>
                                  </div>
                                  <input type="file" accept=".xlsx,.xls" onChange={handleExcelFileChange} className="hidden" />
                                </label>
                                <Button variant="outline" size="sm" type="button" onClick={() => setExcelFile(null)} disabled={!excelFile}>Clear</Button>
                              </div>
                            </div>
                          </div>
                          {uploadingExcel && (
                            <div className="w-full bg-muted rounded h-2 overflow-hidden mb-3">
                              <div className="h-2 bg-yellow-500 animate-[progress_1.5s_linear_infinite]" style={{ width: '60%' }} />
                            </div>
                          )}
                          <div className="flex justify-end gap-3 pt-1">
                            <Button variant="ghost" type="button" onClick={() => { setShowExcelModal(false); setExcelFile(null); }}>Cancel</Button>
                            <Button
                              type="submit"
                              variant="default"
                              className="bg-yellow-500 text-white hover:bg-yellow-600"
                              disabled={!excelCategory || !excelFile || uploadingExcel}
                            >
                              {uploadingExcel ? 'Uploading...' : 'Upload'}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLedgerModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium text-sm shadow-sm transition-colors"
                >
                  + Create Ledger
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
                >
                  + Add Product
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowLedgerListModal(true);
                    fetchLedgers();
                  }}
                  className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 font-medium text-sm shadow-sm transition-colors"
                >
                  Show All Ledger
                </button>
              </div>
            </div>

            {submitSuccess && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                ✓ Billing created successfully! Redirecting...
              </div>
            )}

            <div className="space-y-6">
              {/* GST Billing Details */}
              <section className="p-5 border border-gray-200 rounded-md shadow-sm bg-white">
                <h2 className="text-base font-semibold mb-4 text-gray-900">GST Billing Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Row 1 */}
                  <div>
                    <Label className="mb-1">Mobile Number</Label>
                    <Input
                      type="tel"
                      placeholder="Enter mobile number (10 digits)"
                      value={formData.mobile}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, mobile: value });
                      }}
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <Label className="mb-1">Ledger (by Mobile)</Label>
                    <Select
                      value={selectedLedgerId}
                      onValueChange={v => {
                        setSelectedLedgerId(v);
                        const ledger = matchingLedgers.find((l: any) => (l._id || l.id) === v) || ledgers.find((l: any) => (l._id || l.id) === v);
                        if (ledger) {
                          setFormData(prev => ({
                            ...prev,
                            companyName: ledger.name || prev.companyName,
                            gstNumber: ledger.gstNo || prev.gstNumber,
                            customerName: ledger.name || prev.customerName,
                            address: ledger.address || prev.address,
                            pinCode: ledger.pincode || prev.pinCode,
                            email: ledger.email || prev.email
                          }));
                        }
                      }}
                      disabled={matchingLedgers.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={matchingLedgers.length === 0 ? "No ledger found for this number" : "Select Ledger"} />
                      </SelectTrigger>
                      <SelectContent>
                        {matchingLedgers.length === 0 ? (
                          <SelectItem value="no-ledger" disabled>No ledger found for this number</SelectItem>
                        ) : (
                          matchingLedgers.map((ledger: any) => (
                            <SelectItem key={ledger._id || ledger.id} value={ledger._id || ledger.id}>
                              {ledger.name} ({ledger.phone})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1">Company Name</Label>
                    <Input
                      placeholder="Enter company name (optional)"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>

                  {/* Row 2 */}
                  <div>
                    <Label className="mb-1">Branch <span className="text-red-500">*</span></Label>
                    <Select value={formData.branch} onValueChange={(v: string) => setFormData({ ...formData, branch: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.length > 0
                          ? branches.map(branch => (
                            <SelectItem key={branch._id} value={branch._id}>
                              {branch.name || branch.branchName || ''}
                            </SelectItem>
                          ))
                          : <SelectItem value="no-branches" disabled>No branches available - Please add branches first</SelectItem>
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1">Sales Type</Label>
                    <Select value={formData.salesType} onValueChange={(v) => setFormData({ ...formData, salesType: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Sales Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Dealer">Dealer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1">Sales Person</Label>
                    <Select value={formData.salesPerson} onValueChange={(v) => setFormData({ ...formData, salesPerson: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Sales Person" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesPersons.length === 0 ? (
                          <SelectItem value="no-salesperson" disabled>No sales persons available</SelectItem>
                        ) : (
                          salesPersons.map((person: any) => (
                            <SelectItem key={person._id || person.id} value={person._id || person.id}>
                              {((person.firstName || person.name) + (person.lastName ? ` ${person.lastName}` : '')).trim()}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 3 - Date full width */}
                  <div className="md:col-span-3">
                    <Label className="mb-1">Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      readOnly
                      aria-disabled={true}
                      title="Date is fixed"
                    />
                  </div>
                </div>
              </section>

              {/* Customer Information */}
              <section className="p-5 border border-gray-200 rounded-md shadow-sm bg-white">
                <h2 className="text-base font-semibold mb-4 text-gray-900">Customer Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-1 flex items-center gap-2">GST Number
                      {gstVerifying && <span className="ml-2 text-xs text-blue-600">Verifying...</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Enter 15-digit GST number"
                        value={formData.gstNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                          setFormData({ ...formData, gstNumber: value });
                          if (value === '') {
                            setFormData(prev => ({
                              ...prev,
                              customerName: '',
                              address: '',
                              pinCode: ''
                            }));
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value.length === 15) {
                            verifyGST(value);
                          }
                        }}
                        maxLength={15}
                        disabled={gstVerifying}
                      />
                      {gstVerifying && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-fills company name and pincode on verification</p>
                  </div>
                  <div>
                    <Label className="mb-1">Billing Name <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Enter customer name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Address</Label>
                    <Input
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Pin Code</Label>
                    <Input
                      placeholder="Enter pin code (6 digits)"
                      value={formData.pinCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setFormData({ ...formData, pinCode: value });
                      }}
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Contact Person</Label>
                    <Input
                      placeholder="Contact person"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Email <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      placeholder="Enter email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        validateEmail(e.target.value);
                      }}
                      className={emailError ? 'border-red-500' : ''}
                      required
                    />
                    {emailError && (
                      <p className="text-red-500 text-xs mt-1">{emailError}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Products */}
              <section className="p-5 border border-gray-200 rounded-md shadow-sm bg-white">
                <h2 className="text-base font-semibold mb-4 text-gray-900">Products</h2>

                {products.map((product, index) => (
                  <div key={product.id} className="mb-5 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 bg-white px-3 py-1.5 rounded-md inline-block border border-gray-200">
                      Product {index + 1}{product.model ? ` - ${product.model}` : ''}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="mb-1 text-xs">Product Category</Label>
                        <Select value={product.type || undefined} onValueChange={(v: string) => handleCategoryChange(product.id, v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const categories = Array.from(new Set(availableProducts.map(ap => (ap as any).type || (ap as any).category).filter(Boolean)));
                              const fallback = ['Laptop', 'Desktop', 'AIO', 'Accessory', 'RF Laptops', 'RF Desktops'];
                              const list = Array.from(new Set([...categories, ...fallback]));
                              return list.map(c => (
                                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>


                      {/* Removed Product * input — using category+model selection instead */}


                      <div>
                        <Label className="mb-1 text-xs">Model</Label>
                        <div className="relative">
                          <div className="flex gap-2">
                            <Input
                              placeholder={!product.type ? 'Select category first' : 'Search model by name or code'}
                              value={productSearchInputMap[product.id] ?? product.model}
                              onChange={(e) => {
                                // Use same search helper to populate model suggestions
                                searchProducts(product.id, e.target.value);
                                setProductSearchInputMap(prev => ({ ...prev, [product.id]: e.target.value }));
                              }}
                              disabled={!product.type}
                              onFocus={() => {
                                if (product.type) {
                                  // Show all filtered products for this category when focused
                                  const filtered = filteredProductsMap[product.id] || [];
                                  if (filtered.length > 0) {
                                    setSearchResultsMap(prev => ({ ...prev, [product.id]: filtered }));
                                  } else {
                                    fetchProductsByCategory(product.id, product.type);
                                  }
                                }
                              }}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              onClick={() => openExternalScanner(product.id, 'model')}
                              className="px-3 bg-purple-500 hover:bg-purple-600"
                              title="Scan Model with External Scanner"
                            >
                              <Scan className="w-4 h-4" />
                            </Button>
                          </div>

                          {searchResultsMap[product.id] && searchResultsMap[product.id].length > 0 && (
                            <ul className="absolute z-10 bg-white border border-gray-300 rounded w-full max-h-48 overflow-y-auto mt-1 shadow-lg">
                              {searchResultsMap[product.id].map(apiProduct => (
                                <li
                                  key={apiProduct._id}
                                  className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                                  onMouseDown={() => {
                                    // Use handleModelChange to apply selected model and fetch details
                                    handleModelChange(product.id, apiProduct.model || apiProduct.name || '');
                                    setProductSearchInputMap(prev => ({ ...prev, [product.id]: apiProduct.model || apiProduct.name || '' }));
                                    setSearchResultsMap(prev => ({ ...prev, [product.id]: [] }));
                                  }}
                                >
                                  {apiProduct.model || apiProduct.name || 'Unnamed Model'}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 text-xs">Serial Number</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Serial Number"
                            value={product.serialNumber}
                            onChange={(e) => updateProduct(product.id, 'serialNumber', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => openExternalScanner(product.id)}
                            className="px-3 bg-purple-500 hover:bg-purple-600"
                            title="Scan with External Scanner"
                          >
                            <Scan className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 text-xs">CHECK Code</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="CHECK Code"
                            value={product.checkCode}
                            onChange={(e) => updateProduct(product.id, 'checkCode', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => openExternalScanner(product.id, 'checkCode')}
                            className="px-3 bg-purple-500 hover:bg-purple-600"
                            title="Scan CHECK Code with External Scanner"
                          >
                            <Scan className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 text-xs">Price *</Label>
                        <Input
                          type="number"
                          placeholder="Price"
                          value={product.price}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              updateProduct(product.id, 'price', value);
                            }
                          }}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 text-xs">Claim Code</Label>
                        <Input
                          placeholder="Claim Code"
                          value={product.claimCode || ''}
                          onChange={(e) => updateProduct(product.id, 'claimCode', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 text-xs">Time Period</Label>
                        <Input
                          placeholder="Time Period"
                          value={product.timePeriod || ''}
                          onChange={(e) => updateProduct(product.id, 'timePeriod', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 text-xs">CN To Partner</Label>
                        <Input
                          type="number"
                          placeholder="CN To Partner"
                          value={product.cnToPartner as any || ''}
                          onChange={(e) => updateProduct(product.id, 'cnToPartner', e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>
                    </div>
                    {products.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => deleteProduct(product.id)}
                        className="mt-3 w-full sm:w-auto text-sm"
                      >
                        Remove Product
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  onClick={addProduct}
                  className="w-full sm:w-auto text-sm sm:text-base"
                  variant="default"
                >
                  + Add Product
                </Button>
              </section>

              {/* Payment Mode - Improved UI */}
              <section className="p-5 border border-gray-200 rounded-md shadow-sm bg-white">
                <h2 className="text-base font-semibold mb-3 text-gray-900 flex items-center gap-2">
                  Payment Mode
                  <span className="text-xs font-normal text-gray-500">(Select and enter amount)</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {Object.entries(formData._paymentModes).map(([mode, data]) => {
                    const showError = data.selected && (
                      mode === 'Bajaj Finance'
                        ? (!('loanAmount' in data) || !data.loanAmount || isNaN(Number(data.loanAmount)) || Number(data.loanAmount) <= 0)
                        : (!('amount' in data) || !data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0)
                    );
                    return (
                      <div
                        key={mode}
                        className={`flex flex-col border rounded-md p-3 shadow-sm transition-all bg-white hover:bg-gray-50 ${data.selected ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'} ${showError ? 'border-rose-400 bg-rose-50' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            type="checkbox"
                            checked={data.selected}
                            onChange={(e) => handlePaymentModeChange(mode, e.target.checked)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                            id={`pmode-${mode}`}
                          />
                          <Label htmlFor={`pmode-${mode}`} className="font-medium text-gray-800 text-sm cursor-pointer">
                            {mode}
                          </Label>
                        </div>
                        {data.selected && (
                          <div className="flex flex-col gap-2">
                            {/* Amount field for all modes except Bajaj Finance */}
                            {mode !== 'Bajaj Finance' && (
                              <>
                                <Input
                                  type="number"
                                  placeholder="Enter amount"
                                  value={('amount' in data) ? data.amount : ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      handlePaymentAmountChange(mode, value);
                                    }
                                  }}
                                  min="0"
                                  step="0.01"
                                  className={`text-sm ${showError ? 'border-red-400 focus:ring-red-300' : ''}`}
                                />
                                {showError && (
                                  <span className="text-xs text-red-500">Enter a valid amount</span>
                                )}
                              </>
                            )}

                            {/* Bank specific fields */}
                            {mode === 'Bank' && (
                              <>
                                <Select
                                  value={('bankType' in data) ? data.bankType : ''}
                                  onValueChange={(value) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                          bankType: value
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select bank type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NEFT">NEFT</SelectItem>
                                    <SelectItem value="RTGS">RTGS</SelectItem>
                                    <SelectItem value="IMPS">IMPS</SelectItem>
                                    <SelectItem value="Net Banking">Net Banking</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                  </SelectContent>
                                </Select>
                                {('bankType' in data) && data.bankType === 'Net Banking' && (
                                  <Input
                                    placeholder="UTR Number"
                                    value={('utrNumber' in data) ? data.utrNumber : ''}
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        _paymentModes: {
                                          ...prev._paymentModes,
                                          [mode]: {
                                            ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                            utrNumber: e.target.value
                                          }
                                        }
                                      }));
                                    }}
                                    className="text-sm"
                                  />
                                )}
                                {('bankType' in data) && data.bankType === 'Cheque' && (
                                  <Input
                                    placeholder="Cheque Number"
                                    value={('chequeNumber' in data) ? data.chequeNumber : ''}
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        _paymentModes: {
                                          ...prev._paymentModes,
                                          [mode]: {
                                            ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                            chequeNumber: e.target.value
                                          }
                                        }
                                      }));
                                    }}
                                    className="text-sm"
                                  />
                                )}
                              </>
                            )}

                            {/* UPI specific fields */}
                            {mode === 'UPI' && (
                              <Input
                                placeholder="PhonePe Transaction ID"
                                value={('upiTransactionId' in data) ? data.upiTransactionId : ''}
                                onChange={(e) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    _paymentModes: {
                                      ...prev._paymentModes,
                                      [mode]: {
                                        ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                        upiTransactionId: e.target.value
                                      }
                                    }
                                  }));
                                }}
                                className="text-sm"
                              />
                            )}

                            {/* Machine specific fields */}
                            {mode === 'Machine' && (
                              <>
                                <Select
                                  value={('machineProvider' in data) ? data.machineProvider : ''}
                                  onValueChange={(value) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                          machineProvider: value
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select machine" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pinelabs">Pinelabs</SelectItem>
                                    <SelectItem value="Paytm">Paytm</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={('machineCardType' in data) ? data.machineCardType : ''}
                                  onValueChange={(value) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                          machineCardType: value
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select card type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="Last 4 digits of card"
                                  value={('machineCardLast4Digits' in data) ? data.machineCardLast4Digits : ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                          machineCardLast4Digits: value
                                        }
                                      }
                                    }));
                                  }}
                                  maxLength={4}
                                  className="text-sm"
                                />
                                <Select
                                  value={('machineIdProofType' in data) ? data.machineIdProofType : ''}
                                  onValueChange={(value) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                          machineIdProofType: value
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select ID proof" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                                    <SelectItem value="PAN">PAN</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder={('machineIdProofType' in data) && data.machineIdProofType === 'Aadhaar' ? 'Enter 12-digit Aadhaar' : ('machineIdProofType' in data) && data.machineIdProofType === 'PAN' ? 'Enter 10-character PAN' : 'ID proof number'}
                                  value={('machineIdProofNumber' in data) ? data.machineIdProofNumber : ''}
                                  onChange={(e) => {
                                    const idProofType = ('machineIdProofType' in data) ? data.machineIdProofType : '';
                                    let value = e.target.value;
                                    if (idProofType === 'Aadhaar') {
                                      value = value.replace(/\D/g, '').slice(0, 12);
                                    } else if (idProofType === 'PAN') {
                                      value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
                                    }
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                          machineIdProofNumber: value
                                        }
                                      }
                                    }));
                                  }}
                                  maxLength={('machineIdProofType' in data) && data.machineIdProofType === 'Aadhaar' ? 12 : ('machineIdProofType' in data) && data.machineIdProofType === 'PAN' ? 10 : undefined}
                                  className="text-sm"
                                />
                                <Input
                                  placeholder="Transaction ID"
                                  value={('machineTransactionId' in data) ? data.machineTransactionId : ''}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                          machineTransactionId: e.target.value
                                        }
                                      }
                                    }));
                                  }}
                                  className="text-sm"
                                />
                              </>
                            )}

                            {/* Bajaj Finance specific fields */}
                            {mode === 'Bajaj Finance' && (
                              <>
                                <Input
                                  type="number"
                                  placeholder="Loan Amount"
                                  value={('loanAmount' in data) ? data.loanAmount : ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      setFormData(prev => ({
                                        ...prev,
                                        _paymentModes: {
                                          ...prev._paymentModes,
                                          [mode]: {
                                            ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                            loanAmount: value,
                                            amount: value
                                          }
                                        }
                                      }));
                                    }
                                  }}
                                  min="0"
                                  step="0.01"
                                  className="text-sm"
                                />
                                {('loanAmount' in data) && (!data.loanAmount || parseFloat(data.loanAmount) <= 0) && (
                                  <span className="text-xs text-red-500">Enter a valid loan amount</span>
                                )}
                                <Input
                                  placeholder="Loan ID"
                                  value={('loanId' in data) ? data.loanId : ''}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...(prev._paymentModes[mode as keyof typeof prev._paymentModes] as any),
                                          loanId: e.target.value
                                        }
                                      }
                                    }));
                                  }}
                                  className="text-sm"
                                />
                              </>
                            )}

                            {/* Brand Order specific fields */}
                            {mode === 'Brand Order' && (
                              <>
                                <Select
                                  value={('brandOrderType' in data) ? data.brandOrderType : ''}
                                  onValueChange={(value) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      _paymentModes: {
                                        ...prev._paymentModes,
                                        [mode]: {
                                          ...prev._paymentModes[mode as keyof typeof prev._paymentModes],
                                          brandOrderType: value
                                        }
                                      }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select brand order type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Lenovo OMO">Lenovo OMO</SelectItem>
                                    <SelectItem value="Asus Eshop">Asus Eshop</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                  }
                </div>
                <div className="border-t pt-3 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Label className="font-medium text-gray-700 sm:w-32 text-sm">Total Amount (Rs):</Label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
                      <Input
                        type="number"
                        placeholder="Auto-calculated from products"
                        value={formData.totalAmount}
                        readOnly
                        className="bg-gray-50 border border-gray-200 rounded px-3 py-1 w-full sm:w-40 focus:outline-none cursor-not-allowed text-gray-700 text-sm"
                      />
                      <div className="flex flex-col gap-1">
                        {(() => {
                          // Show discount info if accessories are present
                          const hasAccessories = products.some(p => (p.type || '').toLowerCase() === 'accessory' || (p.type || '').toLowerCase() === 'accessories');
                          if (hasAccessories && formData._accessoryDiscount) {
                            return (
                              <span className="text-xs text-green-700 font-semibold">Salesperson Discount Applied: Rs. {formData._accessoryDiscount}</span>
                            );
                          }
                          return null;
                        })()}
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          (Calculated: Rs. {formData.totalAmount})
                        </span>
                        <div className={`text-xs whitespace-nowrap p-1 rounded font-semibold flex items-center gap-2 ${paymentMismatch ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                          {paymentMismatch ? (
                            <>
                              Payment Total: Rs. {(() => {
                                const total = calculatePaymentModeTotal();
                                return total % 1 === 0 ? total.toString() : total.toFixed(2);
                              })()} <span className="ml-1">Mismatch!</span>
                            </>
                          ) : (
                            <>
                              Payment Total: Rs. {(() => {
                                const total = calculatePaymentModeTotal();
                                return total % 1 === 0 ? total.toString() : total.toFixed(2);
                              })()} <span className="ml-1">✓ Balanced</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Upload Section */}
              <section className="p-5 border border-gray-200 rounded-md shadow-sm bg-white">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Upload Attachments</h2>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={openQRModal}
                      className="w-full sm:w-auto px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 flex items-center justify-center gap-2 text-sm font-medium shadow-sm transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      QR Upload
                    </button>
                    <button
                      type="button"
                      onClick={addAttachment}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors"
                    >
                      + Add Custom Field
                    </button>
                  </div>
                </div>

                {/* QR Upload Status */}
                {qrUploads.length > 0 && (
                  <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-700 font-medium mb-3">
                      <Smartphone className="w-4 h-4" />
                      QR Code Uploads ({qrUploads.length} file{qrUploads.length !== 1 ? 's' : ''})
                    </div>
                    <div className="space-y-2">
                      {qrUploads.map((upload, index) => (
                        <div key={upload._id || index} className="flex items-center gap-3 p-2 bg-white rounded border border-purple-200">
                          <div className="flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {upload.filename || `File ${index + 1}`}
                            </p>
                            {upload.fieldType && (
                              <div>
                                <p className="text-xs text-purple-600">
                                  {upload.fieldType}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(upload.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            )}
                          </div>
                          {upload.uploadedAt && (
                            <div className="text-xs text-gray-400">
                              {new Date(upload.uploadedAt).toLocaleTimeString()}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeQRUpload(index)}
                            className="flex-shrink-0 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Remove this file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-purple-600 mt-3 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>These files will be automatically attached to this invoice</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {["Customer ID", "Payment Slip", "Inventory Image", "Google Review"].map(label => {
                    const fileKey = label as keyof FilesState;
                    // Check if this field has QR uploads
                    const normalize = (s: string) => (s || "").trim().toLowerCase();

                    const qrFilesForField = qrUploads.filter(upload =>
                      normalize(upload.fieldType) === normalize(label)
                    );

                    const hasManualUpload = files[fileKey];

                    return (
                      <div key={label} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <span className="text-base font-semibold text-gray-700 sm:w-40 flex-shrink-0">{label}:</span>
                          {!hasManualUpload ? (
                            <Label className="cursor-pointer text-blue-500 hover:text-blue-600 flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16v4h10v-4M12 12v8m0-8l-4 4m4-4l4 4M12 3v9" />
                              </svg>
                              <span>Upload from Computer</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => handleFileChange(e, label)}
                              />
                            </Label>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-green-600">✓ {files[fileKey] as string}</span>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => removeFile(label)}
                                className="text-sm px-2 py-1"
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Show QR uploads for this field */}
                        {qrFilesForField.length > 0 && (
                          <div className="ml-0 sm:ml-44 space-y-1 mt-2">
                            {qrFilesForField.map((upload, idx) => {
                              // Find the index in the main qrUploads array by matching upload properties
                              const uploadIndex = qrUploads.findIndex((u) =>
                                (u._id && upload._id && u._id === upload._id) ||
                                (u.filename === upload.filename &&
                                  u.fieldType === upload.fieldType &&
                                  u.uploadedAt === upload.uploadedAt)
                              );
                              const filename = upload.filename || `QR Upload ${idx + 1}`;
                              const displayName = filename.length > 30 ? `${filename.substring(0, 30)}...` : filename;
                              return (
                                <div key={upload._id || idx} className="text-xs p-2 bg-purple-50 rounded border border-purple-200">
                                  {/* Desktop layout - inline */}
                                  <div className="hidden sm:flex sm:items-center gap-2">
                                    <Smartphone className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                    <span className="text-purple-700 font-medium truncate flex-1" title={filename}>
                                      {displayName}
                                    </span>
                                    <span className="text-purple-600 text-xs">
                                      {upload.size ? `${(upload.size / 1024).toFixed(1)} KB` : ''}
                                    </span>
                                    {uploadIndex >= 0 && (
                                      <button
                                        type="button"
                                        onClick={() => removeQRUpload(uploadIndex)}
                                        className="flex-shrink-0 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Remove this file"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Mobile layout - stacked */}
                                  <div className="sm:hidden">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Smartphone className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                      <span className="text-purple-700 font-medium break-all flex-1 leading-tight" title={filename}>
                                        {displayName}
                                      </span>
                                      <span className="text-purple-600 text-xs">
                                        {upload.size ? `${(upload.size / 1024).toFixed(1)} KB` : ''}
                                      </span>
                                    </div>
                                    {uploadIndex >= 0 && (
                                      <button
                                        type="button"
                                        onClick={() => removeQRUpload(uploadIndex)}
                                        className="w-full text-red-500 hover:text-red-700 text-sm py-1 hover:bg-red-50 transition-colors"
                                        title="Remove this file"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {customAttachments.map((attachment) => {
                    const attachmentFile = files[attachment.name];
                    return (
                      <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                        <span className="text-base font-semibold text-gray-700 w-40">{attachment.name}:</span>
                        {!attachmentFile ? (
                          <label className="cursor-pointer text-blue-500 hover:text-blue-600 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span>Upload</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileChange(e, attachment.name)}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-600">✓ {attachmentFile}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(attachment.name)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id, attachment.name)}
                          className="text-sm text-red-600 hover:text-red-800 ml-2"
                        >
                          Delete Field
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Referral Source */}
              <section className="p-5 border border-gray-200 rounded-md shadow-sm bg-white">
                <h2 className="text-base font-semibold mb-4 text-gray-900">Where did you hear about us?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1">Referral Source</Label>
                    <Select 
                      value={formData.referralSource || ''} 
                      onValueChange={(v) => {
                        setFormData({ 
                          ...formData, 
                          referralSource: v,
                          referralSourceOther: v === 'Any other' ? formData.referralSourceOther : ''
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select referral source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Social Media Platform">Social Media Platform</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="Friends/Family">Friends/Family</SelectItem>
                        <SelectItem value="Old Customer">Old Customer</SelectItem>
                        <SelectItem value="Any other">Any other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.referralSource === 'Any other' && (
                    <div>
                      <Label className="mb-1">Please specify</Label>
                      <Input
                        placeholder="Please specify other source"
                        value={formData.referralSourceOther || ''}
                        onChange={(e) => setFormData({ ...formData, referralSourceOther: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Submit */}
              <div className="flex justify-center px-4 sm:px-0">
                <Button
                  type="button"
                  onClick={() => {
                    logger.log('Submit button clicked at:', new Date().toISOString());
                    handleSubmit();
                  }}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 text-white font-semibold text-sm sm:text-base"
                >
                  {loading ? 'Creating Invoice...' : 'Submit Invoice'}
                </Button>
              </div>
            </div>
            </>
            )}
          </div>
        </div>

        {/* Custom Field Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Add Custom Attachment Field</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Field Name *</label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="Enter field name"
                  className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={cancelModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddField}
                  disabled={!fieldName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )}

        <Dialog open={showLedgerModal} onOpenChange={(open) => {
          if (!open) {
            setShowLedgerModal(false);
            setLedgerData({ name: '', phone: '', email: '', address: '', pincode: '', gstNo: '', panCard: '', state: '', country: '' });
            setHasGST('no');
          }
        }}>
          <DialogContent className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Ledger</DialogTitle>
              <DialogDescription>Enter the details for the new ledger.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createLedger(); }} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Do you have GST?</Label>
                <div className="flex gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="hasGST" value="yes" checked={hasGST === "yes"} onChange={(e) => { setHasGST(e.target.value); setLedgerData({ name: '', phone: '', email: '', address: '', pincode: '', gstNo: '', panCard: '', state: '', country: '' }); }} className="w-4 h-4 text-green-600 focus:ring-green-500 focus:ring-2" />
                    <span className="ml-2">Yes</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="hasGST" value="no" checked={hasGST === "no"} onChange={(e) => { setHasGST(e.target.value); setLedgerData(prev => ({ ...prev, gstNo: '', name: '', panCard: '', address: '', pincode: '' })); }} className="w-4 h-4 text-green-600 focus:ring-green-500 focus:ring-2" />
                    <span className="ml-2">No</span>
                  </label>
                </div>
              </div>
              {hasGST === "yes" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="gstNo">GST No {ledgerGstVerifying && <span className="text-xs text-green-600">Verifying...</span>}</Label>
                    <div className="relative">
                      <Input id="gstNo" value={ledgerData.gstNo} onChange={(e) => { const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); setLedgerData({ ...ledgerData, gstNo: value }); if (value === '') setLedgerData(prev => ({ ...prev, name: '', panCard: '', address: '', pincode: '' })); }} onBlur={(e) => { const value = e.target.value.trim(); if (value.length === 15) verifyLedgerGST(value); }} maxLength={15} placeholder="Enter 15-digit GST number" disabled={ledgerGstVerifying} />
                      {ledgerGstVerifying && <div className="absolute right-3 top-1/2 transform -translate-y-1/2"><svg className="animate-spin h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>}
                    </div>
                    <p className="text-xs text-gray-500">Auto-fills name, PAN card, address, and pincode on verification</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="panCard">PAN Card</Label>
                    <Input id="panCard" value={ledgerData.panCard} onChange={(e) => setLedgerData({ ...ledgerData, panCard: e.target.value })} placeholder="Enter PAN card number" />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={ledgerData.name} onChange={(e) => setLedgerData({ ...ledgerData, name: e.target.value })} placeholder="Enter name" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone No</Label>
                  <Input id="phone" type="tel" value={ledgerData.phone} onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 10); setLedgerData({ ...ledgerData, phone: digits }); if (digits === '' || /^\d{10}$/.test(digits)) setLedgerPhoneError(''); else setLedgerPhoneError('Phone number must be 10 digits'); }} placeholder="Enter phone number" className={ledgerPhoneError ? 'border-red-500' : ''} />
                  {ledgerPhoneError && <p className="text-red-500 text-xs">{ledgerPhoneError}</p>}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email ID</Label>
                <Input id="email" type="email" value={ledgerData.email} onChange={(e) => { const v = e.target.value; setLedgerData({ ...ledgerData, email: v }); if (v === '' || /\S+@\S+\.\S+/.test(v)) setLedgerEmailError(''); else setLedgerEmailError('Email must contain "@" and "."'); }} placeholder="Enter email address" className={ledgerEmailError ? 'border-red-500' : ''} />
                {ledgerEmailError && <p className="text-red-500 text-xs">{ledgerEmailError}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={ledgerData.address} onChange={(e) => setLedgerData({ ...ledgerData, address: e.target.value })} placeholder="Enter address" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" value={ledgerData.pincode} onChange={(e) => setLedgerData({ ...ledgerData, pincode: e.target.value })} placeholder="Enter pincode" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={ledgerData.state} onChange={(e) => setLedgerData({ ...ledgerData, state: e.target.value })} placeholder="Enter state" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={ledgerData.country} onChange={(e) => setLedgerData({ ...ledgerData, country: e.target.value })} placeholder="Enter country" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowLedgerModal(false)}>Cancel</Button>
                <Button type="submit" disabled={!ledgerData.name.trim() || Boolean(ledgerPhoneError) || Boolean(ledgerEmailError)}>Create Ledger</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={showProductModal} onOpenChange={(open) => {
          if (!open) {
            setShowProductModal(false);
            setProductData({ name: "", model: "", serialNumber: "", checkCode: "", price: "", claimCode: "", timePeriod: "", cnToPartner: "", category: "" });
          }
        }}>
          <DialogContent className="w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Enter the details for the new product.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createProduct(); }} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="productName">Product Name *</Label>
                  <Input id="productName" placeholder="Enter product name" value={productData.name} onChange={e => setProductData({ ...productData, name: e.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" placeholder="Enter model" value={productData.model} onChange={e => setProductData({ ...productData, model: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={productData.category} onValueChange={value => setProductData({ ...productData, category: value })} required>
                  <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="aio">AIO (All-in-One)</SelectItem>
                    <SelectItem value="accessory">Accessory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input id="serialNumber" placeholder="Enter serial number" value={productData.serialNumber} onChange={e => setProductData({ ...productData, serialNumber: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="checkCode">Check Code</Label>
                  <Input id="checkCode" placeholder="Enter check code" value={productData.checkCode} onChange={e => setProductData({ ...productData, checkCode: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input id="price" type="number" placeholder="Enter price" value={productData.price} onChange={e => setProductData({ ...productData, price: e.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="claimCode">Claim Code</Label>
                  <Input id="claimCode" placeholder="Enter claim code" value={productData.claimCode} onChange={e => setProductData({ ...productData, claimCode: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="timePeriod">Time Period</Label>
                  <Input id="timePeriod" placeholder="Enter time period" value={productData.timePeriod} onChange={e => setProductData({ ...productData, timePeriod: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cnToPartner">CN To Partner</Label>
                  <Input id="cnToPartner" type="number" placeholder="Enter CN to partner" value={productData.cnToPartner as any} onChange={e => setProductData({ ...productData, cnToPartner: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowProductModal(false)}>Cancel</Button>
                <Button type="submit" disabled={!productData.name.trim() || !productData.price.trim() || !productData.category}>Create Product</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>


        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-6 h-6" />
                    <h3 className="text-xl font-bold">QR Code Upload</h3>
                  </div>
                  <button
                    onClick={closeQRModal}
                    className="text-white hover:text-gray-200 p-1 rounded transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-600 mb-2">Scan this QR code with your mobile device</div>
                    <div className="bg-white p-4 rounded border-2 border-dashed border-gray-300">
                      <div className="flex items-center justify-center mx-auto">
                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="QR Code for mobile upload"
                            className="w-64 h-64 mx-auto"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-64 h-64 bg-white border-2 border-gray-300 rounded-lg relative">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Mobile Upload QR Code</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                      <Camera className="w-4 h-4" />
                      How it works:
                    </div>
                    <div className="text-sm text-blue-600 space-y-1 text-left">
                      <p>1. Scan the QR code with your phone's camera</p>
                      <p>2. You'll be redirected to a mobile-friendly upload page</p>
                      <p>3. Take photos or select images to upload</p>
                      <p>4. Images are automatically attached to this invoice</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    <p>Upload session: <span className="font-mono">{sessionId}</span></p>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={closeQRModal}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Copy upload URL to clipboard
                      const uploadUrl = `${window.location.origin}/qr-upload/${sessionId}`;
                      navigator.clipboard.writeText(uploadUrl);
                      toast({
                        title: "Link copied!",
                        description: "Upload link copied to clipboard",
                      });
                    }}
                    className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium transition-all flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Copy Link
                  </button>
                </div>

                {qrUploads.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      ✓ {qrUploads.length} image{qrUploads.length > 1 ? 's' : ''} uploaded successfully!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ledger List Modal */}
        <Dialog open={showLedgerListModal} onOpenChange={setShowLedgerListModal}>
          <DialogContent className="max-w-7xl max-h-[85vh] overflow-hidden flex flex-col rounded-sm">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-xl font-semibold text-gray-900">All Ledgers</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">View and manage all customer ledgers</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-3 items-end py-3 border-b bg-gray-50 px-4 -mx-6">
              <div className="flex-1 min-w-[140px]">
                <Label htmlFor="ledger-from" className="text-xs font-medium text-gray-600 mb-1">From Date</Label>
                <Input id="ledger-from" type="date" value={ledgerFilterFrom || ''} onChange={e => setLedgerFilterFrom(e.target.value)} className="h-9" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <Label htmlFor="ledger-to" className="text-xs font-medium text-gray-600 mb-1">To Date</Label>
                <Input id="ledger-to" type="date" value={ledgerFilterTo || ''} onChange={e => setLedgerFilterTo(e.target.value)} className="h-9" />
              </div>
              <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => { const XLSX = require('xlsx'); const filtered = ledgers.filter(l => { if (!ledgerFilterFrom && !ledgerFilterTo) return true; const date = l.createdAt ? new Date(l.createdAt) : null; if (!date) return false; if (ledgerFilterFrom && date < new Date(ledgerFilterFrom)) return false; if (ledgerFilterTo && date > new Date(ledgerFilterTo + 'T23:59:59')) return false; return true; }); const excelData = filtered.map(ledger => ({ 'Name': `${ledger.name}${ledger.phone ? ' ' + ledger.phone : ''}`, 'Phone No': ledger.phone || '', 'E-mail': ledger.email || '', 'GST Registration - Assesssee of Other Territory': ledger.gstNo || '', 'PAN/IT No.': ledger.panCard || '', 'Address': ledger.address || '', 'State': ledger.state || '', 'Country': ledger.country || '', 'Pincode': ledger.pincode || '', 'Group Name': 'Sundry Debtors' })); const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Filtered Ledgers'); XLSX.writeFile(wb, `filtered_ledgers_${new Date().toISOString().split('T')[0]}.xlsx`); }} disabled={ledgers.length === 0}><Download className="w-3.5 h-3.5 mr-1.5" /> Filtered</Button>
            </div>
            <div className="flex-1 overflow-auto">{ledgers.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><p className="text-base font-semibold text-gray-900">No ledgers found</p><p className="text-sm text-gray-500 mt-1">Create your first ledger to see it here</p></div>) : (<Table><TableHeader><TableRow className="bg-gray-50 border-b"><TableHead className="text-xs font-semibold text-gray-600">Date</TableHead><TableHead className="text-xs font-semibold text-gray-600">Name</TableHead><TableHead className="text-xs font-semibold text-gray-600">Phone</TableHead><TableHead className="text-xs font-semibold text-gray-600">Email</TableHead><TableHead className="text-xs font-semibold text-gray-600">Address</TableHead><TableHead className="text-xs font-semibold text-gray-600">Pincode</TableHead><TableHead className="text-xs font-semibold text-gray-600">GST No</TableHead><TableHead className="text-xs font-semibold text-gray-600">PAN Card</TableHead><TableHead className="text-xs font-semibold text-gray-600">State</TableHead><TableHead className="text-xs font-semibold text-gray-600">Country</TableHead><TableHead className="text-xs font-semibold text-gray-600 text-center">Actions</TableHead></TableRow></TableHeader><TableBody>{ledgers.filter(l => { if (!ledgerFilterFrom && !ledgerFilterTo) return true; const date = l.createdAt ? new Date(l.createdAt) : null; if (!date) return false; if (ledgerFilterFrom && date < new Date(ledgerFilterFrom)) return false; if (ledgerFilterTo && date > new Date(ledgerFilterTo + 'T23:59:59')) return false; return true; }).map((ledger, index) => (<TableRow key={index} className="hover:bg-gray-50 border-b"><TableCell className="text-sm whitespace-nowrap text-gray-700">{ledger.createdAt ? new Date(ledger.createdAt).toLocaleDateString('en-GB') : '-'}</TableCell><TableCell className="text-sm font-medium text-gray-900">{ledger.name}</TableCell><TableCell className="text-sm text-gray-700">{ledger.phone || '-'}</TableCell><TableCell className="text-sm text-gray-700">{ledger.email || '-'}</TableCell><TableCell className="text-sm text-gray-700 max-w-[200px] truncate" title={ledger.address}>{ledger.address || '-'}</TableCell><TableCell className="text-sm text-gray-700">{ledger.pincode || '-'}</TableCell><TableCell className="text-sm text-gray-700 font-mono">{ledger.gstNo || '-'}</TableCell><TableCell className="text-sm text-gray-700 font-mono">{ledger.panCard || '-'}</TableCell><TableCell className="text-sm text-gray-700">{ledger.state || '-'}</TableCell><TableCell className="text-sm text-gray-700">{ledger.country || '-'}</TableCell><TableCell className="text-center"><Button size="sm" variant="outline" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 h-7 text-xs" onClick={() => { const XLSX = require('xlsx'); const excelData = [{ 'Name': `${ledger.name}${ledger.phone ? ' ' + ledger.phone : ''}`, 'Phone No': ledger.phone || '', 'E-mail': ledger.email || '', 'GST Registration - Assesssee of Other Territory': ledger.gstNo || '', 'PAN/IT No.': ledger.panCard || '', 'Address': ledger.address || '', 'State': ledger.state || '', 'Country': ledger.country || '', 'Pincode': ledger.pincode || '', 'Group Name': 'Sundry Debtors' }]; const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Ledger'); XLSX.writeFile(wb, `ledger_${ledger.name.replace(/\s+/g, '_')}.xlsx`); }}><Download className="w-3 h-3 mr-1" /> Excel</Button></TableCell></TableRow>))}</TableBody></Table>)}</div>
            <div className="flex items-center justify-between pt-3 border-t bg-gray-50 -mx-6 px-6 -mb-6 pb-6"><div className="text-sm text-gray-600">Total: <span className="font-semibold text-gray-900">{ledgers.length}</span> ledger{ledgers.length !== 1 ? 's' : ''}</div><div className="flex gap-2">{ledgers.length > 0 && (<Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { const XLSX = require('xlsx'); const excelData = ledgers.map(ledger => ({ 'Name': `${ledger.name}${ledger.phone ? ' ' + ledger.phone : ''}`, 'Phone No': ledger.phone || '', 'E-mail': ledger.email || '', 'GST Registration - Assesssee of Other Territory': ledger.gstNo || '', 'PAN/IT No.': ledger.panCard || '', 'Address': ledger.address || '', 'State': ledger.state || '', 'Country': ledger.country || '', 'Pincode': ledger.pincode || '', 'Group Name': 'Sundry Debtors' })); const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'All Ledgers'); XLSX.writeFile(wb, `all_ledgers_${new Date().toISOString().split('T')[0]}.xlsx`); }}><Download className="w-3.5 h-3.5 mr-1.5" /> Download All</Button>)}<Button variant="outline" size="sm" onClick={() => setShowLedgerListModal(false)}>Close</Button></div></div>
          </DialogContent>
        </Dialog>

        {/* External Scanner Modal for Serial Number */}
        {showSerialScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Scan className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Scan Serial Number</h3>
                  </div>
                  <button
                    onClick={closeExternalScanner}
                    className="text-white hover:text-gray-200 p-1 rounded transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Scanner Input Field */}
                <div className="mb-4">
                  <Label className="mb-2 text-sm font-medium text-gray-700">Serial Number</Label>
                  <Input
                    ref={scannerInputRef}
                    type="text"
                    placeholder="Scan or enter serial number..."
                    value={scannedValue}
                    onChange={(e) => setScannedValue(e.target.value)}
                    onKeyPress={handleScannerKeyPress}
                    className="text-lg font-mono"
                    autoFocus
                  />
                </div>

                {/* Instructions */}
                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Scan className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-purple-900 mb-2">Ready to Scan</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Use your external barcode/QR scanner</li>
                        <li>• Scan the code - it will auto-fill the field</li>
                        <li>• Press Enter or click Apply to confirm</li>
                        <li>• Or type manually and press Enter</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    onClick={closeExternalScanner}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleScannerInput(scannedValue)}
                    disabled={!scannedValue.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* External Scanner Modal for CHECK Code */}
        {showCheckCodeScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Scan className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Scan CHECK Code</h3>
                  </div>
                  <button
                    onClick={closeExternalScanner}
                    className="text-white hover:text-gray-200 p-1 rounded transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Scanner Input Field */}
                <div className="mb-4">
                  <Label className="mb-2 text-sm font-medium text-gray-700">CHECK Code</Label>
                  <Input
                    ref={scannerInputRef}
                    type="text"
                    placeholder="Scan or enter CHECK code..."
                    value={scannedValue}
                    onChange={(e) => setScannedValue(e.target.value)}
                    onKeyPress={handleScannerKeyPress}
                    className="text-lg font-mono"
                    autoFocus
                  />
                </div>

                {/* Instructions */}
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Scan className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">Ready to Scan</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Use your external barcode/QR scanner</li>
                        <li>• Scan the code - it will auto-fill the field</li>
                        <li>• Press Enter or click Apply to confirm</li>
                        <li>• Or type manually and press Enter</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    onClick={closeExternalScanner}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleScannerInput(scannedValue)}
                    disabled={!scannedValue.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* External Scanner Modal for Model */}
        {showModelScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Scan className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Scan Model</h3>
                  </div>
                  <button
                    onClick={closeExternalScanner}
                    className="text-white hover:text-gray-200 p-1 rounded transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Scanner Input Field */}
                <div className="mb-4">
                  <Label className="mb-2 text-sm font-medium text-gray-700">Model</Label>
                  <Input
                    ref={scannerInputRef}
                    type="text"
                    placeholder="Scan or enter model..."
                    value={scannedValue}
                    onChange={(e) => setScannedValue(e.target.value)}
                    onKeyPress={handleScannerKeyPress}
                    className="text-lg font-mono"
                    autoFocus
                  />
                </div>

                {/* Instructions */}
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Scan className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-green-900 mb-2">Ready to Scan</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Use your external barcode/QR scanner</li>
                        <li>• Scan the code - it will auto-fill the field</li>
                        <li>• Press Enter or click Apply to confirm</li>
                        <li>• Or type manually and press Enter</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    onClick={closeExternalScanner}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleScannerInput(scannedValue)}
                    disabled={!scannedValue.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </AdminLayout>
  );
}


