import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';

export function useInvoiceForm() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [matchingLedgers, setMatchingLedgers] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [gstVerifying, setGstVerifying] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [sessionId, setSessionId] = useState('');
  const [qrUploads, setQrUploads] = useState<any[]>([]);

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
          pinCode: ledger.pincode || prev.pinCode
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
    toast,
    router
  };
}
