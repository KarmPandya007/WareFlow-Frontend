"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Calendar, Download, Eye } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function DayBookPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [billings, setBillings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole')?.toLowerCase();
    if (role !== 'admin') {
      window.location.href = '/billing';
      return;
    }
    fetchProducts();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/branches`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.branches) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/products`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.products) {
        const all = [
          ...(data.products.laptops || []),
          ...(data.products.desktops || []),
          ...(data.products.aios || []),
          ...(data.products.accessories || [])
        ];
        setProducts(all);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchBillings = async () => {
    setLoading(true);
    setFetched(false);
    try {
      const res = await fetch(`${getApiUrl()}/api/billing/`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        const filtered = data.billings.filter((b: any) => {
          const billDate = new Date(b.date).toISOString().split('T')[0];
          return billDate === selectedDate;
        });
        setBillings(filtered);
      }
    } catch (err) {
      console.error('Error fetching billings:', err);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const getProductPrice = (product: any) => {
    if (!product) return 0;
    
    // First try to find the product in the products array
    const found = products.find(p => {
      if (!p) return false;
      // Match by _id, model, name, or other identifiers
      return (
        (p._id && product._id && p._id === product._id) ||
        (p.model && product.model && p.model.toLowerCase() === product.model.toLowerCase()) ||
        (p.name && product.name && p.name.toLowerCase() === product.name.toLowerCase()) ||
        (p.model && product.name && p.model.toLowerCase() === product.name.toLowerCase()) ||
        (p.name && product.model && p.name.toLowerCase() === product.model.toLowerCase())
      );
    });
    
    if (found) {
      // Try different price fields in order of preference
      const priceFields = ['supportedAmount', 'srp', 'price', 'sellingPrice', 'rate', 'amount', 'cost'];
      for (const field of priceFields) {
        const value = found[field];
        if (value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0) {
          return Number(value);
        }
      }
    }
    
    // Fallback to product's own price fields
    if (typeof product === 'object') {
      const priceFields = ['price', 'supportedAmount', 'srp', 'sellingPrice', 'rate', 'amount', 'cost'];
      for (const field of priceFields) {
        const value = product[field];
        if (value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0) {
          return Number(value);
        }
      }
    }
    
    return 0;
  };

  const formatPaymentMode = (paymentMode: any) => {
    if (!paymentMode) return 'Cash';
    
    if (Array.isArray(paymentMode)) {
      if (paymentMode.length === 0) return 'Cash';
      return paymentMode.map(p => p.mode || 'Cash').join(', ');
    }
    
    return String(paymentMode);
  };

  const resolveBranchName = (branch: any) => {
    if (!branch) return 'Main Branch';
    if (typeof branch === 'string') {
      const found = branches.find(b => b._id === branch || b.name === branch);
      return found?.name || 'Main Branch';
    }
    return branch.name || branch.branchName || 'Main Branch';
  };

  const getSalesPersonName = (salesPerson: any) => {
    if (!salesPerson) return 'N/A';
    if (typeof salesPerson === 'string') return salesPerson;
    return `${salesPerson.firstName || ''} ${salesPerson.lastName || ''}`.trim() || 'N/A';
  };

  const calculateTotal = (billing: any) => {
    // First try to use the totalAmount from the billing record
    if (billing.totalAmount && !isNaN(Number(billing.totalAmount)) && Number(billing.totalAmount) > 0) {
      return Number(billing.totalAmount);
    }
    
    // Calculate from products if totalAmount is not available or invalid
    const prods = billing.products || [];
    let total = 0;
    
    prods.forEach((p: any) => {
      const qty = Number(p.quantity || p.qty || 1);
      const price = getProductPrice(p);
      total += (price * qty);
    });
    
    return total;
  };

  const downloadExcel = async () => {
    if (billings.length === 0) {
      alert('No billings found for selected date');
      return;
    }

    const XLSX = await import('xlsx');
    const rows: any[] = [];
    
    const dateStr = new Date(selectedDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'long'
    }).toUpperCase();
    
    rows.push(['Day Book- HPT & HPSS-Date: ' + dateStr]);
    rows.push(['MODEL NO', 'SR.NO', 'QNTY', 'CASH', 'ICICI-HPT', 'ICICI-HPSS', 'PAYTM-MACHINE', 'PHONEPE-HPT', 'PHONEPE-HPSS', 'PINELABS-HPT', 'BAJAJ', 'NARRATION']);

    let totalQty = 0;
    let totalCash = 0;
    let totalIciciHpt = 0;
    let totalIciciHpss = 0;
    let totalPaytm = 0;
    let totalPhonepeHpt = 0;
    let totalPhonepeHpss = 0;
    let totalPinelabs = 0;
    let totalBajaj = 0;

    billings.forEach(billing => {
      const prods = billing.products || [];
      const paymentModes = Array.isArray(billing.paymentMode) ? billing.paymentMode : [];
      
      // Calculate payment amounts for this billing
      let cash = 0, iciciHpt = 0, iciciHpss = 0, paytm = 0, phonepeHpt = 0, phonepeHpss = 0, pinelabs = 0, bajaj = 0;

      paymentModes.forEach((pm: any) => {
        const amt = Number(pm.amount || 0);
        const mode = (pm.mode || '').toLowerCase();
        
        if (mode === 'cash') cash += amt;
        else if (mode === 'bank' && pm.bankType?.toLowerCase().includes('icici')) {
          if (pm.bankType?.toLowerCase().includes('hpt')) iciciHpt += amt;
          else iciciHpss += amt;
        }
        else if (mode === 'machine' && pm.machineProvider?.toLowerCase().includes('paytm')) paytm += amt;
        else if (mode === 'upi') {
          if (pm.upiProvider?.toLowerCase().includes('phonepe')) {
            if (pm.upiProvider?.toLowerCase().includes('hpt')) phonepeHpt += amt;
            else phonepeHpss += amt;
          }
        }
        else if (mode === 'machine' && pm.machineProvider?.toLowerCase().includes('pine')) pinelabs += amt;
        else if (mode === 'bajaj finance') bajaj += amt;
      });

      totalCash += cash;
      totalIciciHpt += iciciHpt;
      totalIciciHpss += iciciHpss;
      totalPaytm += paytm;
      totalPhonepeHpt += phonepeHpt;
      totalPhonepeHpss += phonepeHpss;
      totalPinelabs += pinelabs;
      totalBajaj += bajaj;

      prods.forEach((product: any) => {
        const model = product.model || product.name || '';
        const serialNo = product.serialNo || product.serialNumber || '';
        const qty = Number(product.quantity || 1);
        
        totalQty += qty;

        rows.push([
          model,
          serialNo,
          qty,
          cash || '',
          iciciHpt || '',
          iciciHpss || '',
          paytm || '',
          phonepeHpt || '',
          phonepeHpss || '',
          pinelabs || '',
          bajaj || '',
          billing.notes || ''
        ]);
      });
    });

    rows.push([
      'TOTAL',
      '',
      totalQty,
      totalCash || '',
      totalIciciHpt || '',
      totalIciciHpss || '',
      totalPaytm || '',
      totalPhonepeHpt || '',
      totalPhonepeHpss || '',
      totalPinelabs || '',
      totalBajaj || '',
      ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, 
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
      { wch: 10 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DayBook');
    XLSX.writeFile(wb, `DayBook_${selectedDate}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Calendar className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Day Book</h1>
        </div>

        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={fetchBillings}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-sm shadow-sm transition-colors"
            >
              {loading ? 'Loading...' : 'Fetch Billings'}
            </button>
            <button
              onClick={downloadExcel}
              disabled={billings.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 font-medium text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download Excel</span>
              <span className="sm:hidden">Download</span>
            </button>
          </div>

          {fetched && billings.length === 0 && (
            <div className="mt-6">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-6 text-center">
                <p className="text-amber-800 font-medium text-sm">
                  No billings were made on {new Date(selectedDate).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          )}

          {billings.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-4">
                Found <span className="font-bold text-gray-900">{billings.length}</span> billing(s) for {new Date(selectedDate).toLocaleDateString('en-GB')}
              </p>
              
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs">S.No</th>
                        <th className="px-4 py-3 text-left text-xs">Customer</th>
                        <th className="px-4 py-3 text-left text-xs">Mobile</th>
                        <th className="px-4 py-3 text-left text-xs">Amount</th>
                        <th className="px-4 py-3 text-left text-xs">Sales Type</th>
                        <th className="px-4 py-3 text-left text-xs">Sales Person</th>
                        <th className="px-4 py-3 text-left text-xs">Branch</th>
                        <th className="px-4 py-3 text-left text-xs">Payment Mode</th>
                        <th className="px-4 py-3 text-center text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {billings.map((billing, index) => (
                        <tr key={billing._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{billing.customerName}</td>
                          <td className="px-4 py-3 text-gray-600">{billing.mobile || 'N/A'}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">₹{calculateTotal(billing).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-600">{billing.salesType || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-600">{getSalesPersonName(billing.salesPerson)}</td>
                          <td className="px-4 py-3 text-gray-600">{resolveBranchName(billing.branch)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatPaymentMode(billing.paymentMode)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <button
                                onClick={() => setViewingRecord(billing)}
                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors shadow-sm"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {billings.map((billing, index) => (
                  <div key={billing._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                          <h3 className="font-semibold text-gray-900">{billing.customerName}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{billing.mobile || 'N/A'}</p>
                      </div>
                      <button
                        onClick={() => setViewingRecord(billing)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 block">Amount</span>
                        <span className="font-semibold text-gray-900">₹{calculateTotal(billing).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Sales Type</span>
                        <span className="text-gray-700">{billing.salesType || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Sales Person</span>
                        <span className="text-gray-700">{getSalesPersonName(billing.salesPerson)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Branch</span>
                        <span className="text-gray-700">{resolveBranchName(billing.branch)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500 block">Payment Mode</span>
                        <span className="text-gray-700">{formatPaymentMode(billing.paymentMode)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
              className="relative bg-white rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
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

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                          <span className="text-sm text-gray-700">{getSalesPersonName(viewingRecord.salesPerson)}</span>
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

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    Purchased Items
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Serial Number</th>
                          <th className="px-4 py-3 text-center">Quantity</th>
                          <th className="px-4 py-3 text-right">Price</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(viewingRecord.products || []).map((product: any, idx: number) => {
                          const qty = Number(product.quantity || product.qty || 1);
                          const price = getProductPrice(product);
                          const name = product.model || product.name || product.productName || 'Unknown Product';
                          const serialNo = product.serialNo || product.serialNumber || product.serial || '';
                          const total = price * qty;
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{name}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{serialNo || 'N/A'}</td>
                              <td className="px-4 py-3 text-center text-gray-600">{qty}</td>
                              <td className="px-4 py-3 text-right text-gray-600">₹{price.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">₹{total.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-blue-50 border-t-2 border-gray-300">
                          <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-800 text-base">Total Amount</td>
                          <td className="px-4 py-4 text-right font-bold text-blue-600 text-lg">₹{calculateTotal(viewingRecord).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

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
    </AdminLayout>
  );
}
