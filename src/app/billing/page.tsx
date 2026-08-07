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
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Filter, Loader2, Search, Trash2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useRouter } from "next/navigation";

export default function BillingPage() {
  const router = useRouter();
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
  const [showFilters, setShowFilters] = useState(false);
  const [recordBranch, setRecordBranch] = useState('all');
  const [recordSalesPerson, setRecordSalesPerson] = useState('all');
  const [recordPayment, setRecordPayment] = useState('all');
  const [recordFromDate, setRecordFromDate] = useState('');
  const [recordToDate, setRecordToDate] = useState('');
  const [sortBy, setSortBy] = useState<'customerName' | 'totalAmount' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
      router.replace('/');
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

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Main Billing Fetcher (using Server Pagination and Filters)
  const fetchBillings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      if (debouncedSearchTerm.trim()) {
        params.append("search", debouncedSearchTerm.trim());
      }
      if (recordBranch !== 'all') params.append('branch', recordBranch);
      if (recordSalesPerson !== 'all') params.append('salesPerson', recordSalesPerson);
      if (recordPayment !== 'all') params.append('paymentMode', recordPayment);
      if (recordFromDate) params.append('fromDate', recordFromDate);
      if (recordToDate) params.append('toDate', recordToDate);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortDirection);

      const response = await fetch(`${getApiUrl()}/api/billing?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/');
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
  }, [currentPage, debouncedSearchTerm, recordBranch, recordSalesPerson, recordPayment, recordFromDate, recordToDate, sortBy, sortDirection, router]);

  useEffect(() => {
    fetchBillings();
  }, [fetchBillings]);

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

  const activeFilterCount = [recordBranch, recordSalesPerson, recordPayment]
    .filter(value => value !== 'all').length + Number(Boolean(recordFromDate)) + Number(Boolean(recordToDate));

  const displayRecords = useMemo(() => {
    const filtered = billingRecords.filter(record => {
      const branchId = typeof record.branch === 'object' ? record.branch?._id || record.branch?.id : record.branch;
      const salesPersonId = typeof record.salesPerson === 'object' ? record.salesPerson?._id || record.salesPerson?.id : record.salesPerson;
      const payment = formatPaymentMode(record.paymentMode).toLowerCase();
      const rawDate = record.date || record.createdAt;
      const dateKey = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)
        ? rawDate.slice(0, 10)
        : new Date(rawDate).toISOString().slice(0, 10);

      if (recordBranch !== 'all' && String(branchId) !== recordBranch) return false;
      if (recordSalesPerson !== 'all' && String(salesPersonId) !== recordSalesPerson) return false;
      if (recordPayment !== 'all' && !payment.includes(recordPayment.toLowerCase())) return false;
      if (recordFromDate && dateKey < recordFromDate) return false;
      if (recordToDate && dateKey > recordToDate) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'customerName') comparison = String(a.customerName || '').localeCompare(String(b.customerName || ''));
      if (sortBy === 'totalAmount') comparison = Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      if (sortBy === 'date') comparison = new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [billingRecords, recordBranch, recordSalesPerson, recordPayment, recordFromDate, recordToDate, sortBy, sortDirection]);

  const visibleRevenue = displayRecords.reduce((sum, record) => sum + Number(record.totalAmount || 0), 0);
  const averageVisibleInvoice = displayRecords.length ? visibleRevenue / displayRecords.length : 0;

  const clearRecordFilters = () => {
    setCurrentPage(1);
    setRecordBranch('all');
    setRecordSalesPerson('all');
    setRecordPayment('all');
    setRecordFromDate('');
    setRecordToDate('');
  };

  const toggleSort = (column: 'customerName' | 'totalAmount' | 'date') => {
    setCurrentPage(1);
    if (sortBy === column) setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(column);
      setSortDirection(column === 'customerName' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ column }: { column: 'customerName' | 'totalAmount' | 'date' }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-600" />;
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
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-gray-50 dark:bg-slate-950 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Billing Management
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Manage invoice history and tax receipts.</p>
          </div>
          <button
            onClick={() => router.push("/invoice-form")}
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="border-b border-gray-100 p-4 sm:p-6 dark:border-slate-800">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">Billing Records</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                  Showing {displayRecords.length} records on this page · {totalCount.toLocaleString('en-IN')} total
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                <div className="relative min-w-0 flex-1 sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, mobile or invoice..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-9 text-sm font-medium text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-600 dark:focus:ring-blue-900"
                  />
                  {searchTerm && <button type="button" aria-label="Clear search" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>}
                </div>
                <Button type="button" variant="outline" onClick={() => setShowFilters(current => !current)} className={`h-11 rounded-xl ${showFilters || activeFilterCount ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300' : ''}`}>
                  <Filter className="mr-2 h-4 w-4" /> Filters
                  {activeFilterCount > 0 && <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 sm:grid-cols-2 xl:grid-cols-5 dark:border-slate-800 dark:bg-slate-950/50">
                <Select value={recordBranch} onValueChange={value => { setCurrentPage(1); setRecordBranch(value); }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Branch" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All branches</SelectItem>{branches.map(branch => { const id = branch._id || branch.id; return id ? <SelectItem key={id} value={String(id)}>{branch.name || branch.branchName || 'Unnamed branch'}</SelectItem> : null; })}</SelectContent>
                </Select>
                <Select value={recordSalesPerson} onValueChange={value => { setCurrentPage(1); setRecordSalesPerson(value); }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Sales person" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All sales persons</SelectItem>{salesPersons.map(person => { const id = person._id || person.id; const name = `${person.firstName || person.name || ''} ${person.lastName || ''}`.trim(); return id ? <SelectItem key={id} value={String(id)}>{name || 'Unnamed salesperson'}</SelectItem> : null; })}</SelectContent>
                </Select>
                <Select value={recordPayment} onValueChange={value => { setCurrentPage(1); setRecordPayment(value); }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Payment mode" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All payment modes</SelectItem>{['Cash', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Pinelabs', 'Brand Order', 'Bajaj Finance'].map(mode => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}</SelectContent>
                </Select>
                <div className="min-w-0 sm:col-span-2 xl:col-span-2">
                  <DateRangePicker
                    value={{ from: recordFromDate, to: recordToDate }}
                    onChange={({ from, to }) => { setCurrentPage(1); setRecordFromDate(from); setRecordToDate(to); }}
                    allowClear
                    placeholder="Filter by date range"
                  />
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-gray-500 dark:text-slate-400">Active filters:</span>
                {recordBranch !== 'all' && <button onClick={() => { setCurrentPage(1); setRecordBranch('all'); }} className="rounded-full bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{branches.find(branch => String(branch._id || branch.id) === recordBranch)?.name || 'Branch'} ×</button>}
                {recordSalesPerson !== 'all' && <button onClick={() => { setCurrentPage(1); setRecordSalesPerson('all'); }} className="rounded-full bg-violet-50 px-3 py-1.5 font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">Salesperson ×</button>}
                {recordPayment !== 'all' && <button onClick={() => { setCurrentPage(1); setRecordPayment('all'); }} className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{recordPayment} ×</button>}
                {(recordFromDate || recordToDate) && <button onClick={() => { setCurrentPage(1); setRecordFromDate(''); setRecordToDate(''); }} className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Date range ×</button>}
                <button onClick={clearRecordFilters} className="ml-1 font-semibold text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline dark:hover:text-slate-100">Clear all</button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-white py-3 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              <div className="px-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Visible invoices</p><p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-slate-100">{displayRecords.length}</p></div>
              <div className="px-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Visible revenue</p><p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-slate-100">₹{visibleRevenue.toLocaleString('en-IN')}</p></div>
              <div className="px-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Average invoice</p><p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-slate-100">₹{Math.round(averageVisibleInvoice).toLocaleString('en-IN')}</p></div>
            </div>
          </div>

          {loading && isInitialLoading ? (
            <SkeletonLoader />
          ) : error ? (
            <div className="p-8 text-center text-rose-500 font-medium">{error}</div>
          ) : displayRecords.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-gray-700 dark:text-slate-200">No matching billing records found</p>
              <p className="mt-1 text-sm text-gray-400">Try changing your search or filters.</p>
              {(activeFilterCount > 0 || searchTerm) && <Button variant="outline" size="sm" className="mt-4" onClick={() => { clearRecordFilters(); setSearchTerm(''); }}>Clear filters</Button>}
            </div>
          ) : (
            <div className="max-h-[650px] overflow-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-slate-400">
                <thead className="sticky top-0 z-10 bg-gray-50/95 text-xs font-semibold uppercase text-gray-700 backdrop-blur dark:bg-slate-800/95 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-4"><button type="button" onClick={() => toggleSort('customerName')} className="flex items-center gap-1.5 hover:text-blue-600">Customer <SortIcon column="customerName" /></button></th>
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4">Sales Person</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4 text-right"><button type="button" onClick={() => toggleSort('totalAmount')} className="ml-auto flex items-center gap-1.5 hover:text-blue-600">Total Amount <SortIcon column="totalAmount" /></button></th>
                    <th className="px-6 py-4"><button type="button" onClick={() => toggleSort('date')} className="flex items-center gap-1.5 hover:text-blue-600">Date <SortIcon column="date" /></button></th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {displayRecords.map((record) => (
                    <tr key={record._id} onDoubleClick={() => setViewingRecord(record)} className="group cursor-default transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-slate-100">
                        <div>{record.customerName}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-400 font-normal">{record.mobile || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{resolveBranchName(record.branch)}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{getSalesPersonName(record.salesPerson)}</td>
                      <td className="px-6 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{formatPaymentMode(record.paymentMode)}</span></td>
                      <td className="px-6 py-4 text-right font-bold tabular-nums text-gray-900 dark:text-slate-100">₹{Number(record.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 whitespace-nowrap tabular-nums text-gray-700 dark:text-slate-300">{new Date(record.date || record.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => setViewingRecord(record)}
                            title="View Details"
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950/50"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => triggerDownloadPdf(record)}
                            disabled={pdfDownloadingId === record._id}
                            title="Download PDF"
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 disabled:opacity-50"
                          >
                            {pdfDownloadingId === record._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <AiOutlineFilePdf className="w-4 h-4" />
                            )}
                          </button>
                          {userRole === 'admin' && (
                            <button
                              onClick={() => setDeleteConfirmId(record._id)}
                              title="Delete Record"
                              className="rounded-lg p-1.5 text-rose-600 opacity-70 transition hover:bg-rose-50 hover:opacity-100 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Showing <span className="font-semibold text-gray-900 dark:text-slate-100">{Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}–{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="font-semibold text-gray-900 dark:text-slate-100">{totalCount}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
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
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-slate-100">Billing Transaction Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div>
                    <Label className="text-gray-400 dark:text-slate-400">Customer Name</Label>
                    <p className="font-bold text-gray-900 dark:text-slate-100">{viewingRecord.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400 dark:text-slate-400">Company Name</Label>
                    <p className="font-bold text-gray-900 dark:text-slate-100">{viewingRecord.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400 dark:text-slate-400">Mobile Number</Label>
                    <p className="text-gray-900 dark:text-slate-200">{viewingRecord.mobile || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400 dark:text-slate-400">Email Address</Label>
                    <p className="text-gray-900 dark:text-slate-200">{viewingRecord.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400 dark:text-slate-400">GST Identification</Label>
                    <p className="font-mono text-gray-900 dark:text-slate-200">{viewingRecord.gstNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400 dark:text-slate-400">Total Invoice Amount</Label>
                    <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">₹{(viewingRecord.totalAmount || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 dark:text-slate-100 mb-2">Invoiced Products</h4>
                  <div className="border border-gray-200 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-800 p-3 space-y-2">
                    {(viewingRecord.products || []).map((prod: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm border-b border-gray-100 dark:border-slate-700 pb-1.5 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-slate-100">{prod.model || prod.name || 'Item'}</p>
                          {prod.serialNumber && <p className="text-xs text-gray-500 dark:text-slate-400">S/N: {prod.serialNumber}</p>}
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">₹{(prod.price || 0).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {viewingRecord.attachments && (() => {
                  const normalizeCloudinaryUrl = (value: unknown) =>
                    String(value || "").replace(
                      /^http:\/\/res\.cloudinary\.com/i,
                      "https://res.cloudinary.com"
                    );

                  const attachmentItems = [
                    viewingRecord.attachments.customerID && {
                      label: "Customer ID",
                      url: normalizeCloudinaryUrl(viewingRecord.attachments.customerID),
                    },
                    viewingRecord.attachments.paymentSlip && {
                      label: "Payment Slip",
                      url: normalizeCloudinaryUrl(viewingRecord.attachments.paymentSlip),
                    },
                    viewingRecord.attachments.googleReview && {
                      label: "Google Review",
                      url: normalizeCloudinaryUrl(viewingRecord.attachments.googleReview),
                    },
                    ...(Array.isArray(viewingRecord.attachments.inventoryPics)
                      ? viewingRecord.attachments.inventoryPics.map((url: string, index: number) => ({
                          label: `Inventory Photo ${index + 1}`,
                          url: normalizeCloudinaryUrl(url),
                        }))
                      : []),
                  ].filter((item): item is { label: string; url: string } => Boolean(item && item.url));

                  return (
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-slate-100 mb-2">Attachments</h4>
                      {attachmentItems.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground border border-border bg-muted/40 rounded-lg">
                          No attachments available
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {attachmentItems.map((item) => (
                            <a
                              key={`${item.label}-${item.url}`}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative block aspect-video overflow-hidden rounded-lg border border-border bg-muted/40"
                            >
                              <img
                                src={item.url}
                                alt={item.label}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white">
                                {item.label}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
