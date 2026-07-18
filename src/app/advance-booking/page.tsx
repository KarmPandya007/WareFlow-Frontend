"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Plus, Eye, X, Scan, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { getApiUrl } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function AdvanceBookingPage() {
  const [showForm, setShowForm] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  const resetForm = () => {
    setFormData({
      companyName: "", branch: "", salesPerson: "", date: new Date().toISOString().split('T')[0],
      salesType: "Retail", customerName: "", address: "", pinCode: "", contactPerson: "", mobile: "", phone: "", email: "", gstNumber: "",
      referralSource: "", referralSourceOther: "", products: [{ category: '', model: '', serialNumber: '', _id: '' }], totalAmount: "", advanceAmount: "", deliveryDate: "",
      deliveryAddress: "", notes: "", paymentMode: [],
      _paymentModes: { Cash: { selected: false, amount: "" }, Bank: { selected: false, amount: "", bankType: "", utrNumber: "", chequeNumber: "" }, UPI: { selected: false, amount: "", upiProvider: "PhonePe", upiTransactionId: "" }, Machine: { selected: false, amount: "", machineProvider: "", machineCardType: "", machineCardLast4Digits: "", machineIdProofType: "", machineIdProofNumber: "", machineTransactionId: "" }, "Bajaj Finance": { selected: false, amount: "", loanAmount: "", loanId: "" }, "Brand Order": { selected: false, amount: "", brandOrderType: "" } }
    });
    setMatchingLedgers([]);
    setSelectedLedgerId("");
  };
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const { toast } = useToast();
  const [branches, setBranches] = useState<any[]>([]);
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [filteredProductsMap, setFilteredProductsMap] = useState<Record<number, any[]>>({});
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [showCheckCodeScanner, setShowCheckCodeScanner] = useState(false);
  const [showModelScanner, setShowModelScanner] = useState(false);
  const [scanningProductId, setScanningProductId] = useState<number | null>(null);
  const [scannedValue, setScannedValue] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("");


  const [matchingLedgers, setMatchingLedgers] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>("");
  const [loading, setLoading] = useState(false);

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
    products: [{ category: '', model: '', serialNumber: '', _id: '' }] as any[],
    totalAmount: "",
    advanceAmount: "",
    deliveryDate: "",
    deliveryAddress: "",
    notes: "",
    paymentMode: [] as Array<{ mode: string; amount?: number; bankType?: string; utrNumber?: string; chequeNumber?: string; upiProvider?: string; upiTransactionId?: string; machineProvider?: string; machineCardType?: string; machineCardLast4Digits?: string; machineIdProofType?: string; machineIdProofNumber?: string; machineTransactionId?: string; loanAmount?: number; loanId?: string; brandOrderType?: string; }>,
    _paymentModes: {
      Cash: { selected: false, amount: "" },
      Bank: { selected: false, amount: "", bankType: "", utrNumber: "", chequeNumber: "" },
      UPI: { selected: false, amount: "", upiProvider: "PhonePe", upiTransactionId: "" },
      Machine: { selected: false, amount: "", machineProvider: "", machineCardType: "", machineCardLast4Digits: "", machineIdProofType: "", machineIdProofNumber: "", machineTransactionId: "" },
      "Bajaj Finance": { selected: false, amount: "", loanAmount: "", loanId: "" },
      "Brand Order": { selected: false, amount: "", brandOrderType: "" }
    }
  });

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchBookings(),
        fetchBranches(),
        fetchSalesPersons(),
        fetchAvailableProducts()
      ]);
      setIsInitialLoading(false);
    };
    loadData();
    
    // Auto-fill salesperson if user is a salesperson
    const role = localStorage.getItem('userRole')?.toLowerCase() || '';
    setUserRole(role);
    const userId = localStorage.getItem('userId');
    if (role === 'salesperson' && userId) {
      setFormData(prev => ({ ...prev, salesPerson: userId }));
    }
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/advance-bookings`, { credentials: 'include' });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/branches`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) setBranches(data.branches);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSalesPersons = async () => {
    try {
      const userRole = localStorage.getItem('userRole')?.toLowerCase();
      
      // If salesperson, don't fetch list - they can only create for themselves
      if (userRole === 'salesperson') {
        const userId = localStorage.getItem('userId');
        const userName = localStorage.getItem('userName');
        if (userId && userName) {
          setSalesPersons([{ id: userId, name: userName }]);
        }
        return;
      }
      
      // Admin can fetch all salespersons
      const res = await fetch(`${getApiUrl()}/api/salespersons/`, { credentials: 'include' });
      const data = await res.json();
      if (data?.salesPersons) setSalesPersons(data.salesPersons);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/products/`, { credentials: 'include' });
      const result = await res.json();
      if (result.success && result.products) {
        const allProducts = [
          ...(result.products.laptops || []).map((p: any) => ({ ...p, category: 'Laptop' })),
          ...(result.products.desktops || []).map((p: any) => ({ ...p, category: 'Desktop' })),
          ...(result.products.aios || []).map((p: any) => ({ ...p, category: 'AIO' })),
          ...(result.products.accessories || []).map((p: any) => ({ ...p, category: 'Accessory' }))
        ];
        setAvailableProducts(allProducts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedgers = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 3) {
      setMatchingLedgers([]);
      setSelectedLedgerId('');
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}/api/ledgers/all`, { credentials: 'include' });
      const data = await res.json();
      let allLedgers: any[] = [];
      if (data.success && Array.isArray(data.data)) {
        allLedgers = data.data;
      } else if (Array.isArray(data)) {
        allLedgers = data;
      } else if (data.ledgers && Array.isArray(data.ledgers)) {
        allLedgers = data.ledgers;
      }
      const matches = allLedgers.filter((l: any) => {
        const phone = (l.phone || '').replace(/\D/g, '');
        return phone.includes(phoneNumber);
      });
      setMatchingLedgers(matches);
      if (matches.length === 1) {
        const ledger = matches[0];
        setSelectedLedgerId(ledger._id || ledger.id || '');
        setFormData(prev => ({
          ...prev,
          companyName: ledger.name || prev.companyName,
          customerName: ledger.name || prev.customerName,
          address: ledger.address || prev.address,
          pinCode: ledger.pincode || prev.pinCode
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const mobile = (formData.mobile || '').replace(/\D/g, '');
    if (mobile && mobile.length >= 3) {
      fetchLedgers(mobile);
    } else {
      setMatchingLedgers([]);
      setSelectedLedgerId('');
    }
  }, [formData.mobile, fetchLedgers]);

  useEffect(() => {
    const total = formData.products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
    if (total > 0) {
      setFormData(prev => ({ ...prev, totalAmount: total.toString() }));
    }
  }, [formData.products]);

  const handlePaymentModeChange = (mode: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      _paymentModes: {
        ...prev._paymentModes,
        [mode]: {
          ...prev._paymentModes[mode as keyof typeof prev._paymentModes],
          selected: checked,
          amount: checked ? (prev._paymentModes[mode as keyof typeof prev._paymentModes] as any).amount || "" : ""
        }
      }
    }));
  };

  const handlePaymentAmountChange = (mode: string, amount: string) => {
    setFormData(prev => ({
      ...prev,
      _paymentModes: {
        ...prev._paymentModes,
        [mode]: {
          ...prev._paymentModes[mode as keyof typeof prev._paymentModes],
          amount: amount
        }
      }
    }));
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!formData.customerName || !formData.mobile || !formData.branch || !formData.totalAmount || !formData.advanceAmount || !formData.deliveryDate) {
      alert('Please fill all required fields: Customer Name, Mobile, Branch, Total Amount, Advance Amount, and Delivery Date');
      return;
    }
    if (parseFloat(formData.advanceAmount) < 2000) {
      alert('Advance amount must be at least ₹2000');
      return;
    }
    setLoading(true);
    try {
      const paymentModeArray = Object.entries(formData._paymentModes)
        .filter(([mode, data]) => data.selected)
        .map(([mode, data]) => {
          const paymentObj: any = { mode: mode, amount: ('amount' in data) ? parseFloat(data.amount || '0') || 0 : 0 };
          if (mode === 'Bank') {
            if ('bankType' in data && data.bankType) paymentObj.bankType = data.bankType;
            if ('utrNumber' in data && data.utrNumber) paymentObj.utrNumber = data.utrNumber;
            if ('chequeNumber' in data && data.chequeNumber) paymentObj.chequeNumber = data.chequeNumber;
          } else if (mode === 'UPI') {
            if ('upiProvider' in data && data.upiProvider) paymentObj.upiProvider = data.upiProvider;
            if ('upiTransactionId' in data && data.upiTransactionId) paymentObj.upiTransactionId = data.upiTransactionId;
          } else if (mode === 'Machine') {
            if ('machineProvider' in data && data.machineProvider) paymentObj.machineProvider = data.machineProvider;
            if ('machineCardType' in data && data.machineCardType) paymentObj.machineCardType = data.machineCardType;
            if ('machineCardLast4Digits' in data && data.machineCardLast4Digits) paymentObj.machineCardLast4Digits = data.machineCardLast4Digits;
            if ('machineIdProofType' in data && data.machineIdProofType) paymentObj.machineIdProofType = data.machineIdProofType;
            if ('machineIdProofNumber' in data && data.machineIdProofNumber) paymentObj.machineIdProofNumber = data.machineIdProofNumber;
            if ('machineTransactionId' in data && data.machineTransactionId) paymentObj.machineTransactionId = data.machineTransactionId;
          } else if (mode === 'Bajaj Finance') {
            if ('loanAmount' in data && data.loanAmount) {
              paymentObj.loanAmount = parseFloat(data.loanAmount || '0') || 0;
              paymentObj.amount = parseFloat(data.loanAmount || '0') || 0;
            }
            if ('loanId' in data && data.loanId) paymentObj.loanId = data.loanId;
          } else if (mode === 'Brand Order') {
            if ('brandOrderType' in data && data.brandOrderType) paymentObj.brandOrderType = data.brandOrderType;
          }
          return paymentObj;
        });
      const payload = {
        companyName: formData.companyName,
        branch: formData.branch,
        salesPerson: formData.salesPerson,
        date: formData.date,
        salesType: formData.salesType,
        customerName: formData.customerName,
        address: formData.address,
        pinCode: formData.pinCode,
        contactPerson: formData.contactPerson,
        mobile: formData.mobile,
        phone: formData.phone,
        email: formData.email,
        gstNumber: formData.gstNumber,
        referralSource: formData.referralSource,
        referralSourceOther: formData.referralSourceOther,
        products: formData.products.map(p => p._id),
        totalAmount: parseFloat(formData.totalAmount),
        advanceAmount: parseFloat(formData.advanceAmount),
        paymentMode: paymentModeArray,
        deliveryDate: formData.deliveryDate,
        deliveryAddress: formData.deliveryAddress || formData.address,
        notes: formData.notes
      };
      const res = await fetch(`${getApiUrl()}/api/advance-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "Booking created successfully!" });
        setShowForm(false);
        fetchBookings();
        resetForm();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create booking');
    } finally {
      setLoading(false);
    }
  };



  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      console.log('Updating status:', { id, newStatus });
      
      // Find the booking to get its current data
      const booking: any = bookings.find((b: any) => b._id === id);
      if (!booking) {
        alert('Booking not found');
        return;
      }
      
      const url = `${getApiUrl()}/api/advance-bookings/${id}`;
      console.log('PUT URL:', url);
      
      const payload = {
        ...(booking as any),
        status: newStatus,
        branch: booking.branch?._id || booking.branch,
        salesPerson: booking.salesPerson?.id || booking.salesPerson?._id || booking.salesPerson,
        products: booking.products?.map((p: any) => p._id || p) || []
      };
      
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (data.success) {
        toast({ title: "Success", description: "Status updated successfully!" });
        await fetchBookings();
      } else {
        console.error('Update failed:', data.message);
        alert(`Error: ${data.message || 'Failed to update status'}`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert(`Network error: ${err}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/advance-bookings/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "Booking deleted successfully!" });
        fetchBookings();
        setDeleteConfirmId(null);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete booking');
    }
  };

  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="grid grid-cols-8 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b">
            <div className="grid grid-cols-8 gap-4">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6">
        {isInitialLoading ? (
          <SkeletonLoader />
        ) : (
          <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Advance Booking</h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.filter((booking: any) => statusFilter === "all" || booking.status === statusFilter).map((booking: any) => (
                  <tr key={booking._id}>
                    <td className="px-6 py-4 text-sm">
                      <div>{booking.customerName}</div>
                      <div className="text-gray-500">{booking.mobile}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {booking.products?.map((p: any, i: number) => (
                        <div key={i}>{p.model || p.serialNumber}</div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm">₹{booking.totalAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">₹{booking.advanceAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      {booking.paymentMode?.map((p: any, i: number) => (
                        <div key={i}>{p.mode}: ₹{p.amount?.toLocaleString()}</div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDate(booking.deliveryDate)}</td>
                    <td className="px-6 py-4 text-sm">
                      <Select value={booking.status} onValueChange={(v) => handleStatusUpdate(booking._id, v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedBooking(booking)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {userRole === 'admin' && (
                          <button 
                            onClick={() => setDeleteConfirmId(booking._id)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                            title="Delete Booking"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className="md:hidden divide-y divide-gray-200">
            {bookings.filter((booking: any) => statusFilter === "all" || booking.status === statusFilter).map((booking: any) => (
              <div key={booking._id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900">{booking.customerName}</div>
                    <div className="text-sm text-gray-500">{booking.mobile}</div>
                  </div>
                  <Select value={booking.status} onValueChange={(v) => handleStatusUpdate(booking._id, v)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <span className="ml-1 font-medium">₹{booking.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Advance:</span>
                    <span className="ml-1 font-medium">₹{booking.advanceAmount?.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Delivery:</span>
                    <span className="ml-1">{formatDate(booking.deliveryDate)}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setSelectedBooking(booking)}
                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {userRole === 'admin' && (
                    <button 
                      onClick={() => setDeleteConfirmId(booking._id)}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                      title="Delete Booking"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View Details Modal */}
        <AnimatePresence>
          {selectedBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedBooking(null)}
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
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
                    {selectedBooking.bookingId && (
                      <p className="text-sm text-gray-500 mt-1">Booking ID: <span className="font-mono font-semibold text-blue-600">{selectedBooking.bookingId}</span></p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                  {/* Company & Customer Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Company Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        Company Information
                      </h3>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-3">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Company</span>
                          <span className="text-base font-medium text-gray-900">{selectedBooking.companyName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block">Branch</span>
                            <span className="text-sm text-gray-700">{selectedBooking.branch?.name || selectedBooking.branch?.branchName || 'N/A'}</span>
                            {selectedBooking.branch?.code && (
                              <span className="text-xs text-gray-500"> ({selectedBooking.branch.code})</span>
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block">Sales Type</span>
                            <span className="text-sm text-gray-700">{selectedBooking.salesType}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Sales Person</span>
                          <span className="text-sm text-gray-700">
                            {selectedBooking.salesPerson?.firstName || selectedBooking.salesPerson?.name || 'N/A'}
                            {selectedBooking.salesPerson?.lastName && ` ${selectedBooking.salesPerson.lastName}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Date</span>
                          <span className="text-sm text-gray-700">{formatDateTime(selectedBooking.date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Customer Information
                      </h3>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-3">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Name</span>
                          <span className="text-base font-medium text-gray-900">{selectedBooking.customerName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block">Mobile</span>
                            <span className="text-sm text-gray-700">{selectedBooking.mobile}</span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block">Email</span>
                            <span className="text-sm text-gray-700 truncate" title={selectedBooking.email}>{selectedBooking.email}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Pin Code</span>
                          <span className="text-sm text-gray-700">{selectedBooking.pinCode}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Address</span>
                          <span className="text-sm text-gray-700">{selectedBooking.address}</span>
                        </div>
                        {selectedBooking.referralSource && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block">Referral Source</span>
                            <span className="text-sm text-gray-700">{selectedBooking.referralSource}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      Products
                    </h3>
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3">Model</th>
                            <th className="px-6 py-3">Serial Number</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3 text-right">Supported Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedBooking.products?.map((p: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="px-6 py-3 font-medium text-gray-900">{p.model}</td>
                              <td className="px-6 py-3 text-gray-600">{p.serialNumber}</td>
                              <td className="px-6 py-3 text-gray-600">{p.category}</td>
                              <td className="px-6 py-3 text-right font-medium text-gray-900">₹{(p.supportedAmount || p.price || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      Payment Information
                    </h3>
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Total Amount</span>
                          <span className="text-lg font-bold text-gray-900">₹{selectedBooking.totalAmount?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Advance Amount</span>
                          <span className="text-lg font-bold text-green-600">₹{selectedBooking.advanceAmount?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Remaining Amount</span>
                          <span className="text-lg font-bold text-red-600">₹{selectedBooking.remainingAmount?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">Payment Modes</span>
                        <div className="space-y-3">
                          {selectedBooking.paymentMode?.map((p: any, i: number) => (
                            <div key={i} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-900 text-base">{p.mode}</span>
                                <span className="font-bold text-blue-600 text-lg">₹{p.amount?.toLocaleString()}</span>
                              </div>
                              {p.mode === 'Bank' && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                  {p.bankType && <div className="flex justify-between"><span className="text-gray-500">Bank Type:</span><span className="text-gray-700 font-medium">{p.bankType}</span></div>}
                                  {p.utrNumber && <div className="flex justify-between"><span className="text-gray-500">UTR Number:</span><span className="text-gray-700 font-medium">{p.utrNumber}</span></div>}
                                  {p.chequeNumber && <div className="flex justify-between"><span className="text-gray-500">Cheque Number:</span><span className="text-gray-700 font-medium">{p.chequeNumber}</span></div>}
                                </div>
                              )}
                              {p.mode === 'UPI' && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                  {p.upiProvider && <div className="flex justify-between"><span className="text-gray-500">UPI Provider:</span><span className="text-gray-700 font-medium">{p.upiProvider}</span></div>}
                                  {p.upiTransactionId && <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="text-gray-700 font-medium">{p.upiTransactionId}</span></div>}
                                </div>
                              )}
                              {p.mode === 'Machine' && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                  {p.machineProvider && <div className="flex justify-between"><span className="text-gray-500">Machine Provider:</span><span className="text-gray-700 font-medium">{p.machineProvider}</span></div>}
                                  {p.machineCardType && <div className="flex justify-between"><span className="text-gray-500">Card Type:</span><span className="text-gray-700 font-medium">{p.machineCardType}</span></div>}
                                  {p.machineCardLast4Digits && <div className="flex justify-between"><span className="text-gray-500">Card Last 4 Digits:</span><span className="text-gray-700 font-medium">**** {p.machineCardLast4Digits}</span></div>}
                                  {p.machineIdProofType && <div className="flex justify-between"><span className="text-gray-500">ID Proof Type:</span><span className="text-gray-700 font-medium">{p.machineIdProofType}</span></div>}
                                  {p.machineIdProofNumber && <div className="flex justify-between"><span className="text-gray-500">ID Proof Number:</span><span className="text-gray-700 font-medium">{p.machineIdProofNumber}</span></div>}
                                  {p.machineTransactionId && <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="text-gray-700 font-medium">{p.machineTransactionId}</span></div>}
                                </div>
                              )}
                              {p.mode === 'Bajaj Finance' && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                  {p.loanAmount && <div className="flex justify-between"><span className="text-gray-500">Loan Amount:</span><span className="text-gray-700 font-medium">₹{p.loanAmount?.toLocaleString()}</span></div>}
                                  {p.loanId && <div className="flex justify-between"><span className="text-gray-500">Loan ID:</span><span className="text-gray-700 font-medium">{p.loanId}</span></div>}
                                </div>
                              )}
                              {p.mode === 'Brand Order' && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-sm">
                                  {p.brandOrderType && <div className="flex justify-between"><span className="text-gray-500">Brand Order Type:</span><span className="text-gray-700 font-medium">{p.brandOrderType}</span></div>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      Delivery Information
                    </h3>
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Delivery Date</span>
                          <span className="text-sm text-gray-700">{formatDate(selectedBooking.deliveryDate)}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Status</span>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            selectedBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            selectedBooking.status === 'confirmed' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            selectedBooking.status === 'delivered' ? 'bg-green-100 text-green-800 border border-green-200' :
                            'bg-red-100 text-red-800 border border-red-200'
                          }`}>{selectedBooking.status}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Delivery Address</span>
                        <span className="text-sm text-gray-700">{selectedBooking.deliveryAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedBooking.notes && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                        Notes
                      </h3>
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-700">{selectedBooking.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedBooking.attachments?.inventoryPics?.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Inventory Pictures
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedBooking.attachments.inventoryPics.map((pic: string, idx: number) => (
                          <a
                            key={idx}
                            href={pic}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative block aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all"
                          >
                            <img
                              src={pic}
                              alt={`Inventory ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                              <p className="text-white text-xs font-bold text-center">Inventory Pic {idx + 1}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-semibold">Created:</span> {formatDateTime(selectedBooking.createdAt)}
                      </div>
                      <div>
                        <span className="font-semibold">Updated:</span> {formatDateTime(selectedBooking.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Form Modal - PART 1 */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">New Advance Booking</h2>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}><X className="w-5 h-5" /></Button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <section>
                  <h3 className="text-lg font-semibold mb-4">GST Billing Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Mobile Number</Label><Input type="tel" placeholder="Enter mobile number" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} maxLength={10} /></div>
                    <div><Label>Ledger (by Mobile)</Label><Select value={selectedLedgerId} onValueChange={v => { setSelectedLedgerId(v); const ledger = matchingLedgers.find((l: any) => (l._id || l.id) === v); if (ledger) setFormData(prev => ({ ...prev, companyName: ledger.name || prev.companyName, customerName: ledger.name || prev.customerName, address: ledger.address || prev.address, pinCode: ledger.pincode || prev.pinCode })); }} disabled={matchingLedgers.length === 0}><SelectTrigger><SelectValue placeholder={matchingLedgers.length === 0 ? "No ledger found" : "Select Ledger"} /></SelectTrigger><SelectContent>{matchingLedgers.map((ledger: any) => (<SelectItem key={ledger._id || ledger.id} value={ledger._id || ledger.id}>{ledger.name} ({ledger.phone})</SelectItem>))}</SelectContent></Select></div>
                    <div><Label>Company Name</Label><Input placeholder="Enter company name" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} /></div>
                    <div><Label>Branch *</Label><Select value={formData.branch} onValueChange={(v) => setFormData({ ...formData, branch: v })}><SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger><SelectContent>{branches.map(branch => (<SelectItem key={branch._id} value={branch._id}>{branch.name || branch.branchName}</SelectItem>))}</SelectContent></Select></div>
                    <div><Label>Sales Type</Label><Select value={formData.salesType} onValueChange={(v) => setFormData({ ...formData, salesType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Retail">Retail</SelectItem><SelectItem value="Dealer">Dealer</SelectItem></SelectContent></Select></div>
                    <div><Label>Sales Person</Label><Select value={formData.salesPerson} onValueChange={(v) => setFormData({ ...formData, salesPerson: v })}><SelectTrigger><SelectValue placeholder="Select Sales Person" /></SelectTrigger><SelectContent>{salesPersons.map((person: any) => (<SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>))}</SelectContent></Select></div>
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Customer Name *</Label><Input placeholder="Enter customer name" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} /></div>
                    <div><Label>Address</Label><Input placeholder="Enter address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                    <div><Label>Pin Code</Label><Input placeholder="Enter pin code" value={formData.pinCode} onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })} maxLength={6} /></div>
                    <div><Label>Email</Label><Input placeholder="Enter email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-semibold mb-4">Products</h3>
                  {formData.products.map((product: any, index: number) => (
                    <div key={index} className="mb-4 p-4 border rounded">
                      <h4 className="text-sm font-medium mb-3">Product {index + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><Label>Product Category</Label><Select value={product.category || ''} onValueChange={(v) => { const updated = [...formData.products]; updated[index] = { ...updated[index], category: v, model: '', _id: '' }; setFormData({ ...formData, products: updated }); const filtered = availableProducts.filter(p => p.category?.toLowerCase() === v.toLowerCase()); setFilteredProductsMap(prev => ({ ...prev, [index]: filtered })); }}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent><SelectItem value="Laptop">Laptop</SelectItem><SelectItem value="Desktop">Desktop</SelectItem><SelectItem value="AIO">AIO</SelectItem><SelectItem value="Accessory">Accessory</SelectItem></SelectContent></Select></div>
                        <div><Label>Model</Label><div className="flex gap-2"><Select value={product._id || ''} onValueChange={(v) => { const selected = availableProducts.find(p => p._id === v); if (selected) { const updated = [...formData.products]; updated[index] = { _id: selected._id, model: selected.model || selected.name, category: selected.category, serialNumber: '', price: selected.supportedAmount || 0, claimCode: selected.claimCode || '', timePeriod: selected.programPeriod || '', cnToPartner: selected.cnToPartner || '' }; setFormData({ ...formData, products: updated }); } }} disabled={!product.category}><SelectTrigger className="flex-1"><SelectValue placeholder={!product.category ? 'Select category first' : 'Select model'} /></SelectTrigger><SelectContent>{(filteredProductsMap[index] || availableProducts.filter(p => p.category?.toLowerCase() === product.category?.toLowerCase())).map(p => (<SelectItem key={p._id} value={p._id}>{p.model || p.name}</SelectItem>))}</SelectContent></Select><Button type="button" onClick={() => { setScanningProductId(index); setShowModelScanner(true); setScannedValue(""); }} className="px-3 bg-purple-500 hover:bg-purple-600" title="Scan Model" disabled={!product.category}><Scan className="w-4 h-4" /></Button></div></div>
                        <div><Label>Serial Number</Label><div className="flex gap-2"><Input value={product.serialNumber || ''} onChange={(e) => { const updated = [...formData.products]; updated[index] = { ...updated[index], serialNumber: e.target.value }; setFormData({ ...formData, products: updated }); }} placeholder="Serial Number" className="flex-1" /><Button type="button" onClick={() => { setScanningProductId(index); setShowSerialScanner(true); setScannedValue(""); }} className="px-3 bg-purple-500 hover:bg-purple-600" title="Scan Serial Number"><Scan className="w-4 h-4" /></Button></div></div>
                        <div><Label>CHECK Code</Label><div className="flex gap-2"><Input value={product.checkCode || ''} onChange={(e) => { const updated = [...formData.products]; updated[index] = { ...updated[index], checkCode: e.target.value }; setFormData({ ...formData, products: updated }); }} placeholder="CHECK Code" className="flex-1" /><Button type="button" onClick={() => { setScanningProductId(index); setShowCheckCodeScanner(true); setScannedValue(""); }} className="px-3 bg-purple-500 hover:bg-purple-600" title="Scan CHECK Code"><Scan className="w-4 h-4" /></Button></div></div>
                        <div><Label>Price *</Label><Input type="number" value={product.price || ''} onChange={(e) => { const updated = [...formData.products]; updated[index] = { ...updated[index], price: e.target.value }; setFormData({ ...formData, products: updated }); }} placeholder="Price" /></div>
                        <div><Label>Claim Code</Label><Input value={product.claimCode || ''} onChange={(e) => { const updated = [...formData.products]; updated[index] = { ...updated[index], claimCode: e.target.value }; setFormData({ ...formData, products: updated }); }} placeholder="Claim Code" /></div>
                        <div><Label>Time Period</Label><Input value={product.timePeriod || ''} onChange={(e) => { const updated = [...formData.products]; updated[index] = { ...updated[index], timePeriod: e.target.value }; setFormData({ ...formData, products: updated }); }} placeholder="Time Period" /></div>
                        <div><Label>CN To Partner</Label><Input value={product.cnToPartner || ''} onChange={(e) => { const updated = [...formData.products]; updated[index] = { ...updated[index], cnToPartner: e.target.value }; setFormData({ ...formData, products: updated }); }} placeholder="CN To Partner" /></div>
                      </div>
                      {formData.products.length > 1 && (<Button size="sm" variant="destructive" onClick={() => setFormData({ ...formData, products: formData.products.filter((_, i) => i !== index) })} className="mt-3">Remove</Button>)}
                    </div>
                  ))}
                  <Button onClick={() => setFormData({ ...formData, products: [...formData.products, { category: '', model: '', serialNumber: '', _id: '' }] })}>+ Add Product</Button>
                </section>
                <section>
                  <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div><Label>Total Amount *</Label><Input placeholder="Enter total amount" type="number" value={formData.totalAmount} onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })} /></div>
                    <div><Label>Advance Amount * (Min ₹2000)</Label><Input placeholder="Enter advance amount" type="number" value={formData.advanceAmount} onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })} /></div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Payment Mode (Select and enter amount)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Cash */}
                      <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={formData._paymentModes.Cash.selected} onChange={(e) => handlePaymentModeChange('Cash', e.target.checked)} className="w-4 h-4" />
                          <Label className="font-semibold">Cash</Label>
                        </div>
                        {formData._paymentModes.Cash.selected && (
                          <><Input type="number" placeholder="Enter amount" value={formData._paymentModes.Cash.amount} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Cash: { ...prev._paymentModes.Cash, amount: e.target.value } } }))} className="bg-white" /><p className="text-xs text-red-600">Enter a valid amount</p></>
                        )}
                      </div>
                      {/* Bank */}
                      <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={formData._paymentModes.Bank.selected} onChange={(e) => handlePaymentModeChange('Bank', e.target.checked)} className="w-4 h-4" />
                          <Label className="font-semibold">Bank</Label>
                        </div>
                        {formData._paymentModes.Bank.selected && (
                          <><Input type="number" placeholder="Enter amount" value={formData._paymentModes.Bank.amount} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Bank: { ...prev._paymentModes.Bank, amount: e.target.value } } }))} className="bg-white" /><p className="text-xs text-red-600">Enter a valid amount</p><Select value={formData._paymentModes.Bank.bankType} onValueChange={(v) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Bank: { ...prev._paymentModes.Bank, bankType: v } } }))}><SelectTrigger className="bg-white"><SelectValue placeholder="Select bank type" /></SelectTrigger><SelectContent><SelectItem value="NEFT">NEFT</SelectItem><SelectItem value="RTGS">RTGS</SelectItem><SelectItem value="IMPS">IMPS</SelectItem><SelectItem value="Net Banking">Net Banking</SelectItem><SelectItem value="Cheque">Cheque</SelectItem></SelectContent></Select>{formData._paymentModes.Bank.bankType === 'Cheque' ? <Input placeholder="Cheque Number" value={formData._paymentModes.Bank.chequeNumber} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Bank: { ...prev._paymentModes.Bank, chequeNumber: e.target.value } } }))} className="bg-white" /> : <Input placeholder="UTR Number" value={formData._paymentModes.Bank.utrNumber} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Bank: { ...prev._paymentModes.Bank, utrNumber: e.target.value } } }))} className="bg-white" />}</>
                        )}
                      </div>
                      {/* UPI */}
                      <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={formData._paymentModes.UPI.selected} onChange={(e) => handlePaymentModeChange('UPI', e.target.checked)} className="w-4 h-4" />
                          <Label className="font-semibold">UPI</Label>
                        </div>
                        {formData._paymentModes.UPI.selected && (
                          <><Input type="number" placeholder="Enter amount" value={formData._paymentModes.UPI.amount} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, UPI: { ...prev._paymentModes.UPI, amount: e.target.value } } }))} className="bg-white" /><p className="text-xs text-red-600">Enter a valid amount</p><Input placeholder="PhonePe Transaction ID" value={formData._paymentModes.UPI.upiTransactionId} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, UPI: { ...prev._paymentModes.UPI, upiTransactionId: e.target.value } } }))} className="bg-white" /></>
                        )}
                      </div>
                      {/* Machine */}
                      <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={formData._paymentModes.Machine.selected} onChange={(e) => handlePaymentModeChange('Machine', e.target.checked)} className="w-4 h-4" />
                          <Label className="font-semibold">Machine</Label>
                        </div>
                        {formData._paymentModes.Machine.selected && (
                          <><Input type="number" placeholder="Enter amount" value={formData._paymentModes.Machine.amount} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Machine: { ...prev._paymentModes.Machine, amount: e.target.value } } }))} className="bg-white" /><Select value={formData._paymentModes.Machine.machineProvider} onValueChange={(v) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Machine: { ...prev._paymentModes.Machine, machineProvider: v } } }))}><SelectTrigger className="bg-white"><SelectValue placeholder="Select machine" /></SelectTrigger><SelectContent><SelectItem value="Pinelabs">Pinelabs</SelectItem><SelectItem value="Paytm">Paytm</SelectItem></SelectContent></Select><Select value={formData._paymentModes.Machine.machineCardType} onValueChange={(v) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Machine: { ...prev._paymentModes.Machine, machineCardType: v } } }))}><SelectTrigger className="bg-white"><SelectValue placeholder="Card type" /></SelectTrigger><SelectContent><SelectItem value="Credit Card">Credit Card</SelectItem><SelectItem value="Debit Card">Debit Card</SelectItem></SelectContent></Select><Input placeholder="Last 4 digits" value={formData._paymentModes.Machine.machineCardLast4Digits} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Machine: { ...prev._paymentModes.Machine, machineCardLast4Digits: e.target.value.replace(/\D/g, '').slice(0, 4) } } }))} maxLength={4} className="bg-white" /><Select value={formData._paymentModes.Machine.machineIdProofType} onValueChange={(v) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Machine: { ...prev._paymentModes.Machine, machineIdProofType: v } } }))}><SelectTrigger className="bg-white"><SelectValue placeholder="ID proof" /></SelectTrigger><SelectContent><SelectItem value="Aadhaar">Aadhaar</SelectItem><SelectItem value="PAN">PAN</SelectItem></SelectContent></Select>                                <Input placeholder={formData._paymentModes.Machine.machineIdProofType === 'Aadhaar' ? 'Enter 12-digit Aadhaar' : formData._paymentModes.Machine.machineIdProofType === 'PAN' ? 'Enter 10-character PAN' : 'ID proof number'} value={formData._paymentModes.Machine.machineIdProofNumber} onChange={(e) => { let value = e.target.value; if (formData._paymentModes.Machine.machineIdProofType === 'Aadhaar') { value = value.replace(/\D/g, '').slice(0, 12); } else if (formData._paymentModes.Machine.machineIdProofType === 'PAN') { value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10); } setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Machine: { ...prev._paymentModes.Machine, machineIdProofNumber: value } } })); }} maxLength={formData._paymentModes.Machine.machineIdProofType === 'Aadhaar' ? 12 : formData._paymentModes.Machine.machineIdProofType === 'PAN' ? 10 : undefined} className="bg-white" /><Input placeholder="Transaction ID" value={formData._paymentModes.Machine.machineTransactionId} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, Machine: { ...prev._paymentModes.Machine, machineTransactionId: e.target.value } } }))} className="bg-white" /></>
                        )}
                      </div>
                      {/* Bajaj Finance */}
                      <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={formData._paymentModes['Bajaj Finance'].selected} onChange={(e) => handlePaymentModeChange('Bajaj Finance', e.target.checked)} className="w-4 h-4" />
                          <Label className="font-semibold">Bajaj Finance</Label>
                        </div>
                        {formData._paymentModes['Bajaj Finance'].selected && (
                          <><Input type="number" placeholder="Loan Amount" value={formData._paymentModes['Bajaj Finance'].loanAmount} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, 'Bajaj Finance': { ...prev._paymentModes['Bajaj Finance'], loanAmount: e.target.value, amount: e.target.value } } }))} className="bg-white" /><Input placeholder="Loan ID" value={formData._paymentModes['Bajaj Finance'].loanId} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, 'Bajaj Finance': { ...prev._paymentModes['Bajaj Finance'], loanId: e.target.value } } }))} className="bg-white" /></>
                        )}
                      </div>
                      {/* Brand Order */}
                      <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={formData._paymentModes['Brand Order'].selected} onChange={(e) => handlePaymentModeChange('Brand Order', e.target.checked)} className="w-4 h-4" />
                          <Label className="font-semibold">Brand Order</Label>
                        </div>
                        {formData._paymentModes['Brand Order'].selected && (
                          <><Input type="number" placeholder="Enter amount" value={formData._paymentModes['Brand Order'].amount} onChange={(e) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, 'Brand Order': { ...prev._paymentModes['Brand Order'], amount: e.target.value } } }))} className="bg-white" /><Select value={formData._paymentModes['Brand Order'].brandOrderType} onValueChange={(v) => setFormData(prev => ({ ...prev, _paymentModes: { ...prev._paymentModes, 'Brand Order': { ...prev._paymentModes['Brand Order'], brandOrderType: v } } }))}><SelectTrigger className="bg-white"><SelectValue placeholder="Select brand order type" /></SelectTrigger><SelectContent><SelectItem value="Lenovo OMO">Lenovo OMO</SelectItem><SelectItem value="Asus Eshop">Asus Eshop</SelectItem></SelectContent></Select></>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-semibold mb-4">Delivery Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Delivery Date *</Label><Input type="date" value={formData.deliveryDate} onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })} /></div>
                    <div><Label>Delivery Address</Label><Input value={formData.deliveryAddress} onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })} placeholder="Same as customer address if empty" /></div>
                  </div>
                </section>
                <section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Referral Source</Label><Select value={formData.referralSource} onValueChange={(v) => setFormData({ ...formData, referralSource: v })}><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger><SelectContent><SelectItem value="Social Media Platform">Social Media Platform</SelectItem><SelectItem value="Google">Google</SelectItem><SelectItem value="Friends/Family">Friends/Family</SelectItem><SelectItem value="Old Customer">Old Customer</SelectItem></SelectContent></Select></div>
                    <div><Label>Notes</Label><Input placeholder="Additional notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
                  </div>
                </section>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white"><Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button><Button onClick={handleSubmit} disabled={loading}>{loading ? 'Creating...' : 'Create Booking'}</Button></div>
            </div>
          </div>
        )}

        {/* Serial Number Scanner Modal */}
        {showSerialScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Scan className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Scan Serial Number</h3>
                  </div>
                  <button onClick={() => { setShowSerialScanner(false); setScanningProductId(null); setScannedValue(""); }} className="text-white hover:text-gray-200 p-1 rounded transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <Label className="mb-2 text-sm font-medium text-gray-700">Serial Number</Label>
                  <Input type="text" placeholder="Scan or enter serial number..." value={scannedValue} onChange={(e) => setScannedValue(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && scannedValue.trim() && scanningProductId !== null) { const updated = [...formData.products]; updated[scanningProductId] = { ...updated[scanningProductId], serialNumber: scannedValue.trim() }; setFormData({ ...formData, products: updated }); toast({ title: "Serial Number Scanned!", description: `Serial number: ${scannedValue.trim()}` }); setShowSerialScanner(false); setScanningProductId(null); setScannedValue(""); } }} className="text-lg font-mono" autoFocus />
                </div>
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
                <div className="flex justify-end gap-3">
                  <Button type="button" onClick={() => { setShowSerialScanner(false); setScanningProductId(null); setScannedValue(""); }} variant="outline">Cancel</Button>
                  <Button type="button" onClick={() => { if (scannedValue.trim() && scanningProductId !== null) { const updated = [...formData.products]; updated[scanningProductId] = { ...updated[scanningProductId], serialNumber: scannedValue.trim() }; setFormData({ ...formData, products: updated }); toast({ title: "Serial Number Scanned!", description: `Serial number: ${scannedValue.trim()}` }); setShowSerialScanner(false); setScanningProductId(null); setScannedValue(""); } }} disabled={!scannedValue.trim()} className="bg-purple-600 hover:bg-purple-700">Apply</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHECK Code Scanner Modal */}
        {showCheckCodeScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Scan className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Scan CHECK Code</h3>
                  </div>
                  <button onClick={() => { setShowCheckCodeScanner(false); setScanningProductId(null); setScannedValue(""); }} className="text-white hover:text-gray-200 p-1 rounded transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <Label className="mb-2 text-sm font-medium text-gray-700">CHECK Code</Label>
                  <Input type="text" placeholder="Scan or enter CHECK code..." value={scannedValue} onChange={(e) => setScannedValue(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && scannedValue.trim() && scanningProductId !== null) { const updated = [...formData.products]; updated[scanningProductId] = { ...updated[scanningProductId], checkCode: scannedValue.trim() }; setFormData({ ...formData, products: updated }); toast({ title: "CHECK Code Scanned!", description: `CHECK Code: ${scannedValue.trim()}` }); setShowCheckCodeScanner(false); setScanningProductId(null); setScannedValue(""); } }} className="text-lg font-mono" autoFocus />
                </div>
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
                <div className="flex justify-end gap-3">
                  <Button type="button" onClick={() => { setShowCheckCodeScanner(false); setScanningProductId(null); setScannedValue(""); }} variant="outline">Cancel</Button>
                  <Button type="button" onClick={() => { if (scannedValue.trim() && scanningProductId !== null) { const updated = [...formData.products]; updated[scanningProductId] = { ...updated[scanningProductId], checkCode: scannedValue.trim() }; setFormData({ ...formData, products: updated }); toast({ title: "CHECK Code Scanned!", description: `CHECK Code: ${scannedValue.trim()}` }); setShowCheckCodeScanner(false); setScanningProductId(null); setScannedValue(""); } }} disabled={!scannedValue.trim()} className="bg-blue-600 hover:bg-blue-700">Apply</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Model Scanner Modal */}
        {showModelScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Scan className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Scan Model</h3>
                  </div>
                  <button onClick={() => { setShowModelScanner(false); setScanningProductId(null); setScannedValue(""); }} className="text-white hover:text-gray-200 p-1 rounded transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <Label className="mb-2 text-sm font-medium text-gray-700">Model</Label>
                  <Input type="text" placeholder="Scan or enter model..." value={scannedValue} onChange={(e) => setScannedValue(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && scannedValue.trim() && scanningProductId !== null) { const product = formData.products[scanningProductId]; const scanned = scannedValue.trim(); const categoryProducts = filteredProductsMap[scanningProductId] || availableProducts.filter(p => p.category?.toLowerCase() === product.category?.toLowerCase()); const found = categoryProducts.find(p => (p.model || p.name)?.toLowerCase() === scanned.toLowerCase()); if (found) { const updated = [...formData.products]; updated[scanningProductId] = { _id: found._id, model: found.model || found.name, category: found.category, serialNumber: '', price: found.supportedAmount || 0, claimCode: found.claimCode || '', timePeriod: found.programPeriod || '', cnToPartner: found.cnToPartner || '' }; setFormData({ ...formData, products: updated }); toast({ title: "Model Scanned (Found)", description: `Model "${scanned}" exists in selected category.` }); } else { toast({ title: "Model Scanned (Not Found)", description: `Model "${scanned}" not found in the selected category.`, variant: "destructive" }); } setShowModelScanner(false); setScanningProductId(null); setScannedValue(""); } }} className="text-lg font-mono" autoFocus />
                </div>
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
                <div className="flex justify-end gap-3">
                  <Button type="button" onClick={() => { setShowModelScanner(false); setScanningProductId(null); setScannedValue(""); }} variant="outline">Cancel</Button>
                  <Button type="button" onClick={() => { if (scannedValue.trim() && scanningProductId !== null) { const product = formData.products[scanningProductId]; const scanned = scannedValue.trim(); const categoryProducts = filteredProductsMap[scanningProductId] || availableProducts.filter(p => p.category?.toLowerCase() === product.category?.toLowerCase()); const found = categoryProducts.find(p => (p.model || p.name)?.toLowerCase() === scanned.toLowerCase()); if (found) { const updated = [...formData.products]; updated[scanningProductId] = { _id: found._id, model: found.model || found.name, category: found.category, serialNumber: '', price: found.supportedAmount || 0, claimCode: found.claimCode || '', timePeriod: found.programPeriod || '', cnToPartner: found.cnToPartner || '' }; setFormData({ ...formData, products: updated }); toast({ title: "Model Scanned (Found)", description: `Model "${scanned}" exists in selected category.` }); } else { toast({ title: "Model Scanned (Not Found)", description: `Model "${scanned}" not found in the selected category.`, variant: "destructive" }); } setShowModelScanner(false); setScanningProductId(null); setScannedValue(""); } }} disabled={!scannedValue.trim()} className="bg-green-600 hover:bg-green-700">Apply</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Are you absolutely sure?</h3>
                <p className="text-gray-600 mb-6">This action cannot be undone. This will permanently delete the booking.</p>
                <div className="flex justify-end gap-3">
                  <Button type="button" onClick={() => setDeleteConfirmId(null)} variant="outline" className="px-6">Cancel</Button>
                  <Button type="button" onClick={() => handleDelete(deleteConfirmId)} className="bg-red-600 hover:bg-red-700 px-6">Delete Booking</Button>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
