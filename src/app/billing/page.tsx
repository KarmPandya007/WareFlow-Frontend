"use client";

import Navbar from "@/components/Navbar";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { getApiUrl } from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";
import { AiOutlineFilePdf } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { handleDownloadPdf } from "@/lib/pdfGenerator";
import { BillingStats } from "@/components/BillingStats";
import { BillingCharts } from "@/components/BillingCharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function BillingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [branches, setBranches] = useState<any[]>([]);
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [selectedBranchForCharts, setSelectedBranchForCharts] = useState<string>('all');
  const [selectedSalesPersonForCharts, setSelectedSalesPersonForCharts] = useState<string>('all');
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalBills: 0,
    totalRevenue: 0,
    todayBills: 0,
    todayRevenue: 0,
    monthRevenue: 0
  });

  // Verify Role on Mount
  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'user' : 'user';
    const normalizedRole = role.toLowerCase();
    setUserRole(normalizedRole);

    if (normalizedRole !== 'sales_person' && normalizedRole !== 'salesman' && normalizedRole !== 'admin') {
      window.location.href = '/';
      return;
    }
  }, []);

  // Fetch static branch/salesperson descriptors
  useEffect(() => {
    const loadDescriptors = async () => {
      try {
        const [branchRes, spRes] = await Promise.all([
          fetch(`${getApiUrl()}/api/branches`, { credentials: 'include' }),
          fetch(`${getApiUrl()}/api/salespersons/`, { credentials: 'include' })
        ]);

        if (branchRes.ok) {
          const bData = await branchRes.json();
          if (bData.success && Array.isArray(bData.branches)) setBranches(bData.branches);
        }
        if (spRes.ok) {
          const spData = await spRes.json();
          if (spData.salesPersons) setSalesPersons(spData.salesPersons);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDescriptors();
  }, []);

  // Main Billing Fetcher (using Server Pagination and Filters)
  const fetchBillings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const response = await fetch(`${getApiUrl()}/api/billing?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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
        setBillingRecords(data.billings || []);
        setTotalCount(data.count || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
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
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchBillings();
  }, [fetchBillings]);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleDelete = useCallback(async (recordId: string) => {
    if (userRole !== 'admin') {
      toast({ title: "Error", description: "Only administrators can delete billing records", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/billing/${recordId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to delete record');
      
      toast({ title: "Success", description: "Billing deleted successfully" });
      setDeleteConfirmId(null);
      fetchBillings();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || 'Failed to delete record', variant: "destructive" });
    }
  }, [userRole, fetchBillings, toast]);

  const triggerDownloadPdf = async (record: any) => {
    setPdfDownloadingId(record._id);
    try {
      await handleDownloadPdf(record, branches);
      toast({ title: "PDF Generated", description: "Downloaded successfully!" });
    } catch (err) {
      toast({ title: "Error", description: "Could not generate invoice PDF", variant: "destructive" });
    } finally {
      setPdfDownloadingId(null);
    }
  };

  const resolveBranchName = (branch: any) => {
    if (!branch) return 'Main Branch';
    if (typeof branch === 'string') {
      const found = branches.find(b => b._id === branch || b.code === branch);
      return found ? found.name || found.branchName : 'Main Branch';
    }
    return branch.name || branch.code || branch.branchName || 'Main Branch';
  };

  const getSalesPersonName = (salesPerson: any) => {
    if (!salesPerson) return 'N/A';
    if (typeof salesPerson === 'string') return salesPerson;
    return `${salesPerson.firstName || ''} ${salesPerson.lastName || ''}`.trim() || 'N/A';
  };

  const formatPaymentMode = (input: any): string => {
    if (!input) return 'N/A';
    if (Array.isArray(input)) {
      return input.map(p => {
        if (p.mode === 'Bank' && p.bankType) return p.bankType;
        if (p.mode === 'UPI' && p.upiProvider) return p.upiProvider;
        if (p.mode === 'Machine' && p.machineProvider) return p.machineProvider;
        return p.mode;
      }).join(', ');
    }
    return String(input);
  };

  const SkeletonLoader = () => (
    <div className="p-6 space-y-4">
      {[...Array(itemsPerPage)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Billing Management
            </h1>
            <p className="text-xs text-gray-500 mt-1">Manage invoice history and tax receipts.</p>
          </div>
          <button
            onClick={() => (window.location.href = "/invoice-form")}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30 transition-all active:scale-95 text-sm font-semibold flex items-center gap-2"
          >
            + Create New Invoice
          </button>
        </div>

        <BillingStats stats={stats} />

        <BillingCharts
          userRole={userRole}
          branches={branches}
          salesPersons={salesPersons}
          selectedBranchForCharts={selectedBranchForCharts}
          setSelectedBranchForCharts={setSelectedBranchForCharts}
          selectedSalesPersonForCharts={selectedSalesPersonForCharts}
          setSelectedSalesPersonForCharts={setSelectedSalesPersonForCharts}
          currentChartIndex={currentChartIndex}
          setCurrentChartIndex={setCurrentChartIndex}
        />

        {/* Billings Record Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Billing Records</h2>
              <p className="text-xs sm:text-sm text-gray-500">Showing {billingRecords.length} of {totalCount} records</p>
            </div>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-medium"
              />
            </div>
          </div>

          {loading && isInitialLoading ? (
            <SkeletonLoader />
          ) : error ? (
            <div className="p-8 text-center text-rose-500 font-medium">{error}</div>
          ) : billingRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-medium">No matching billing records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4">Sales Person</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billingRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        <div>{record.customerName}</div>
                        <div className="text-xs text-gray-400 font-normal">{record.mobile || '-'}</div>
                      </td>
                      <td className="px-6 py-4">{resolveBranchName(record.branch)}</td>
                      <td className="px-6 py-4">{getSalesPersonName(record.salesPerson)}</td>
                      <td className="px-6 py-4">{formatPaymentMode(record.paymentMode)}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{(record.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">{new Date(record.date || record.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setViewingRecord(record)}
                            className="text-xs font-semibold text-blue-600 hover:underline px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => triggerDownloadPdf(record)}
                            disabled={pdfDownloadingId === record._id}
                            className="text-xs font-semibold text-emerald-600 hover:underline px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-all flex items-center gap-1"
                          >
                            <AiOutlineFilePdf className="w-3.5 h-3.5" />
                            {pdfDownloadingId === record._id ? 'Generating...' : 'PDF'}
                          </button>
                          {userRole === 'admin' && (
                            <button
                              onClick={() => setDeleteConfirmId(record._id)}
                              className="text-xs font-semibold text-rose-600 hover:underline px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-all"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Page <span className="font-semibold text-gray-900">{currentPage}</span> of <span className="font-semibold text-gray-900">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewing Details Dialog Modal */}
      <AnimatePresence>
        {viewingRecord && (
          <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Billing Transaction Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  <div>
                    <Label className="text-gray-400">Customer Name</Label>
                    <p className="font-bold text-gray-900">{viewingRecord.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Company Name</Label>
                    <p className="font-bold text-gray-900">{viewingRecord.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Mobile Number</Label>
                    <p className="text-gray-900">{viewingRecord.mobile || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Email Address</Label>
                    <p className="text-gray-900">{viewingRecord.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">GST Identification</Label>
                    <p className="font-mono text-gray-900">{viewingRecord.gstNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Total Invoice Amount</Label>
                    <p className="font-bold text-blue-600 text-lg">₹{(viewingRecord.totalAmount || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Invoiced Products</h4>
                  <div className="border rounded bg-gray-50 p-3 space-y-2">
                    {(viewingRecord.products || []).map((prod: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm border-b pb-1.5 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-gray-800">{prod.model || prod.name || 'Item'}</p>
                          {prod.serialNumber && <p className="text-xs text-gray-500">S/N: {prod.serialNumber}</p>}
                        </div>
                        <p className="font-semibold text-gray-900">₹{(prod.price || 0).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {viewingRecord.attachments && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-2">Attachments Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      {viewingRecord.attachments.customerID && <div className="p-2 border bg-gray-50 rounded">ID Proof attached</div>}
                      {viewingRecord.attachments.paymentSlip && <div className="p-2 border bg-gray-50 rounded">Payment Slip attached</div>}
                      {viewingRecord.attachments.googleReview && <div className="p-2 border bg-gray-50 rounded">Google Review screenshot attached</div>}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setViewingRecord(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">Are you sure you want to permanently delete this billing transaction? This action is irreversible.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="bg-rose-600 hover:bg-rose-700">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}