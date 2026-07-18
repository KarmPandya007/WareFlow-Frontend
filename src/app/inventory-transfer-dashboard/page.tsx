"use client";

import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, FileSpreadsheet, Eye, Scan, X } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface Transfer {
  _id: string;
  date: string;
  product: {
    _id: string;
    name: string;
    model: string;
  };
  quantity: number;
  sourceGodown: {
    _id: string;
    name: string;
  };
  destinationGodown: {
    _id: string;
    name: string;
  };
  batchNo: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

interface Product {
  _id: string;
  name: string;
  model: string;
  category?: string;
  type?: string;
}

interface Godown {
  _id: string;
  name: string;
}

interface Branch {
  _id: string;
  name: string;
}

export default function InventoryTransferPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [isLoadingGodowns, setIsLoadingGodowns] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [dateRange, setDateRange] = useState({ fromDate: "", toDate: "" });
  
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [sourceGodownId, setSourceGodownId] = useState<string>("");
  const [destinationGodownId, setDestinationGodownId] = useState<string>("");
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; batchNo: string; serialNumber?: string }>>([]);
  const [selectedSerialNumber, setSelectedSerialNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<Transfer | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [scannedValue, setScannedValue] = useState<string>("");
  const scannerInputRef = useRef<HTMLInputElement>(null);

  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [productSearchInput, setProductSearchInput] = useState<string>("");
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const productSearchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = productSearchRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setProductSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [productSearchRef]);

  useEffect(() => {
    const loadData = async () => {
      await fetchTransfers();
      setIsInitialLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      Promise.all([
        fetchProducts(),
        fetchGodowns(),
        fetchBranches()
      ]);
    }
  }, [isModalOpen]);



  useEffect(() => {
    // Derive categories from API products if available, otherwise use fallback
    const categories = products.map(p => p.category).filter((cat): cat is string => cat !== undefined);
    const fallback = ['laptop', 'desktop', 'aio', 'accessory'];
    const uniqueCategories = Array.from(new Set([...categories, ...fallback]));
    setProductCategories(uniqueCategories);
  }, [products]);



  useEffect(() => {
    if (selectedCategory && apiResponse && apiResponse.products) {
      const categoryKey = selectedCategory === 'laptop'
        ? 'laptops'
        : selectedCategory === 'desktop'
          ? 'desktops'
          : selectedCategory === 'aio'
            ? 'aios'
            : selectedCategory === 'accessory'
              ? 'accessories'
              : null;

      const filtered = categoryKey ? (apiResponse.products[categoryKey] || []) : [];
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [selectedCategory, apiResponse, products]);

  const fetchGodowns = async () => {
    try {
      setIsLoadingGodowns(true);
      const response = await fetch(`${getApiUrl()}/api/godowns/all`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        console.log('Godowns API Response:', result);
        
        if (result.godowns && Array.isArray(result.godowns)) {
          setGodowns(result.godowns);
        } else if (result.data && Array.isArray(result.data)) {
          setGodowns(result.data);
        } else if (Array.isArray(result)) {
          setGodowns(result);
        } else {
          console.error('Invalid godowns response format:', result);
          setGodowns([]);
        }
      } else {
        console.error('Godowns response not OK:', response.status, response.statusText);
        setGodowns([]);
      }
    } catch (error) {
      console.error('Error fetching godowns:', error);
      setGodowns([]);
    } finally {
      setIsLoadingGodowns(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await fetch(`${getApiUrl()}/api/products`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        console.log('Products API Response:', result);

        if (result.success && result.products) {
          setApiResponse(result);
          const allProducts = [
            ...(result.products.laptops || []).map((p: any) => ({ ...p, category: 'laptop' })),
            ...(result.products.desktops || []).map((p: any) => ({ ...p, category: 'desktop' })),
            ...(result.products.aios || []).map((p: any) => ({ ...p, category: 'aio' })),
            ...(result.products.accessories || []).map((p: any) => ({ ...p, category: 'accessory' }))
          ];
          setProducts(allProducts);
        } else if (result.products && Array.isArray(result.products)) {
          setProducts(result.products);
        } else if (result.data && Array.isArray(result.data)) {
          setProducts(result.data);
        } else if (Array.isArray(result)) {
          setProducts(result);
        } else {
          console.error('Invalid products response format:', result);
          setProducts([]);
        }
      } else {
        console.error('Products response not OK:', response.status, response.statusText);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Updated fetchBranches to handle the API response structure
  const fetchBranches = async () => {
    try {
      setIsLoadingBranches(true);
      const response = await fetch(`${getApiUrl()}/api/branches/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Branches API Response:', result);
        if (result.success && Array.isArray(result.branches)) {
          setBranches(result.branches);
        } else {
          console.error('Unexpected branches response format:', result);
        }
      } else {
        console.error('Failed to fetch branches:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      setIsLoadingTransfers(true);
      const response = await fetch(`${getApiUrl()}/api/inventory-transfers/all`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', result);

        // Extract the data array from the response and normalize product
        if (result.data && Array.isArray(result.data)) {
          // Try to fetch products to enrich transfers (if server returns only product ids)
          let productsList: any[] = [];
          try {
            const pRes = await fetch(`${getApiUrl()}/api/products`, { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
            if (pRes.ok) {
              const pJson = await pRes.json();
              productsList = pJson.products || pJson.data || (Array.isArray(pJson) ? pJson : []);
            }
          } catch (e) {
            console.warn('Failed to fetch products for enrichment', e);
          }

          // Ensure productsList is an array before calling forEach
          if (!Array.isArray(productsList)) {
            console.warn('Expected productsList to be an array, but received:', productsList);
            productsList = [];
          }

          const prodMap: Record<string, any> = {};
          productsList.forEach((p: any) => { if (p && (p._id || p.id)) prodMap[p._id || p.id] = p; });

          const normalized = result.data.map((t: any) => {
            // Normalize product: if object, use it; if string id, lookup in prodMap; else fallback
            let prod: any = { _id: '', name: 'Unknown', model: '' };
            if (t.product && typeof t.product === 'object') prod = t.product;
            else if (t.product && typeof t.product === 'string') prod = prodMap[t.product] || { _id: t.product, name: 'Unknown', model: '' };
            else if (t.product && t.product._id) prod = t.product;
            return { ...t, product: prod };
          });
          setTransfers(normalized);
          console.log('Transfers set:', normalized);
        } else {
          console.error('Invalid response format:', result);
          setTransfers([]);
        }
      } else {
        console.error('Response not OK:', response.status, response.statusText);
        setTransfers([]);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      setTransfers([]);
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setProductId("");
    setQuantity("1");
    setSourceGodownId("");
    setDestinationGodownId("");
    setMessage(null);
    setSelectedCategory("");
    setItems([]);
    setProductSearchInput("");
    setProductSearchResults([]);
    setSelectedSerialNumber("");
  };

  // External Scanner functions
  const openExternalScanner = () => {
    setShowSerialScanner(true);
    setScannedValue("");
    // Auto-focus the input field after modal renders
    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 100);
  };

  const handleScannerInput = (value: string) => {
    if (value.trim()) {
      setSelectedSerialNumber(value.trim());
      toast({
        title: "Serial Number Scanned!",
        description: `Serial number: ${value.trim()}`,
        variant: "default",
      });
      closeExternalScanner();
    }
  };

  const closeExternalScanner = () => {
    setShowSerialScanner(false);
    setScannedValue("");
  };

  // Handle Enter key press in scanner input
  const handleScannerKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScannerInput(scannedValue);
    }
  };

  const addItem = () => {
    if (!productId || !quantity || !selectedSerialNumber) {
      setMessage('Please fill product, quantity and select serial number before adding an item');
      return;
    }
    const newItem = { productId, quantity: parseInt(quantity), batchNo: selectedSerialNumber, serialNumber: selectedSerialNumber };
    setItems(prev => [...prev, newItem]);
    setProductId("");
    setProductSearchInput("");
    setQuantity("1");
    setSelectedSerialNumber("");
    setMessage(null);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const downloadTransferExcel = async (transfer: Transfer) => {
    try {
      const XLSX = await import("xlsx");
      // Format date as DD-MM-YYYY
      const formattedDate = new Date(transfer.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();

      // Header row
      const worksheetData: any[] = [["Voucher Date", "Voucher Type Name", "Voucher Number", "Item Name", "Billed Quantity", "Item Rate Per", "Item Allocations - Godown Name", "Consumption/Production (Stock Journal)", "Change Mode", "Item Allocations - Batch/Lot No."]];

      // If transfer has `items` array (multiple products), iterate items; otherwise fallback to single-product shape
      if ((transfer as any).items && Array.isArray((transfer as any).items) && (transfer as any).items.length > 0) {
        const items = (transfer as any).items;
        // Use product name from first item for filename fallback
        const firstProd = items[0].product || { name: 'transfer', model: '' };
        // For voucher number we can use a base
        const voucherBase = Math.floor(Date.now() / 1000);

        items.forEach((it: any, idx: number) => {
          const prod = it.product || { name: 'Unknown', model: '' };
          const fullProduct = products.find(p => p._id === prod._id);
          const category = fullProduct?.category || '';
          let prefix = '';
          if (category === 'laptop') prefix = 'ASUS NB ';
          else if (category === 'aio') prefix = 'ASUS AIO ';
          else if (category === 'desktop') prefix = 'ASUS DT ';
          const itemName = prefix + (prod.model ? `${prod.name || ''} ${prod.model}` : (prod.name || ''));
          const qty = it.quantity ?? 0;
          const batch = it.batchNo || transfer.batchNo || '';
          const voucherNumber = String(voucherBase + idx + 1);

          worksheetData.push([formattedDate, "Stock Journal", voucherNumber, itemName, qty, "pcs", transfer.sourceGodown?.name || '', "consumption", "Use for Stock Journal", batch]);
          worksheetData.push([formattedDate, "Stock Journal", voucherNumber, itemName, qty, "pcs", transfer.destinationGodown?.name || '', "production", "Use for Stock Journal", batch]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        worksheet['!cols'] = [ { wch: 12 },{ wch: 15 },{ wch: 15 },{ wch: 25 },{ wch: 15 },{ wch: 15 },{ wch: 25 },{ wch: 30 },{ wch: 22 },{ wch: 30 } ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "StockJournal");
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        const firstNameSafe = (items[0].product?.name || 'transfer').replace(/\s+/g, '_');
        XLSX.writeFile(workbook, `StockJournal_${firstNameSafe}_${timestamp}.xlsx`);
        return;
      }

      // Fallback: older single-product transfer shape
      const prod = (transfer as any).product || { name: 'Unknown', model: '' };
      const fullProduct = products.find(p => p._id === prod._id);
      const category = fullProduct?.category || '';
      let prefix = '';
      if (category === 'laptop') prefix = 'ASUS NB ';
      else if (category === 'aio') prefix = 'ASUS AIO ';
      else if (category === 'desktop') prefix = 'ASUS DT ';
      const itemName = prefix + (prod.model ? `${prod.name || ''} ${prod.model}` : (prod.name || ''));
      const voucherNumber = '100';
      worksheetData.push([formattedDate, "Stock Journal", voucherNumber, itemName, (transfer as any).quantity ?? 0, "pcs", transfer.sourceGodown?.name || '', "consumption", "Use for Stock Journal", transfer.batchNo || '']);
      worksheetData.push([formattedDate, "Stock Journal", voucherNumber, itemName, (transfer as any).quantity ?? 0, "pcs", transfer.destinationGodown?.name || '', "production", "Use for Stock Journal", transfer.batchNo || '']);

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 12 }, // A - Voucher Date
        { wch: 15 }, // B - Voucher Type
        { wch: 15 }, // C - Voucher Number
        { wch: 25 }, // D - Item Name
        { wch: 15 }, // E - Billed Quantity
        { wch: 15 }, // F - Item Rate Per
        { wch: 25 }, // G - Item Allocations - Godown Name
        { wch: 30 }, // H - Consumption/Production
        { wch: 22 }, // I - Change Mode
        { wch: 30 }  // J - Item Allocations - Batchlot No.
      ];

      // Apply yellow background to header row
      const headerStyle = {
        fill: { fgColor: { rgb: "FFFF00" } },
        font: { bold: true }
      };

      // Apply styles to header cells (row 1)
      for (let col = 0; col < 10; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = headerStyle;
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, "StockJournal");
      
      // Download file
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      const fileNameSafe = (prod.name || 'transfer').replace(/\s+/g, '_');
      XLSX.writeFile(workbook, `StockJournal_${fileNameSafe}_${timestamp}.xlsx`);
    } catch (err) {
      console.error("Download error:", err);
      alert('Failed to download Excel file');
    }
  };
  const exportToTally = async (transferId: string) => {
  if (!confirm("Send this transfer directly to Tally?")) return;

  try {
    const res = await fetch(
      `${getApiUrl()}/api/inventory-transfers/export-to-tally/${transferId}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Tally export error:", data);
      alert(`Failed to export: ${data.message || "Unknown error"}`);
      return;
    }

    console.log("Tally export success:", data);
    alert("Exported to Tally successfully. Check Tally vouchers.");
  } catch (error) {
    console.error("Tally export error:", error);
    alert("Failed to communicate with Tally server.");
  }
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!sourceGodownId || !destinationGodownId) {
      setMessage("Please select source and destination godowns.");
      return;
    }

    // Allow submission if items are added OR if current form fields are filled
    if (items.length === 0 && (!productId || !quantity || !selectedSerialNumber)) {
      setMessage("Please fill in all required fields or add at least one item.");
      return;
    }

    setIsLoading(true);
    try {
      // Prepare transfer data for API according to InventoryTransfer model:
      // - `items` is an array of { product, quantity, batchNo }
      // - `sourceGodown` and `destinationGodown` are ObjectId refs to Godown
      const transferData: any = {
        date,
        items: items.length > 0 ? items.map(it => ({ product: it.productId, quantity: it.quantity, batchNo: it.serialNumber, serialNumber: it.serialNumber })) : [
          {
            product: productId,
            quantity: parseInt(quantity),
            batchNo: selectedSerialNumber,
          }
        ],
        batchNo: selectedSerialNumber || (items[0] ? items[0].serialNumber : undefined),
        sourceGodown: sourceGodownId,
        destinationGodown: destinationGodownId,
      };

      console.log('Sending transfer data (before mapping):', transferData);
      console.log('Product ID:', productId);
      console.log('Source Branch ID (selected):', sourceGodownId);
      console.log('Destination Branch ID (selected):', destinationGodownId);
      console.log('Available products:', products.map(p => ({ id: p._id, name: p.name })));
      console.log('Available branches:', branches.map(b => ({ id: b._id, name: b.name })));

      // Try a simple branch -> godown name match to send a godown _id when available.
      // This keeps the dropdown showing branches but attempts to send a valid godown id
      // if the godown list contains an entry with the same name.
      try {
        const srcBranch = branches.find(b => b._id === sourceGodownId);
        const dstBranch = branches.find(b => b._id === destinationGodownId);

        const mappedSourceGodown = srcBranch
          ? godowns.find(g => (g.name || '').toLowerCase() === (srcBranch.name || '').toLowerCase())
          : undefined;
        const mappedDestGodown = dstBranch
          ? godowns.find(g => (g.name || '').toLowerCase() === (dstBranch.name || '').toLowerCase())
          : undefined;

        if (mappedSourceGodown) {
          // send existing Godown _id (preferred)
          transferData.sourceGodown = mappedSourceGodown._id;
          console.log('Mapping source branch to godown id:', mappedSourceGodown._id, mappedSourceGodown.name);
        } else if (srcBranch) {
          // no existing godown — send branch name so server can create/find Godown from Branch
          transferData.sourceGodown = srcBranch.name;
          console.log('Sending source as branch name for server-side resolve:', srcBranch.name);
        }

        if (mappedDestGodown) {
          transferData.destinationGodown = mappedDestGodown._id;
          console.log('Mapping destination branch to godown id:', mappedDestGodown._id, mappedDestGodown.name);
        } else if (dstBranch) {
          transferData.destinationGodown = dstBranch.name;
          console.log('Sending destination as branch name for server-side resolve:', dstBranch.name);
        }
      } catch (mapErr) {
        console.warn('Branch->Godown mapping failed, proceeding with selected ids', mapErr);
        // If mapping fails, keep the original values (server will attempt to resolve them)
      }

      // Send data to API
      const response = await fetch(`${getApiUrl()}/api/inventory-transfers/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData?.message || `Failed to save transfer: ${response.status} ${response.statusText}`);
      }

      const savedTransfer = await response.json();

      // Get product and branch names from IDs (we show branch names in dropdown)
      const selectedProduct = products.find(p => p._id === productId);
      const selectedSourceGodown = branches.find(b => b._id === sourceGodownId);
      const selectedDestGodown = branches.find(b => b._id === destinationGodownId);

      const itemName = selectedProduct 
        ? (selectedProduct.model ? `${selectedProduct.name} ${selectedProduct.model}` : selectedProduct.name)
        : '';
      const sourceGodownName = selectedSourceGodown ? selectedSourceGodown.name : '';
      const destGodownName = selectedDestGodown ? selectedDestGodown.name : '';

      setMessage("Inventory transfer saved successfully!");
      resetForm();
      setIsModalOpen(false);
      fetchTransfers(); // Refresh the table
    } catch (err) {
      console.error("Submit error:", err);
      setMessage(`Failed to save transfer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const SkeletonLoader = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Transfer Summary</TableHead>
          <TableHead>Source Godown</TableHead>
          <TableHead>Destination Godown</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-48" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
            <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-40" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout>
      <div className="p-3 sm:p-4">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <CardTitle className="text-lg sm:text-xl">Inventory Transfer</CardTitle>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setShowDateRangeModal(true)} className="flex-1 sm:flex-none text-xs sm:text-sm min-w-0">
                <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Export By Date</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none text-xs sm:text-sm min-w-0">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Inventory Transfer</span>
                <span className="sm:hidden">Transfer</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <SkeletonLoader />
            ) : (
            <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transfer Summary</TableHead>
                  <TableHead>Source Godown</TableHead>
                  <TableHead>Destination Godown</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {isLoadingTransfers && !isInitialLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Loading transfers...
                      </TableCell>
                    </TableRow>
                  ) : transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No transfers found. Click "+ Inventory Transfer" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfers.map((transfer: any) => {
                      // Handle both new format (items array) and old format (single product)
                      const transferItems = (transfer as any).items;
                      const transferDate = new Date(transfer.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      }).replace(/\//g, '-');
                      const createdDate = new Date(transfer.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      }).replace(/\//g, '-');

                      let summaryText = '';
                      let totalQuantity = 0;

                      if (transferItems && Array.isArray(transferItems) && transferItems.length > 0) {
                        // New format: items array - show summary
                        const itemCount = transferItems.length;
                        totalQuantity = transferItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
                        summaryText = `${itemCount} item${itemCount > 1 ? 's' : ''} (${totalQuantity} units)`;
                      } else if (transfer.product && typeof transfer.product === 'object') {
                        // Old format: single product object
                        const getProductDisplayName = (product: any) => {
                          if (!product) return 'Unknown item';
                          if (product.name && product.model) {
                            return `${product.name} ${product.model}`;
                          }
                          return product.model || product.name || 'Unknown item';
                        };
                        const itemName = getProductDisplayName(transfer.product);
                        totalQuantity = transfer.quantity || 0;
                        summaryText = `${itemName} (${totalQuantity} units)`;
                      } else {
                        // Fallback
                        totalQuantity = transfer.quantity || 0;
                        summaryText = `1 item (${totalQuantity} units)`;
                      }

                      return (
                        <TableRow key={transfer._id}>
                          <TableCell>{transferDate}</TableCell>
                          <TableCell>
                            <span className="font-medium">{summaryText}</span>
                          </TableCell>
                          <TableCell>{transfer.sourceGodown?.name || ''}</TableCell>
                          <TableCell>{transfer.destinationGodown?.name || ''}</TableCell>
                          <TableCell>
                            {transfer.createdBy ? `${transfer.createdBy.firstName} ${transfer.createdBy.lastName || ''}`.trim() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingTransfer(transfer)}
                                className="p-2"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadTransferExcel(transfer)}
                              >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Excel
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => exportToTally(transfer._id)}
                              >
                                Tally
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
              </TableBody>
            </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {isLoadingTransfers && !isInitialLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading transfers...
                </div>
              ) : transfers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No transfers found. Click "+ Transfer" to create one.
                </div>
              ) : (
                transfers.map((transfer: any) => {
                  const transferItems = (transfer as any).items;
                  const transferDate = new Date(transfer.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  }).replace(/\//g, '-');

                  let summaryText = '';
                  let totalQuantity = 0;

                  if (transferItems && Array.isArray(transferItems) && transferItems.length > 0) {
                    const itemCount = transferItems.length;
                    totalQuantity = transferItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
                    summaryText = `${itemCount} item${itemCount > 1 ? 's' : ''} (${totalQuantity} units)`;
                  } else if (transfer.product && typeof transfer.product === 'object') {
                    const getProductDisplayName = (product: any) => {
                      if (!product) return 'Unknown item';
                      if (product.name && product.model) {
                        return `${product.name} ${product.model}`;
                      }
                      return product.model || product.name || 'Unknown item';
                    };
                    const itemName = getProductDisplayName(transfer.product);
                    totalQuantity = transfer.quantity || 0;
                    summaryText = `${itemName} (${totalQuantity} units)`;
                  } else {
                    totalQuantity = transfer.quantity || 0;
                    summaryText = `1 item (${totalQuantity} units)`;
                  }

                  return (
                    <div key={transfer._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">{transferDate}</div>
                          <h3 className="font-semibold text-gray-900 text-sm">{summaryText}</h3>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingTransfer(transfer)}
                          className="p-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-xs text-gray-500 block">Source</span>
                          <span className="text-gray-700">{transfer.sourceGodown?.name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Destination</span>
                          <span className="text-gray-700">{transfer.destinationGodown?.name || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-gray-500 block">Created By</span>
                          <span className="text-gray-700">{transfer.createdBy ? `${transfer.createdBy.firstName} ${transfer.createdBy.lastName || ''}`.trim() : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadTransferExcel(transfer)}
                          className="flex-1 text-xs"
                        >
                          <FileSpreadsheet className="mr-1 h-3 w-3" />
                          Excel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportToTally(transfer._id)}
                          className="flex-1 text-xs"
                        >
                          Tally
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </>
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">New Inventory Transfer</DialogTitle>
            </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          disabled
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Product Category</Label>
                        <Select
                          value={selectedCategory}
                          onValueChange={(value) => {
                              setSelectedCategory(value);
                              setProductId(""); // Reset product selection when category changes
                              setProductSearchInput("");
                              setProductSearchResults([]);
                            }}
                          disabled={isLoadingProducts}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder={isLoadingProducts ? 'Loading categories...' : 'Select category'} />
                          </SelectTrigger>
                          <SelectContent>
                            {productCategories.filter(Boolean).map((category) => (
                              <SelectItem key={category} value={category}>
                                {category === 'aio' ? 'AIO' : category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="product">Product</Label>
                        <div className="relative" ref={productSearchRef}>
                          <Input
                            id="product"
                            placeholder={!selectedCategory ? 'Select category first' : 'Search product by name or model'}
                            value={productSearchInput}
                            onChange={(e) => {
                              const q = (e.target as HTMLInputElement).value;
                              setProductSearchInput(q);
                              // perform search
                              let list: any[] = [];
                              if (apiResponse && apiResponse.products) {
                                const categoryKey = selectedCategory === 'laptop'
                                  ? 'laptops'
                                  : selectedCategory === 'desktop'
                                    ? 'desktops'
                                    : selectedCategory === 'aio'
                                      ? 'aios'
                                      : selectedCategory === 'accessory'
                                        ? 'accessories'
                                        : null;
                                list = categoryKey ? (apiResponse.products[categoryKey] || []) : [];
                              } else {
                                list = filteredProducts.length ? filteredProducts : products;
                              }
                              const ql = q.toLowerCase();
                              const matches = list.filter((p: any) => {
                                const label = ((p.model || p.name) || '').toString().toLowerCase();
                                return !ql || label.includes(ql);
                              });
                              setProductSearchResults(matches || []);
                            }}
                            disabled={isLoadingProducts || !selectedCategory}
                            onFocus={() => {
                              // show results on focus
                              const q = productSearchInput || '';
                              let list: any[] = [];
                              if (apiResponse && apiResponse.products) {
                                const categoryKey = selectedCategory === 'laptop'
                                  ? 'laptops'
                                  : selectedCategory === 'desktop'
                                    ? 'desktops'
                                    : selectedCategory === 'aio'
                                      ? 'aios'
                                      : selectedCategory === 'accessory'
                                        ? 'accessories'
                                        : null;
                                list = categoryKey ? (apiResponse.products[categoryKey] || []) : [];
                              } else {
                                list = filteredProducts.length ? filteredProducts : products;
                              }
                              const ql = q.toLowerCase();
                              const matches = list.filter((p: any) => {
                                const label = ((p.model || p.name) || '').toString().toLowerCase();
                                return !ql || label.includes(ql);
                              });
                              setProductSearchResults(matches || []);
                            }}
                            className="w-full"
                          />
                          {productSearchResults && productSearchResults.length > 0 && (
                            <ul className="absolute z-10 bg-white border border-gray-300 rounded w-full max-h-48 overflow-y-auto mt-1 shadow-lg ring-1 ring-slate-100">
                              {productSearchResults.map((p: any) => (
                                <li
                                  key={p._id || p.id || (p.name + p.model)}
                                  className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                                  onMouseDown={() => {
                                    setProductId(p._id || p.id || '');
                                    setProductSearchInput(p.model || p.name || '');
                                    setProductSearchResults([]);
                                  }}
                                >
                                  {(p.model || p.name) || 'Unnamed Product'}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="serial-number">Serial Number</Label>
                        <div className="flex gap-2">
                          <Input
                            id="serial-number"
                            placeholder="Scan or enter serial number"
                            value={selectedSerialNumber}
                            onChange={(e) => setSelectedSerialNumber(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            className="px-3 bg-purple-500 hover:bg-purple-600 text-white"
                            title="Scan Serial Number"
                            onClick={openExternalScanner}
                          >
                            <Scan className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="Enter quantity"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sourceGodown">Source Godown</Label>
                        <Select
                          value={sourceGodownId}
                          onValueChange={setSourceGodownId}
                          disabled={isLoadingGodowns || isLoadingBranches}
                        >
                          <SelectTrigger id="sourceGodown">
                            <SelectValue placeholder={(isLoadingGodowns || isLoadingBranches) ? 'Loading...' : 'Select source godown'} />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.length > 0 && (
                              branches.map((branch) => (
                                <SelectItem key={branch._id} value={branch._id}>
                                  {branch.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="destinationGodown">Destination Godown</Label>
                        <Select
                          value={destinationGodownId}
                          onValueChange={setDestinationGodownId}
                          disabled={isLoadingGodowns || isLoadingBranches}
                        >
                          <SelectTrigger id="destinationGodown">
                            <SelectValue placeholder={(isLoadingGodowns || isLoadingBranches) ? 'Loading...' : 'Select destination godown'} />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.length > 0 && (
                              branches.map((branch) => (
                                <SelectItem key={branch._id} value={branch._id}>
                                  {branch.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-2">
                      <div className="flex-1">
                        <Button type="button" onClick={addItem} disabled={!productId}>
                          Add Item
                        </Button>
                      </div>
                      <div className="flex-1 text-right text-sm text-gray-600">Items added: <span className="font-medium">{items.length}</span></div>
                    </div>

                    {items.length > 0 && (
                      <div className="mt-3 border rounded p-3 bg-gray-50">
                        <h4 className="font-semibold mb-2">Items</h4>
                        <ul className="space-y-2">
                          {items.map((it, idx) => {
                            const prod = products.find(p => p._id === it.productId) || (filteredProducts.find(p => p._id === it.productId));
                            const getProductDisplayName = (product: Product | undefined) => {
                              if (!product) return 'Unknown item';
                              if (product.name && product.model) {
                                return `${product.name} ${product.model}`;
                              }
                              return product.model || product.name || 'Unknown item';
                            };
                            const label = getProductDisplayName(prod);
                            return (
                              <li key={idx} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div>
                                  <div className="text-sm font-medium">{label}</div>
                                  <div className="text-xs text-gray-500">Qty: {it.quantity} • Batch: {it.batchNo} {it.serialNumber ? `• Serial: ${it.serialNumber}` : ''}</div>
                                </div>
                                <div>
                                  <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>Remove</Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {message && (
                      <div className="p-4 rounded-xl text-center text-green-700 border-2 border-green-200 bg-green-50 transition-all duration-300">
                        <p className="font-medium">{message}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsModalOpen(false);
                          resetForm();
                        }}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                      >
                        {isLoading ? 'Submitting...' : 'Submit Transfer'}
                      </Button>
                    </div>
                  </form>
                  {/* Serial modal removed per request - inline serial selection remains above */}
          </DialogContent>
        </Dialog>

        {/* View Transfer Details Modal */}
        {viewingTransfer && (
          <Dialog open={!!viewingTransfer} onOpenChange={() => setViewingTransfer(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Transfer Details</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 sm:space-y-6">
                {/* Transfer Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400">Transfer Information</h3>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Date</span>
                        <span className="text-sm text-gray-700">
                          {new Date(viewingTransfer.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Source</span>
                          <span className="text-sm text-gray-700">{viewingTransfer.sourceGodown?.name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Destination</span>
                          <span className="text-sm text-gray-700">{viewingTransfer.destinationGodown?.name || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Created By</span>
                        <span className="text-sm text-gray-700">{viewingTransfer.createdBy ? `${viewingTransfer.createdBy.firstName} ${viewingTransfer.createdBy.lastName || ''}`.trim() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400">Transfer Summary</h3>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Created At</span>
                        <span className="text-sm text-gray-700">
                          {new Date(viewingTransfer.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Total Items</span>
                        <span className="text-sm text-gray-700">
                          {(() => {
                            const transferItems = (viewingTransfer as any).items;
                            if (transferItems && Array.isArray(transferItems)) {
                              const totalQty = transferItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
                              return `${transferItems.length} item${transferItems.length > 1 ? 's' : ''} (${totalQty} units)`;
                            }
                            return `1 item (${viewingTransfer.quantity || 0} units)`;
                          })()} 
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400">Transferred Items</h3>
                  
                  {/* Desktop Table */}
                  <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Product Name</th>
                          <th className="px-4 py-3">Serial Number</th>
                          <th className="px-4 py-3 text-center">Quantity</th>
                          <th className="px-4 py-3">Batch Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          const transferItems = (viewingTransfer as any).items;
                          
                          if (transferItems && Array.isArray(transferItems) && transferItems.length > 0) {
                            return transferItems.map((item: any, idx: number) => {
                              const getProductDisplayName = (product: any) => {
                                if (!product) return 'Unknown item';
                                if (product.name && product.model) {
                                  return `${product.name} ${product.model}`;
                                }
                                return product.model || product.name || 'Unknown item';
                              };
                              const itemName = getProductDisplayName(item.product);
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{itemName}</div>
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {item.product?.serialNumber || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-600">
                                    {item.quantity || 0}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {item.batchNo || viewingTransfer.batchNo || 'N/A'}
                                  </td>
                                </tr>
                              );
                            });
                          } else {
                            const getProductDisplayName = (product: any) => {
                              if (!product || typeof product !== 'object') return 'Unknown item';
                              if (product.name && product.model) {
                                return `${product.name} ${product.model}`;
                              }
                              return product.model || product.name || 'Unknown item';
                            };
                            const itemName = getProductDisplayName(viewingTransfer.product);
                            
                            return (
                              <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{itemName}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">N/A</td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                  {viewingTransfer.quantity || 0}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {viewingTransfer.batchNo || 'N/A'}
                                </td>
                              </tr>
                            );
                          }
                        })()} 
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-3">
                    {(() => {
                      const transferItems = (viewingTransfer as any).items;
                      
                      if (transferItems && Array.isArray(transferItems) && transferItems.length > 0) {
                        return transferItems.map((item: any, idx: number) => {
                          const getProductDisplayName = (product: any) => {
                            if (!product) return 'Unknown item';
                            if (product.name && product.model) {
                              return `${product.name} ${product.model}`;
                            }
                            return product.model || product.name || 'Unknown item';
                          };
                          const itemName = getProductDisplayName(item.product);
                          
                          return (
                            <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="font-medium text-gray-900 mb-2">{itemName}</div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-xs text-gray-500 block">Serial Number</span>
                                  <span className="text-gray-700">{item.product?.serialNumber || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block">Quantity</span>
                                  <span className="text-gray-700">{item.quantity || 0}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-xs text-gray-500 block">Batch Number</span>
                                  <span className="text-gray-700">{item.batchNo || viewingTransfer.batchNo || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      } else {
                        const getProductDisplayName = (product: any) => {
                          if (!product || typeof product !== 'object') return 'Unknown item';
                          if (product.name && product.model) {
                            return `${product.name} ${product.model}`;
                          }
                          return product.model || product.name || 'Unknown item';
                        };
                        const itemName = getProductDisplayName(viewingTransfer.product);
                        
                        return (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="font-medium text-gray-900 mb-2">{itemName}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-xs text-gray-500 block">Serial Number</span>
                                <span className="text-gray-700">N/A</span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 block">Quantity</span>
                                <span className="text-gray-700">{viewingTransfer.quantity || 0}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-xs text-gray-500 block">Batch Number</span>
                                <span className="text-gray-700">{viewingTransfer.batchNo || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })()} 
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                <Button variant="outline" onClick={() => setViewingTransfer(null)} className="w-full sm:w-auto">
                  Close
                </Button>
                <Button onClick={() => downloadTransferExcel(viewingTransfer)} className="w-full sm:w-auto">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download Excel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Date Range Export Modal */}
        <Dialog open={showDateRangeModal} onOpenChange={setShowDateRangeModal}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Export Transfers by Date Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowDateRangeModal(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!dateRange.fromDate || !dateRange.toDate) {
                      toast({ title: "Error", description: "Please select both dates", variant: "destructive" });
                      return;
                    }
                    try {
                      const filtered = transfers.filter((t: any) => {
                        const tDate = new Date(t.date);
                        const from = new Date(dateRange.fromDate);
                        const to = new Date(dateRange.toDate);
                        return tDate >= from && tDate <= to;
                      });
                      
                      if (filtered.length === 0) {
                        toast({ title: "No Data", description: "No transfers found in selected date range", variant: "destructive" });
                        return;
                      }

                      const XLSX = await import("xlsx");
                      const worksheetData: any[] = [["Voucher Date", "Voucher Type Name", "Voucher Number", "Item Name", "Billed Quantity", "Item Rate Per", "Item Allocations - Godown Name", "Consumption/Production (Stock Journal)", "Change Mode", "Item Allocations - Batch/Lot No."]];

                      filtered.forEach((transfer: any, idx: number) => {
                        const formattedDate = new Date(transfer.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }).replace(/\//g, '-');
                        const voucherBase = Math.floor(Date.now() / 1000) + idx;

                        const transferItems = transfer.items;
                        if (transferItems && Array.isArray(transferItems) && transferItems.length > 0) {
                          transferItems.forEach((it: any, itemIdx: number) => {
                            const prod = it.product || { name: 'Unknown', model: '' };
                            const fullProduct = products.find(p => p._id === prod._id);
                            const category = fullProduct?.category || '';
                            let prefix = '';
                            if (category === 'laptop') prefix = 'ASUS NB ';
                            else if (category === 'aio') prefix = 'ASUS AIO ';
                            else if (category === 'desktop') prefix = 'ASUS DT ';
                            const itemName = prefix + (prod.model ? `${prod.name || ''} ${prod.model}` : (prod.name || ''));
                            const qty = it.quantity ?? 0;
                            const batch = it.batchNo || transfer.batchNo || '';
                            const voucherNumber = String(voucherBase + itemIdx + 1);

                            worksheetData.push([formattedDate, "Stock Journal", voucherNumber, itemName, qty, "pcs", transfer.sourceGodown?.name || '', "consumption", "Use for Stock Journal", batch]);
                            worksheetData.push([formattedDate, "Stock Journal", voucherNumber, itemName, qty, "pcs", transfer.destinationGodown?.name || '', "production", "Use for Stock Journal", batch]);
                          });
                        } else {
                          const prod = transfer.product || { name: 'Unknown', model: '' };
                          const fullProduct = products.find(p => p._id === prod._id);
                          const category = fullProduct?.category || '';
                          let prefix = '';
                          if (category === 'laptop') prefix = 'ASUS NB ';
                          else if (category === 'aio') prefix = 'ASUS AIO ';
                          else if (category === 'desktop') prefix = 'ASUS DT ';
                          const itemName = prefix + (prod.model ? `${prod.name || ''} ${prod.model}` : (prod.name || ''));
                          const voucherNumber = String(voucherBase + 1);
                          worksheetData.push([formattedDate, "Stock Journal", voucherNumber, itemName, transfer.quantity ?? 0, "pcs", transfer.sourceGodown?.name || '', "consumption", "Use for Stock Journal", transfer.batchNo || '']);
                          worksheetData.push([formattedDate, "Stock Journal", voucherNumber, itemName, transfer.quantity ?? 0, "pcs", transfer.destinationGodown?.name || '', "production", "Use for Stock Journal", transfer.batchNo || '']);
                        }
                      });

                      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
                      worksheet['!cols'] = [
                        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
                        { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 22 }, { wch: 30 }
                      ];

                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, "StockJournal");
                      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
                      XLSX.writeFile(workbook, `InventoryTransfers_${dateRange.fromDate}_to_${dateRange.toDate}_${timestamp}.xlsx`);
                      
                      toast({ title: "Success", description: `Exported ${filtered.length} transfers` });
                      setShowDateRangeModal(false);
                      setDateRange({ fromDate: "", toDate: "" });
                    } catch (err) {
                      console.error("Export error:", err);
                      toast({ title: "Error", description: "Failed to export transfers", variant: "destructive" });
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Excel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
      </div>
    </AdminLayout>
  );
}
