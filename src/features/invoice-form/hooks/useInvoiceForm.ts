import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';

export interface Product {
  id: number;
  name: string;
  model: string;
  serialNumber: string;
  checkCode: string;
  price: string;
  type?: string;
  apiProductId?: string;
  claimCode?: string;
  timePeriod?: string;
  cnToPartner?: string | number;
  supportedAmount?: number;
}

export interface ApiProduct {
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

const sanitizeForLog = (input: any): any => {
  if (typeof input === 'string') {
    return input.replace(/[\r\n]/g, ' ').substring(0, 200);
  }
  return input;
};

// Simple logger fallback
const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') console.log(...args);
  },
  error: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') console.error(...args);
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') console.warn(...args);
  }
};

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

export function useInvoiceForm() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [matchingLedgers, setMatchingLedgers] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [gstVerifying, setGstVerifying] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [sessionId, setSessionId] = useState('');
  const [qrUploads, setQrUploads] = useState<any[]>([]);

  // Form fields state
  const [formData, setFormData] = useState({
    companyName: '',
    branch: '',
    salesPerson: '',
    date: new Date().toISOString().split('T')[0],
    salesType: 'Retail',
    customerName: '',
    address: '',
    pinCode: '',
    contactPerson: '',
    mobile: '',
    phone: '',
    email: '',
    gstNumber: '',
    referralSource: '',
    referralSourceOther: '',
    paymentMode: [] as any[],
    totalAmount: '',
    _accessoryDiscount: 0,
    _paymentModes: {
      Cash: { selected: false, amount: '' },
      Bank: { selected: false, amount: '', bankType: '', utrNumber: '', chequeNumber: '' },
      UPI: { selected: false, amount: '', upiProvider: 'PhonePe', upiTransactionId: '' },
      Machine: { selected: false, amount: '', machineProvider: '', machineCardType: '', machineCardLast4Digits: '', machineIdProofType: '', machineIdProofNumber: '', machineTransactionId: '' },
      'Bajaj Finance': { selected: false, amount: '', loanAmount: '', loanId: '' },
      'Brand Order': { selected: false, amount: '', brandOrderType: '' }
    }
  });

  // Active products list state (being invoiced)
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

  // Product Autocompletion and Filtering Maps
  const [filteredProductsMap, setFilteredProductsMap] = useState<Record<number, ApiProduct[]>>({});
  const [searchResultsMap, setSearchResultsMap] = useState<Record<number, ApiProduct[]>>({});
  const [productSearchInputMap, setProductSearchInputMap] = useState<Record<number, string>>({});

  // Scanner Modal states
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [showCheckCodeScanner, setShowCheckCodeScanner] = useState(false);
  const [showModelScanner, setShowModelScanner] = useState(false);
  const [scanningProductId, setScanningProductId] = useState<number | null>(null);
  const [scannedValue, setScannedValue] = useState<string>("");
  const [scannerType, setScannerType] = useState<'serial' | 'checkCode' | 'model'>('serial');

  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/branches`, { credentials: 'include' });
      if (response.status === 401) {
        router.push('/');
        return;
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, [router]);

  const fetchSalesPersons = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/salespersons/`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.status === 401) {
        router.push('/');
        return;
      }
      const data = await res.json();
      if (data?.salesPersons) setSalesPersons(data.salesPersons);
    } catch (err) {
      console.error('Error fetching salespersons:', err);
    }
  }, [router]);

  const fetchAvailableProducts = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/products/`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status === 401) {
        router.push('/');
        return;
      }
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.products) {
          const allProducts = [
            ...(result.products.laptops || []).map((p: any) => ({ ...p, category: 'Laptop' })),
            ...(result.products.desktops || []).map((p: any) => ({ ...p, category: 'Desktop' })),
            ...(result.products.aios || []).map((p: any) => ({ ...p, category: 'AIO' })),
            ...(result.products.accessories || []).map((p: any) => ({ ...p, category: 'Accessory' }))
          ];
          setAvailableProducts(allProducts);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [router]);

  const fetchLedgers = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/ledgers/all`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.status === 401) {
        router.push('/');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setLedgers(data);
        } else if (data.ledgers && Array.isArray(data.ledgers)) {
          setLedgers(data.ledgers);
        } else if (data.data && Array.isArray(data.data)) {
          setLedgers(data.data);
        } else {
          setLedgers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      setLedgers([]);
    }
  }, [router]);

  const verifyGST = useCallback(async (gstNumber: string) => {
    if (!gstNumber || gstNumber.length !== 15) return;
    setGstVerifying(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/gst/verify/${gstNumber}`);
      const result = await response.json();
      if (result.success) {
        const apiData = result.data?.raw?.data || result.data;
        const { legalName, tradeName, pincode, adr } = apiData;
        setFormData(prev => ({
          ...prev,
          customerName: legalName || tradeName || prev.customerName,
          pinCode: pincode || prev.pinCode,
          address: adr || prev.address
        }));
        toast({ title: 'GST Verified', description: 'Company details fetched successfully!' });
      }
    } catch (error) {
      console.error('Error verifying GST:', error);
    } finally {
      setGstVerifying(false);
    }
  }, [toast]);

  const validateEmail = useCallback((email: string) => {
    if (!email) {
      setEmailError('');
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address (must contain @ and .)');
      return false;
    }
    setEmailError('');
    return true;
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchBranches(), fetchSalesPersons()]);
      toast({ title: 'Refreshed', description: 'Branches and sales persons updated successfully!' });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({ variant: 'destructive', title: 'Refresh Failed', description: 'Could not refresh data. Please try again.' });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchBranches, fetchSalesPersons, toast]);

  // Product CRUD handlers
  const addProduct = useCallback(() => {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    setProducts(prev => [...prev, {
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
  }, [products]);

  const deleteProduct = useCallback((id: number) => {
    if (products.length > 1) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  }, [products]);

  const updateProduct = useCallback(async (id: number, field: keyof Product, value: string) => {
    logger.log('Updating product:', { id, field, value: sanitizeForLog(value) });

    if (field === 'name' && value.startsWith('API_')) {
      const productId = value.replace('API_', '');
      try {
        const res = await fetch(`${getApiUrl()}/api/products/${productId}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.status === 401) {
          router.push("/");
          return;
        }

        if (res.ok) {
          const selectedProduct = await res.json();
          setProducts(prev => prev.map(p =>
            p.id === id
              ? {
                ...p,
                name: selectedProduct.model || selectedProduct.name || '',
                model: selectedProduct.model || '',
                price: (selectedProduct.supportedAmount ?? selectedProduct.srp ?? selectedProduct.price ?? '').toString(),
                claimCode: selectedProduct.claimCode ?? '',
                timePeriod: selectedProduct.programPeriod ?? '',
                cnToPartner: selectedProduct.cnToPartner ?? '',
                type: selectedProduct.category || p.type || '',
                apiProductId: selectedProduct._id
              }
              : p
          ));
          return;
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        const selectedProduct = availableProducts.find(p => p._id === productId);
        if (selectedProduct) {
          setProducts(prev => prev.map(p =>
            p.id === id
              ? {
                ...p,
                name: selectedProduct.model || selectedProduct.name || '',
                model: selectedProduct.model || '',
                price: (selectedProduct.supportedAmount ?? selectedProduct.srp ?? selectedProduct.price ?? '').toString(),
                claimCode: (selectedProduct as any).claimCode ?? '',
                timePeriod: (selectedProduct as any).timePeriod ?? '',
                cnToPartner: (selectedProduct as any).cnToPartner ?? '',
                type: (selectedProduct as any).type || (selectedProduct as any).category || p.type || '',
                apiProductId: selectedProduct._id
              }
              : p
          ));
          return;
        }
      }
    }

    if (field === 'name' && (value === '' || value === 'LAPTOP')) {
      setProducts(prev => prev.map(p =>
        p.id === id
          ? {
            ...p,
            name: value,
            model: '',
            serialNumber: '',
            checkCode: '',
            price: '',
            apiProductId: undefined
          }
          : p
      ));
      return;
    }

    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }, [availableProducts, router]);

  const fetchProductsByCategory = useCallback(async (productIdNum: number, category?: string) => {
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
          const catLower = (category || '').toString().toLowerCase();
          list = availableProducts.filter(ap => ((ap as any).category || (ap as any).type || '').toString().toLowerCase() === catLower);
        }

        setSearchResultsMap(prev => ({ ...prev, [productIdNum]: list }));
        setFilteredProductsMap(prev => ({ ...prev, [productIdNum]: list }));
        return list;
      }
    } catch (err) {
      console.error('Error fetching products by category:', err);
    }

    const catLower = (category || '').toString().toLowerCase();
    const fallbackList = availableProducts.filter(ap => ((ap as any).category || (ap as any).type || '').toString().toLowerCase() === catLower);
    setSearchResultsMap(prev => ({ ...prev, [productIdNum]: fallbackList }));
    setFilteredProductsMap(prev => ({ ...prev, [productIdNum]: fallbackList }));
    return fallbackList;
  }, [availableProducts]);

  const handleCategoryChange = useCallback((productIdNum: number, category: string) => {
    setProducts(prev => prev.map(p =>
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
          apiProductId: undefined
        }
        : p
    ));

    const categoryLower = category.toLowerCase();
    const filtered = availableProducts.filter(api => {
      const apiCat = ((api as any).category || (api as any).type || '').toString().toLowerCase();
      return apiCat === categoryLower;
    });
    setFilteredProductsMap(prev => ({ ...prev, [productIdNum]: filtered }));
  }, [availableProducts]);

  const handleModelChange = useCallback(async (productIdNum: number, model: string) => {
    const product = products.find(p => p.id === productIdNum);
    if (!product) return;

    const categoryLower = ((product.type || '') as string).toLowerCase();
    const matchIn = (list?: ApiProduct[]) => (list || []).find(p => {
      const label = (p.model || p.name || '').toString();
      const apiCat = ((p.category || p.type || '') || '').toString().toLowerCase();
      return label === model && apiCat === categoryLower;
    });

    let selectedProduct = matchIn(searchResultsMap[productIdNum]);
    if (!selectedProduct) selectedProduct = matchIn(filteredProductsMap[productIdNum]);
    if (!selectedProduct) selectedProduct = matchIn(availableProducts);

    if (selectedProduct) {
      try {
        let sp: ApiProduct | undefined = selectedProduct;
        if (sp._id) {
          const response = await fetch(`${getApiUrl()}/api/products/${sp._id}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.status === 401) {
            router.push("/");
            return;
          }
          if (response.ok) {
            const details = await response.json().catch(() => (sp as any));
            sp = { ...sp, ...(details || {}) } as ApiProduct;
          }
        }

        setProducts(prev => prev.map(p =>
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
        ));
      } catch (err) {
        console.error('Error handling selected model:', err);
      }
    } else {
      setProducts(prev => prev.map(p => p.id === productIdNum ? { ...p, model } : p));
    }
  }, [products, searchResultsMap, filteredProductsMap, availableProducts, router]);

  const searchProducts = useCallback((productIdNum: number, query: string) => {
    setProductSearchInputMap(prev => ({ ...prev, [productIdNum]: query }));
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

  // Scanner Actions
  const openExternalScanner = useCallback((productId: number, type: 'serial' | 'checkCode' | 'model' = 'serial') => {
    setScanningProductId(productId);
    setScannerType(type);
    if (type === 'serial') {
      setShowSerialScanner(true);
    } else if (type === 'checkCode') {
      setShowCheckCodeScanner(true);
    } else {
      const prod = products.find(p => p.id === productId);
      if (prod && prod.type) {
        fetchProductsByCategory(productId, prod.type).catch(err => console.error(err));
      }
      setShowModelScanner(true);
    }
    setScannedValue("");
  }, [products, fetchProductsByCategory]);

  const closeExternalScanner = useCallback(() => {
    setShowSerialScanner(false);
    setShowCheckCodeScanner(false);
    setShowModelScanner(false);
    setScanningProductId(null);
    setScannedValue("");
  }, []);

  const handleScannerInput = useCallback(async (value: string) => {
    if (scanningProductId !== null && value.trim()) {
      const scanned = value.trim();
      if (scannerType === 'serial') {
        updateProduct(scanningProductId, 'serialNumber', scanned);
        toast({ title: "Serial Number Scanned!", description: `Serial number: ${scanned}` });
      } else if (scannerType === 'checkCode') {
        updateProduct(scanningProductId, 'checkCode', scanned);
        toast({ title: "CHECK Code Scanned!", description: `CHECK Code: ${scanned}` });
      } else {
        const prod = products.find(p => p.id === scanningProductId);
        if (prod && prod.type) {
          try {
            await fetchProductsByCategory(scanningProductId, prod.type);
          } catch (err) {
            console.error('Failed to fetch models for validation', err);
          }
        }
        updateProduct(scanningProductId, 'model', scanned);
        setProductSearchInputMap(prev => ({ ...prev, [scanningProductId]: scanned }));
        toast({ title: "Model Scanned", description: `Model: ${scanned}` });
      }
      closeExternalScanner();
    }
  }, [scanningProductId, scannerType, products, updateProduct, fetchProductsByCategory, closeExternalScanner, toast]);

  const handleScannerKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScannerInput(scannedValue);
    }
  }, [scannedValue, handleScannerInput]);

  useEffect(() => {
    fetchBranches();
    fetchSalesPersons();
    fetchAvailableProducts();
    fetchLedgers();
    
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
  }, [fetchBranches, fetchSalesPersons, fetchAvailableProducts, fetchLedgers]);

  // Mobile filtering lookup
  useEffect(() => {
    const mobile = (formData.mobile || '').replace(/\D/g, '');
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
  }, [formData.mobile, ledgers]);

  return {
    loading,
    setLoading,
    formData,
    setFormData,
    products,
    setProducts,
    productSearchInputMap,
    setProductSearchInputMap,
    searchResultsMap,
    setSearchResultsMap,
    filteredProductsMap,
    setFilteredProductsMap,
    branches,
    salesPersons,
    availableProducts,
    ledgers,
    matchingLedgers,
    selectedLedgerId,
    setSelectedLedgerId,
    refreshing,
    gstVerifying,
    emailError,
    sessionId,
    qrUploads,
    setQrUploads,
    verifyGST,
    validateEmail,
    handleRefresh,
    fetchAvailableProducts,
    addProduct,
    deleteProduct,
    updateProduct,
    searchProducts,
    handleCategoryChange,
    handleModelChange,
    fetchProductsByCategory,
    // Scanners
    showSerialScanner,
    showCheckCodeScanner,
    showModelScanner,
    scannedValue,
    setScannedValue,
    scannerType,
    openExternalScanner,
    closeExternalScanner,
    handleScannerInput,
    handleScannerKeyPress,
    toast,
    router
  };
}
