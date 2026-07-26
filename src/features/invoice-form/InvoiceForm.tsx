"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Scan, Trash2, ArrowLeft, RefreshCw, Plus, FileText, CheckCircle2, QrCode, FileSpreadsheet } from 'lucide-react';
import { useInvoiceForm } from './hooks/useInvoiceForm';
import { GSTBillingSection } from './components/GSTBillingSection';
import { CustomerInformationSection } from './components/CustomerInformationSection';
import { ProductsSection } from './components/ProductsSection';
import { PaymentSplitsSection } from './components/PaymentSplitsSection';
import { ScannerModals } from './components/ScannerModals';
import { LoadingSkeleton } from './components/LoadingSkeleton';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AdminLayout from '@/components/AdminLayout';
import { getApiUrl } from '@/lib/api';

interface FileObjectsState {
  [key: string]: File | File[];
}

interface FilesState {
  [key: string]: string;
}

export default function InvoiceForm() {
  const {
    loading,
    setLoading,
    formData,
    setFormData,
    products,
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
    addProduct,
    deleteProduct,
    updateProduct,
    searchProducts,
    handleCategoryChange,
    handleModelChange,
    fetchProductsByCategory,
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
  } = useInvoiceForm();

  // Attachments and dialog states
  const [files, setFiles] = useState<FilesState>({});
  const [fileObjects, setFileObjects] = useState<FileObjectsState>({});
  const [customAttachments, setCustomAttachments] = useState<{ id: number; name: string }[]>([]);
  const [fieldName, setFieldName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showLedgerListModal, setShowLedgerListModal] = useState(false);
  const [ledgerFilterFrom, setLedgerFilterFrom] = useState("");
  const [ledgerFilterTo, setLedgerFilterTo] = useState("");
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");

  // Ledger Creation State
  const [showNewLedgerModal, setShowNewLedgerModal] = useState(false);
  const [ledgerGstVerifying, setLedgerGstVerifying] = useState(false);
  const [ledgerData, setLedgerData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    pincode: "",
    gstNo: "",
    panCard: "",
    state: "Gujarat",
    country: "India"
  });

  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Poll for QR uploads
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/uploads/qr/${sessionId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.uploads) {
            setQrUploads(data.uploads);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionId, setQrUploads]);

  // Compute Invoice Totals Reactively
  const productItems = products.filter(
    (p) => (p.type || '').toLowerCase() !== 'accessory' && (p.type || '').toLowerCase() !== 'accessories'
  );
  const accessoryItems = products.filter(
    (p) => (p.type || '').toLowerCase() === 'accessory' || (p.type || '').toLowerCase() === 'accessories'
  );

  const productTotal = productItems.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
  const accessoryTotal = accessoryItems.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

  let accessoryDiscount = 0;
  if (productItems.length > 0 && productTotal > 0) {
    accessoryDiscount = productTotal > 65000 ? Math.min(accessoryTotal, 1000) : Math.min(accessoryTotal, 500);
  }

  const calculatedTotal = Math.max(0, productTotal + accessoryTotal - accessoryDiscount);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalAmount: calculatedTotal.toString(),
      _accessoryDiscount: accessoryDiscount
    }));
  }, [calculatedTotal, accessoryDiscount, setFormData]);

  const paymentModeTotal = Object.values(formData._paymentModes).reduce((sum, data: any) => {
    if (data.selected) {
      return sum + (parseFloat(data.amount || '0') || parseFloat(data.loanAmount || '0') || 0);
    }
    return sum;
  }, 0);

  const paymentMismatch = Math.abs(paymentModeTotal - calculatedTotal) >= 0.01;

  const handlePaymentModeChangeLocal = useCallback((mode: string, checked: boolean) => {
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
  }, [setFormData]);

  const handlePaymentAmountChangeLocal = useCallback((mode: string, amount: string) => {
    setFormData(prev => ({
      ...prev,
      _paymentModes: {
        ...prev._paymentModes,
        [mode]: {
          ...prev._paymentModes[mode as keyof typeof prev._paymentModes],
          ...(mode === 'Bajaj Finance'
            ? { loanAmount: amount, amount: amount }
            : { amount: amount }
          )
        }
      }
    }));
  }, [setFormData]);

  const validatePaymentModeFields = () => {
    const missingFields: string[] = [];
    Object.entries(formData._paymentModes).forEach(([mode, data]: [string, any]) => {
      if (data.selected) {
        if (mode !== 'Bajaj Finance' && (!data.amount || parseFloat(data.amount) <= 0)) {
          missingFields.push(`${mode}: Amount is required`);
        }
        if (mode === 'Bank') {
          if (!data.bankType) missingFields.push("Bank: Type is required (NEFT/RTGS/Cheque)");
          if (data.bankType === 'Net Banking' && !data.utrNumber) missingFields.push("Bank: UTR number is required");
          if (data.bankType === 'Cheque' && !data.chequeNumber) missingFields.push("Bank: Cheque number is required");
        }
        if (mode === 'UPI' && !data.upiTransactionId) {
          missingFields.push("UPI: Transaction ID is required");
        }
        if (mode === 'Machine') {
          if (!data.machineProvider) missingFields.push("Machine: Provider is required");
          if (!data.machineTransactionId) missingFields.push("Machine: Transaction ID is required");
        }
        if (mode === 'Bajaj Finance') {
          if (!data.loanAmount || parseFloat(data.loanAmount) <= 0) missingFields.push("Bajaj Finance: Loan amount is required");
          if (!data.loanId) missingFields.push("Bajaj Finance: Loan ID is required");
        }
      }
    });
    return missingFields;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFiles(prev => ({ ...prev, [label]: file.name }));
      setFileObjects(prev => ({ ...prev, [label]: file }));
    }
  };

  const removeFile = (label: string) => {
    setFiles(prev => {
      const copy = { ...prev };
      delete copy[label];
      return copy;
    });
    setFileObjects(prev => {
      const copy = { ...prev };
      delete copy[label];
      return copy;
    });
  };

  const addCustomAttachment = () => {
    if (fieldName.trim()) {
      setCustomAttachments(prev => [...prev, { id: Date.now(), name: fieldName.trim() }]);
      setFieldName("");
      setShowModal(false);
    }
  };

  const removeCustomAttachment = (id: number, name: string) => {
    setCustomAttachments(prev => prev.filter(att => att.id !== id));
    removeFile(name);
  };

  // Submit Handler
  const handleSubmitLocal = async () => {
    if (loading) return;

    if (!formData.companyName || !formData.branch || !formData.customerName) {
      alert('Please fill in required fields: Company Name, Branch, and Customer Name.');
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    const hasSelectedPayment = Object.values(formData._paymentModes).some((data: any) => data.selected);
    if (!hasSelectedPayment) {
      alert('Please select at least one payment mode.');
      return;
    }

    const missingPayment = validatePaymentModeFields();
    if (missingPayment.length > 0) {
      alert('Required payment fields missing:\n' + missingPayment.join('\n'));
      return;
    }

    if (calculatedTotal > 0 && paymentMismatch) {
      alert(`Payment mode total (₹${paymentModeTotal}) must match invoice total (₹${calculatedTotal})`);
      return;
    }

    setLoading(true);
    try {
      // Build products to submit, applying discount rules
      const submittedProducts = [];
      const accessoriesForSub = [];

      let runningAccessoryValue = 0;
      const sortedAccessories = [...accessoryItems].sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));

      for (const acc of sortedAccessories) {
        const price = parseFloat(acc.price) || 0;
        if (runningAccessoryValue + price <= accessoryDiscount) {
          accessoriesForSub.push({ ...acc, price: "0" });
          runningAccessoryValue += price;
        } else {
          if (runningAccessoryValue < accessoryDiscount) {
            const chargeable = price - (accessoryDiscount - runningAccessoryValue);
            accessoriesForSub.push({ ...acc, price: chargeable.toString() });
            runningAccessoryValue = accessoryDiscount;
          } else {
            accessoriesForSub.push(acc);
          }
        }
      }

      const allProductsToSubmit = [...productItems, ...accessoriesForSub];
      const productIds: string[] = [];

      for (const p of allProductsToSubmit) {
        const modelName = p.model.trim() || p.name.trim();
        if (!modelName || !p.price) continue;

        if (p.apiProductId) {
          productIds.push(p.apiProductId);
          continue;
        }

        // Create new catalog item if it doesn't exist
        const cat = p.type?.toLowerCase() || 'laptop';
        const prodRes = await fetch(`${getApiUrl()}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: modelName,
            model: modelName,
            price: parseFloat(p.price),
            srp: parseFloat(p.price),
            checkCode: p.checkCode.trim(),
            serialNumber: p.serialNumber.trim(),
            category: cat.includes('accessory') ? 'accessory' : cat.includes('aio') ? 'aio' : cat.includes('desktop') ? 'desktop' : 'laptop'
          })
        });

        const prodData = await prodRes.json();
        if (prodData.success && prodData.product) {
          productIds.push(prodData.product._id);
        }
      }

      // Create main billing record multipart form
      const dataToSend = new FormData();
      dataToSend.append('companyName', formData.companyName);
      dataToSend.append('branch', formData.branch);
      dataToSend.append('salesPerson', formData.salesPerson || localStorage.getItem('userId') || '');
      dataToSend.append('date', formData.date);
      dataToSend.append('salesType', formData.salesType);
      dataToSend.append('customerName', formData.customerName);
      dataToSend.append('address', formData.address);
      dataToSend.append('pinCode', formData.pinCode);
      dataToSend.append('contactPerson', formData.contactPerson || formData.customerName);
      dataToSend.append('mobile', formData.mobile);
      dataToSend.append('email', formData.email);
      dataToSend.append('gstNumber', formData.gstNumber);

      const paymentModesArray = Object.entries(formData._paymentModes)
        .filter(([_, data]: [string, any]) => data.selected)
        .map(([mode, data]: [string, any]) => ({
          mode,
          amount: parseFloat(data.amount || data.loanAmount || '0') || 0,
          ...data
        }));

      dataToSend.append('paymentMode', JSON.stringify(paymentModesArray));
      dataToSend.append('totalAmount', calculatedTotal.toString());

      productIds.forEach(id => dataToSend.append('products', id));
      
      const fullDetails = allProductsToSubmit.map((p, i) => ({
        _id: productIds[i] || null,
        name: p.model || p.name,
        model: p.model,
        price: parseFloat(p.price),
        serialNumber: p.serialNumber,
        checkCode: p.checkCode,
        claimCode: p.claimCode,
        timePeriod: p.timePeriod,
        cnToPartner: p.cnToPartner ? Number(p.cnToPartner) : 0
      }));
      dataToSend.append('productDetails', JSON.stringify(fullDetails));

      // Append Files
      Object.entries(fileObjects).forEach(([key, val]) => {
        const fieldMap: Record<string, string> = {
          'Customer ID': 'customerID',
          'Payment Slip': 'paymentSlip',
          'Inventory Image': 'inventoryPics',
          'Google Review': 'googleReview'
        };
        const backendField = fieldMap[key] || 'inventoryPics';
        if (Array.isArray(val)) {
          val.forEach(file => dataToSend.append(backendField, file));
        } else {
          dataToSend.append(backendField, val as File);
        }
      });

      if (qrUploads.length > 0) {
        dataToSend.append('sessionId', sessionId);
      }

      const billRes = await fetch(`${getApiUrl()}/api/billing/`, {
        method: 'POST',
        body: dataToSend,
        credentials: 'include'
      });

      const billData = await billRes.json();
      if (billData.success) {
        toast({ title: "Invoice Created", description: "Billing record saved successfully!" });
        sessionStorage.removeItem('invoiceSessionId');
        router.push(localStorage.getItem('userRole') === 'admin' ? '/dashboard' : '/billing');
      } else {
        alert(`Error: ${billData.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Ledger Creation handler
  const handleCreateLedger = async () => {
    if (!ledgerData.name || !ledgerData.phone) {
      alert("Name and phone are required for creating a ledger.");
      return;
    }
    try {
      const response = await fetch(`${getApiUrl()}/api/ledgers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(ledgerData)
      });
      const resData = await response.json();
      if (resData.success) {
        toast({ title: "Success", description: "Ledger created successfully!" });
        setShowNewLedgerModal(false);
        // Reset phone to trigger mobile lookup refresh
        setFormData(prev => ({ ...prev, mobile: ledgerData.phone }));
      } else {
        alert(resData.message || "Failed to create ledger.");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating ledger.");
    }
  };

  // Auto-fill ledger details from verification
  const verifyLedgerGST = async () => {
    if (ledgerData.gstNo.length !== 15) return;
    setLedgerGstVerifying(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/gst/verify/${ledgerData.gstNo}`);
      const result = await response.json();
      if (result.success) {
        const apiData = result.data?.raw?.data || result.data;
        const { legalName, tradeName, pincode, adr, pan } = apiData;
        setLedgerData(prev => ({
          ...prev,
          name: legalName || tradeName || prev.name,
          panCard: pan || prev.panCard,
          address: adr || prev.address,
          pincode: pincode || prev.pincode
        }));
        toast({ title: "Verified", description: "Ledger details filled!" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLedgerGstVerifying(false);
    }
  };

  const removeQRUpload = async (index: number) => {
    try {
      const upload = qrUploads[index];
      if (!upload?._id) return;
      const res = await fetch(`${getApiUrl()}/api/uploads/qr/${upload._id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        setQrUploads(prev => prev.filter((_, i) => i !== index));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const qrCodeUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/qr-upload/${sessionId}`;

  return (
    <AdminLayout>
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg border shadow-sm gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-7 h-7 text-blue-600" /> Invoice Creation Wizard
              </h1>
              <p className="text-sm text-gray-500 mt-1">Fill customer details, products, and attachment slips.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setShowLedgerListModal(true)}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-all hover:shadow hover:scale-[1.02] active:scale-95 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> View Ledger Directory
              </Button>
              <Button 
                onClick={() => setShowNewLedgerModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Customer Ledger
              </Button>
            </div>
          </div>

          {branches.length === 0 ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-6">
              <GSTBillingSection
                formData={formData}
                setFormData={setFormData}
                branches={branches}
                salesPersons={salesPersons}
                matchingLedgers={matchingLedgers}
                selectedLedgerId={selectedLedgerId}
                setSelectedLedgerId={setSelectedLedgerId}
                ledgers={ledgers}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />

              <CustomerInformationSection
                formData={formData}
                setFormData={setFormData}
                gstVerifying={gstVerifying}
                verifyGST={verifyGST}
                emailError={emailError}
                validateEmail={validateEmail}
              />

              <ProductsSection
                products={products}
                availableProducts={availableProducts}
                productSearchInputMap={productSearchInputMap}
                searchResultsMap={searchResultsMap}
                filteredProductsMap={filteredProductsMap}
                updateProduct={updateProduct}
                handleCategoryChange={handleCategoryChange}
                handleModelChange={handleModelChange}
                searchProducts={searchProducts}
                setProductSearchInputMap={setProductSearchInputMap}
                setSearchResultsMap={setSearchResultsMap}
                fetchProductsByCategory={fetchProductsByCategory}
                openExternalScanner={openExternalScanner}
                addProduct={addProduct}
                deleteProduct={deleteProduct}
              />

              <PaymentSplitsSection
                formData={formData}
                setFormData={setFormData}
                handlePaymentModeChange={handlePaymentModeChangeLocal}
                handlePaymentAmountChange={handlePaymentAmountChangeLocal}
                paymentModeTotal={paymentModeTotal}
              />

              {/* Attachments Section */}
              <section className="p-6 border rounded-lg shadow bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Slips & Document Attachments</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowQRModal(true)} className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" /> Scan from Mobile
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                      + Custom Field
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['Customer ID', 'Payment Slip', 'Inventory Image', 'Google Review'].map(label => (
                    <div key={label} className="p-4 border rounded-lg bg-gray-50 flex flex-col justify-between min-h-[120px]">
                      <Label className="font-semibold text-gray-700">{label}</Label>
                      {files[label] ? (
                        <div className="flex justify-between items-center mt-2 bg-white p-2 rounded border">
                          <span className="text-xs text-gray-600 truncate flex-1">{files[label]}</span>
                          <button onClick={() => removeFile(label)} className="text-rose-500 hover:text-rose-700 ml-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Input type="file" onChange={(e) => handleFileChange(e, label)} className="text-xs mt-2" />
                      )}
                    </div>
                  ))}

                  {customAttachments.map(att => (
                    <div key={att.id} className="p-4 border rounded-lg bg-gray-50 flex flex-col justify-between min-h-[120px]">
                      <div className="flex justify-between items-center">
                        <Label className="font-semibold text-gray-700">{att.name}</Label>
                        <button onClick={() => removeCustomAttachment(att.id, att.name)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {files[att.name] ? (
                        <div className="flex justify-between items-center mt-2 bg-white p-2 rounded border">
                          <span className="text-xs text-gray-600 truncate flex-1">{files[att.name]}</span>
                          <button onClick={() => removeFile(att.name)} className="text-rose-500 hover:text-rose-700 ml-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Input type="file" onChange={(e) => handleFileChange(e, att.name)} className="text-xs mt-2" />
                      )}
                    </div>
                  ))}
                </div>

                {qrUploads.length > 0 && (
                  <div className="mt-6 border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">QR Uploaded Slips:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {qrUploads.map((up, i) => (
                        <div key={i} className="p-2 border rounded-lg bg-gray-100 flex flex-col justify-between">
                          <img src={up.fileUrl} alt="slip" className="h-24 w-full object-cover rounded" />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">{up.fieldType || 'slip'}</span>
                            <button onClick={() => removeQRUpload(i)} className="text-rose-500 hover:text-rose-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pb-8">
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button
                  onClick={handleSubmitLocal}
                  disabled={loading || paymentMismatch}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 shadow font-semibold"
                >
                  {loading ? 'Submitting...' : `Submit Invoice (₹${calculatedTotal.toLocaleString('en-IN')})`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Attachment Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Attachment Slip</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2">Attachment Name</Label>
            <Input value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="e.g., Extended Warranty" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={addCustomAttachment} className="bg-blue-600 hover:bg-blue-700">Add Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Upload Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Mobile Upload QR Code</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-lg">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
              alt="QR Code"
              className="w-44 h-44 shadow border p-2 bg-white"
            />
            <p className="text-xs text-gray-500 max-w-xs">
              Scan this QR code with any mobile device to take camera pictures and upload customer slips directly.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQRModal(false)} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Ledger Modal */}
      <Dialog open={showNewLedgerModal} onOpenChange={setShowNewLedgerModal}>
        <DialogContent className="sm:max-w-2xl rounded-2xl p-6">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-6 h-6 text-emerald-600" /> Create Customer Ledger Profile
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Configure tax registration status and demographic details.</p>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4">
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">GST Identification Number</Label>
              <div className="flex gap-2">
                <Input
                  value={ledgerData.gstNo}
                  onChange={(e) => setLedgerData({ ...ledgerData, gstNo: e.target.value.toUpperCase() })}
                  placeholder="Enter 15-digit GST (e.g. 24AAFCH6549H1ZG)"
                  className="flex-1 bg-white uppercase font-mono tracking-wider text-sm h-11"
                />
                <Button 
                  onClick={verifyLedgerGST} 
                  disabled={ledgerGstVerifying}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-11 px-5"
                >
                  {ledgerGstVerifying ? 'Verifying...' : 'Verify Tax ID'}
                </Button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 block">Verifying auto-populates business name, address, state, and pincode.</span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Billing / Client Name *</Label>
              <Input 
                value={ledgerData.name} 
                onChange={(e) => setLedgerData({ ...ledgerData, name: e.target.value })} 
                placeholder="Full Customer / Company Name" 
                className="text-sm h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Contact Phone Number *</Label>
              <Input 
                value={ledgerData.phone} 
                onChange={(e) => setLedgerData({ ...ledgerData, phone: e.target.value.replace(/\D/g, '') })} 
                placeholder="10-digit mobile number" 
                maxLength={10} 
                className="text-sm h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Email Address</Label>
              <Input 
                value={ledgerData.email} 
                onChange={(e) => setLedgerData({ ...ledgerData, email: e.target.value })} 
                placeholder="client@example.com" 
                className="text-sm h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">PAN Card Number</Label>
              <Input 
                value={ledgerData.panCard} 
                onChange={(e) => setLedgerData({ ...ledgerData, panCard: e.target.value.toUpperCase() })} 
                placeholder="10-digit PAN (e.g. ABCDE1234F)" 
                className="text-sm h-10 font-mono uppercase"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Full Street Address</Label>
              <Input 
                value={ledgerData.address} 
                onChange={(e) => setLedgerData({ ...ledgerData, address: e.target.value })} 
                placeholder="Shop / House No, Building, Area, Street Name" 
                className="text-sm h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Postal Pincode</Label>
              <Input 
                value={ledgerData.pincode} 
                onChange={(e) => setLedgerData({ ...ledgerData, pincode: e.target.value.replace(/\D/g, '') })} 
                placeholder="6-digit postal code" 
                maxLength={6} 
                className="text-sm h-10 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Registered State</Label>
              <Input 
                value={ledgerData.state} 
                onChange={(e) => setLedgerData({ ...ledgerData, state: e.target.value })} 
                placeholder="State Name (e.g. Gujarat)" 
                className="text-sm h-10"
              />
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowNewLedgerModal(false)} className="rounded-xl px-5">Cancel</Button>
            <Button onClick={handleCreateLedger} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl px-5">
              Register Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Ledger List Modal */}
      <Dialog open={showLedgerListModal} onOpenChange={setShowLedgerListModal}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" /> Customer Ledger Directory
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">Search, filter, and view historical customer billing profiles.</p>
          </DialogHeader>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Search Directory</Label>
              <Input 
                type="text" 
                value={ledgerSearchTerm} 
                onChange={(e) => setLedgerSearchTerm(e.target.value)} 
                placeholder="Search name, phone, or GST..." 
                className="w-full bg-white text-sm h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">From Date</Label>
              <Input 
                type="date" 
                value={ledgerFilterFrom} 
                onChange={(e) => setLedgerFilterFrom(e.target.value)} 
                className="bg-white text-sm h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">To Date</Label>
              <Input 
                type="date" 
                value={ledgerFilterTo} 
                onChange={(e) => setLedgerFilterTo(e.target.value)} 
                className="bg-white text-sm h-10"
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5">Created Date</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5">Client Name</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5">Phone Number</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5">Email Address</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5">GST Identification</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5">PAN Card</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5">State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                      No customer ledgers created yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const filtered = ledgers.filter(l => {
                      if (ledgerFilterFrom) {
                        const date = l.createdAt ? new Date(l.createdAt) : null;
                        if (!date || date < new Date(ledgerFilterFrom)) return false;
                      }
                      if (ledgerFilterTo) {
                        const date = l.createdAt ? new Date(l.createdAt) : null;
                        if (!date || date > new Date(ledgerFilterTo + 'T23:59:59')) return false;
                      }
                      if (ledgerSearchTerm.trim()) {
                        const term = ledgerSearchTerm.toLowerCase().trim();
                        const nameMatch = (l.name || '').toLowerCase().includes(term);
                        const phoneMatch = (l.phone || '').toLowerCase().includes(term);
                        const gstMatch = (l.gstNo || '').toLowerCase().includes(term);
                        return nameMatch || phoneMatch || gstMatch;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                            No ledger records matches your filters.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return filtered.map((ledger, idx) => (
                      <TableRow key={ledger._id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-xs text-slate-500 font-medium py-3.5 whitespace-nowrap">
                          {ledger.createdAt ? new Date(ledger.createdAt).toLocaleDateString('en-GB') : '-'}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-800 py-3.5">{ledger.name}</TableCell>
                        <TableCell className="text-sm text-slate-600 py-3.5">{ledger.phone || '-'}</TableCell>
                        <TableCell className="text-sm text-slate-600 py-3.5">{ledger.email || '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded inline-block my-2.5">{ledger.gstNo || '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 py-3.5">{ledger.panCard || '-'}</TableCell>
                        <TableCell className="text-sm text-slate-600 py-3.5">{ledger.state || '-'}</TableCell>
                      </TableRow>
                    ));
                  })()
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setShowLedgerListModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-5">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScannerModals
        showSerialScanner={showSerialScanner}
        showCheckCodeScanner={showCheckCodeScanner}
        showModelScanner={showModelScanner}
        scannedValue={scannedValue}
        setScannedValue={setScannedValue}
        closeExternalScanner={closeExternalScanner}
        handleScannerKeyPress={handleScannerKeyPress}
        handleScannerInput={handleScannerInput}
        scannerInputRef={scannerInputRef}
      />
    </AdminLayout>
  );
}
