"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, Award, Download, Upload, Search } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useCallback } from "react";

interface ProductTarget {
  category: 'laptops' | 'desktops' | 'aios' | 'accessories';
  targetValue: number;
  currentValue: number;
  specificProducts?: string[];
  progressPercentage?: number;
  isCompleted?: boolean;
}

interface Target {
  _id: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  targetType: string;
  targetValue?: number;
  currentValue?: number;
  productTargets?: ProductTarget[];
  incentiveAmount?: number;
  incentiveStatus?: 'pending' | 'paid' | 'cancelled';
  incentivePaidDate?: string | null;
  period: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  contactNo: string;
  employeeId: string;
}

export default function TargetsPage() {
  const { toast } = useToast();
  const [targets, setTargets] = useState<Target[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<any>(null);
  const [showSalesPersonTargets, setShowSalesPersonTargets] = useState(false);
  
  const [selectedUserId, setSelectedUserId] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [period, setPeriod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: "", name: "" });
  const [viewDialog, setViewDialog] = useState({ open: false, target: null as Target | null });
  const [endDate, setEndDate] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [productTargets, setProductTargets] = useState({
    laptops: '',
    desktops: '',
    aios: '',
    accessories: ''
  });
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string[]>>({
    laptops: [],
    desktops: [],
    aios: [],
    accessories: []
  });
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productSearchQueries, setProductSearchQueries] = useState<Record<string, string>>({
    laptops: '',
    desktops: '',
    aios: '',
    accessories: ''
  });
  const [filteredProducts, setFilteredProducts] = useState<Record<string, any[]>>({
    laptops: [],
    desktops: [],
    aios: [],
    accessories: []
  });
  const [incentiveAmount, setIncentiveAmount] = useState("");
  const [incentiveSource, setIncentiveSource] = useState<'api' | 'custom'>('custom');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast({ title: "Error", description: "Please select an Excel file", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(`${getApiUrl()}/api/targets/bulk-upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      console.log('=== BULK UPLOAD RESPONSE ===');
      console.log('Full response:', data);
      console.log('Success:', data.success);
      console.log('Results:', data.results);
      console.log('=== END RESPONSE ===');

      if (response.ok && data.success) {
        const { results } = data;
        const successCount = results.success?.length || 0;
        const failedCount = results.failed?.length || 0;
        
        let message = `Upload completed! ${successCount} targets created successfully.`;
        if (failedCount > 0) {
          message += ` ${failedCount} rows failed.`;
        }
        
        toast({ title: "Success", description: message });
        
        // Show detailed results if there are failures
        if (failedCount > 0) {
          console.log('=== FAILED ROWS DETAILS ===');
          results.failed.forEach((failure: any) => {
            console.log(`Row ${failure.row}: ${failure.reason}`);
            console.log('Failed data:', failure);
          });
          console.log('=== END FAILED ROWS ===');
        }
        
        await fetchTargets();
        await calculateProgress();
        setShowUploadModal(false);
        setUploadFile(null);
      } else {
        toast({ title: "Upload failed", description: data.message || "Failed to upload Excel file", variant: "destructive" });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Error", description: "An error occurred during upload", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSalespersonExcel = async (person: any, personTargets: Target[]) => {
    try {
      const XLSX = await import("xlsx");
      
      const worksheetData: any[] = [[
        "Target Type",
        "Target Value",
        "Current Progress",
        "Progress %",
        "Status",
        "Period",
        "Start Date",
        "End Date",
        "Incentive Amount",
        "Incentive Status"
      ]];

      personTargets.forEach((target) => {
        const targetTypeDisplay = getTargetTypeDisplay(target.targetType);
        
        if (target.targetType === 'product_based' && target.productTargets) {
          target.productTargets.forEach((pt) => {
            const progress = pt.progressPercentage ?? getProgressPercentage(pt.currentValue, pt.targetValue);
            worksheetData.push([
              `${targetTypeDisplay} - ${pt.category.charAt(0).toUpperCase() + pt.category.slice(1)}`,
              `${pt.targetValue} units`,
              `${pt.currentValue} units`,
              `${progress.toFixed(1)}%`,
              target.status.charAt(0).toUpperCase() + target.status.slice(1),
              target.period.charAt(0).toUpperCase() + target.period.slice(1),
              formatDate(target.startDate),
              formatDate(target.endDate),
              target.incentiveAmount ? `₹${target.incentiveAmount.toLocaleString()}` : 'N/A',
              target.incentiveStatus || 'pending'
            ]);
          });
        } else {
          const progress = getProgressPercentage(target.currentValue || 0, target.targetValue || 1);
          worksheetData.push([
            targetTypeDisplay,
            formatTargetValue(target.targetValue || 0, target.targetType),
            formatTargetValue(target.currentValue || 0, target.targetType),
            `${progress.toFixed(1)}%`,
            target.status.charAt(0).toUpperCase() + target.status.slice(1),
            target.period.charAt(0).toUpperCase() + target.period.slice(1),
            formatDate(target.startDate),
            formatDate(target.endDate),
            target.incentiveAmount ? `₹${target.incentiveAmount.toLocaleString()}` : 'N/A',
            target.incentiveStatus || 'pending'
          ]);
        }
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      worksheet['!cols'] = [
        { wch: 20 }, // Target Type
        { wch: 15 }, // Target Value
        { wch: 15 }, // Current Progress
        { wch: 12 }, // Progress %
        { wch: 12 }, // Status
        { wch: 12 }, // Period
        { wch: 12 }, // Start Date
        { wch: 12 }, // End Date
        { wch: 15 }, // Incentive Amount
        { wch: 15 }  // Incentive Status
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Targets");
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      const salespersonName = `${person.firstName}_${person.lastName}`.replace(/\s+/g, '_');
      XLSX.writeFile(workbook, `${salespersonName}_Targets_${timestamp}.xlsx`);
      
      toast({ title: "Success", description: `${person.firstName} ${person.lastName}'s targets exported successfully!` });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({ title: "Error", description: "Failed to export salesperson targets to Excel", variant: "destructive" });
    }
  };

  const downloadTargetsExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      
      const worksheetData: any[] = [[
        "Salesperson Name",
        "Email", 
        "Target Type",
        "Target Value",
        "Current Progress",
        "Progress %",
        "Status",
        "Period",
        "Start Date",
        "End Date",
        "Incentive Amount",
        "Incentive Status"
      ]];

      targets.forEach((target) => {
        const salespersonName = getSalespersonName(target);
        const email = target.user?.email || 'N/A';
        const targetTypeDisplay = getTargetTypeDisplay(target.targetType);
        
        if (target.targetType === 'product_based' && target.productTargets) {
          target.productTargets.forEach((pt) => {
            const progress = pt.progressPercentage ?? getProgressPercentage(pt.currentValue, pt.targetValue);
            worksheetData.push([
              salespersonName,
              email,
              `${targetTypeDisplay} - ${pt.category.charAt(0).toUpperCase() + pt.category.slice(1)}`,
              `${pt.targetValue} units`,
              `${pt.currentValue} units`,
              `${progress.toFixed(1)}%`,
              target.status.charAt(0).toUpperCase() + target.status.slice(1),
              target.period.charAt(0).toUpperCase() + target.period.slice(1),
              formatDate(target.startDate),
              formatDate(target.endDate),
              target.incentiveAmount ? `₹${target.incentiveAmount.toLocaleString()}` : 'N/A',
              target.incentiveStatus || 'pending'
            ]);
          });
        } else {
          const progress = getProgressPercentage(target.currentValue || 0, target.targetValue || 1);
          worksheetData.push([
            salespersonName,
            email,
            targetTypeDisplay,
            formatTargetValue(target.targetValue || 0, target.targetType),
            formatTargetValue(target.currentValue || 0, target.targetType),
            `${progress.toFixed(1)}%`,
            target.status.charAt(0).toUpperCase() + target.status.slice(1),
            target.period.charAt(0).toUpperCase() + target.period.slice(1),
            formatDate(target.startDate),
            formatDate(target.endDate),
            target.incentiveAmount ? `₹${target.incentiveAmount.toLocaleString()}` : 'N/A',
            target.incentiveStatus || 'pending'
          ]);
        }
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      worksheet['!cols'] = [
        { wch: 20 }, // Salesperson Name
        { wch: 25 }, // Email
        { wch: 20 }, // Target Type
        { wch: 15 }, // Target Value
        { wch: 15 }, // Current Progress
        { wch: 12 }, // Progress %
        { wch: 12 }, // Status
        { wch: 12 }, // Period
        { wch: 12 }, // Start Date
        { wch: 12 }, // End Date
        { wch: 15 }, // Incentive Amount
        { wch: 15 }  // Incentive Status
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Targets");
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      XLSX.writeFile(workbook, `Targets_Report_${timestamp}.xlsx`);
      
      toast({ title: "Success", description: "Targets exported to Excel successfully!" });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({ title: "Error", description: "Failed to export targets to Excel", variant: "destructive" });
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return (category: string, query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const categoryProducts = availableProducts.filter(p => p.category === category);
          if (!query.trim()) {
            setFilteredProducts(prev => ({ ...prev, [category]: categoryProducts }));
            return;
          }
          const filtered = categoryProducts.filter(product => 
            (product.name || product.model || '').toLowerCase().includes(query.toLowerCase())
          );
          setFilteredProducts(prev => ({ ...prev, [category]: filtered }));
        }, 300);
      };
    }, [availableProducts]),
    [availableProducts]
  );

  const handleProductSearch = (category: string, query: string) => {
    setProductSearchQueries(prev => ({ ...prev, [category]: query }));
    debouncedSearch(category, query);
  };

  const fetchAvailableProducts = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/products/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.products) {
          const allProducts = [
            ...(result.products.laptops || []).map((p: any) => ({ ...p, category: 'laptops' })),
            ...(result.products.desktops || []).map((p: any) => ({ ...p, category: 'desktops' })),
            ...(result.products.aios || []).map((p: any) => ({ ...p, category: 'aios' })),
            ...(result.products.accessories || []).map((p: any) => ({ ...p, category: 'accessories' }))
          ];
          setAvailableProducts(allProducts);
          // Initialize filtered products
          const categorized = {
            laptops: allProducts.filter(p => p.category === 'laptops'),
            desktops: allProducts.filter(p => p.category === 'desktops'),
            aios: allProducts.filter(p => p.category === 'aios'),
            accessories: allProducts.filter(p => p.category === 'accessories')
          };
          setFilteredProducts(categorized);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const calculateProgress = async () => {
    setIsCalculating(true);
    try {
      const billingResponse = await fetch(`${getApiUrl()}/api/billing/`, {
        credentials: 'include',
      });
      
      if (!billingResponse.ok) {
        setIsCalculating(false);
        return;
      }
      
      const billingData = await billingResponse.json();
      const billings = billingData.billings || [];
      
      const targetsResponse = await fetch(`${getApiUrl()}/api/targets/all`, {
        credentials: 'include',
      });
      
      if (!targetsResponse.ok) {
        setIsCalculating(false);
        return;
      }
      
      const targetsData = await targetsResponse.json();
      const allTargets = targetsData.targets || [];
      const now = new Date();
      
      const updatedTargets = allTargets.map((target: any) => {
        const targetStart = new Date(target.startDate);
        const targetEnd = new Date(target.endDate);
        const userId = target.user?._id || target.user;
        
        const relevantBillings = billings.filter((billing: any) => {
          const billingDate = new Date(billing.date || billing.createdAt);
          const salesPersonId = billing.salesPerson?._id || billing.salesPerson;
          return salesPersonId === userId && billingDate >= targetStart && billingDate <= targetEnd;
        });
        
        let newStatus = target.status;
        
        if (target.targetType === 'product_based' && target.productTargets) {
          const productCounts: any = { laptops: 0, desktops: 0, aios: 0, accessories: 0 };
          
          relevantBillings.forEach((billing: any) => {
            const products = billing.products || billing.productDetails || [];
            
            products.forEach((product: any) => {
              let category = (product.category || product.type || '').toLowerCase().trim();
              
              if (!category) {
                const productName = (product.name || product.model || product.productName || '').toLowerCase();
                
                if (productName.includes('laptop')) category = 'laptops';
                else if (productName.includes('desktop')) category = 'desktops';
                else if (productName.includes('aio') || productName.includes('all-in-one') || productName.includes('all in one')) category = 'aios';
                else if (productName.includes('mouse') || productName.includes('keyboard') || productName.includes('headset') || 
                         productName.includes('webcam') || productName.includes('speaker') || productName.includes('bag') ||
                         productName.includes('cable') || productName.includes('adapter')) category = 'accessories';
              } else {
                if (category.includes('laptop')) category = 'laptops';
                else if (category.includes('desktop')) category = 'desktops';
                else if (category.includes('aio') || category.includes('all-in-one')) category = 'aios';
                else if (category.includes('accessor')) category = 'accessories';
              }
              
              const qty = Number(product.quantity || product.qty || 1);
              
              if (productCounts.hasOwnProperty(category)) {
                productCounts[category] += qty;
              }
            });
          });
          
          target.productTargets = target.productTargets.map((pt: any) => ({
            ...pt,
            currentValue: productCounts[pt.category] || 0,
            progressPercentage: Math.min((productCounts[pt.category] || 0) / pt.targetValue * 100, 100),
            isCompleted: (productCounts[pt.category] || 0) >= pt.targetValue
          }));
          
          const allCompleted = target.productTargets.every((pt: any) => pt.isCompleted);
          if (allCompleted) {
            newStatus = 'completed';
          } else if (now > targetEnd) {
            newStatus = 'overdue';
          } else {
            newStatus = 'active';
          }
        } else if (target.targetType === 'billing_amount') {
          const totalAmount = relevantBillings.reduce((sum: number, billing: any) => {
            return sum + (Number(billing.totalAmount) || 0);
          }, 0);
          target.currentValue = totalAmount;
          
          if (target.currentValue >= target.targetValue) {
            newStatus = 'completed';
          } else if (now > targetEnd) {
            newStatus = 'overdue';
          } else {
            newStatus = 'active';
          }
        } else if (target.targetType === 'billing_count') {
          target.currentValue = relevantBillings.length;
          
          if (target.currentValue >= target.targetValue) {
            newStatus = 'completed';
          } else if (now > targetEnd) {
            newStatus = 'overdue';
          } else {
            newStatus = 'active';
          }
        }
        
        target.status = newStatus;
        return target;
      });
      
      // Update status in database for targets that changed
      const updatePromises = updatedTargets
        .filter((target: any) => {
          const original = allTargets.find((t: any) => t._id === target._id);
          return original && original.status !== target.status;
        })
        .map(async (target: any) => {
          try {
            await fetch(`${getApiUrl()}/api/targets/${target._id}`, {
              method: 'PUT',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: target.status }),
            });
          } catch (error) {
            console.error(`Failed to update status for target ${target._id}:`, error);
          }
        });
      
      await Promise.all(updatePromises);
      setTargets(updatedTargets);
    } catch (error) {
      console.error('Error calculating progress:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleEdit = (target: Target) => {
    setEditingTarget(target);
    setSelectedUserId(target.user?._id || "");
    setTargetType(target.targetType);
    setTargetValue(target.targetValue?.toString() || "");
    setPeriod(target.period);
    setStartDate(target.startDate.split('T')[0]);
    setEndDate(target.endDate.split('T')[0]);
    
    if (target.targetType === 'product_based' && target.productTargets) {
      const pts = { laptops: '', desktops: '', aios: '', accessories: '' };
      const selectedProds: Record<string, string[]> = { laptops: [], desktops: [], aios: [], accessories: [] };
      target.productTargets.forEach(pt => {
        pts[pt.category] = pt.targetValue.toString();
        selectedProds[pt.category] = pt.specificProducts || [];
      });
      setProductTargets(pts);
      setSelectedProducts(selectedProds);
    } else {
      setProductTargets({ laptops: '', desktops: '', aios: '', accessories: '' });
      setSelectedProducts({ laptops: [], desktops: [], aios: [], accessories: [] });
    }
    setIncentiveAmount(target.incentiveAmount?.toString() || '');
    setIncentiveSource(target.incentiveAmount ? 'custom' : 'api');
    
    setIsModalOpen(true);
  };

  const handleView = (target: Target) => {
    setViewDialog({ open: true, target });
  };

  const handleDelete = (target: Target) => {
    setDeleteDialog({
      open: true,
      id: target._id,
      name: getSalespersonName(target)
    });
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/targets/${deleteDialog.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        await fetchTargets();
        setDeleteDialog({ open: false, id: "", name: "" });
        toast({ title: "Success", description: "Target deleted successfully." });
      } else {
        toast({ title: "Delete failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Delete failed", description: "Please try again.", variant: "destructive" });
      setDeleteDialog({ open: false, id: "", name: "" });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      await Promise.all([
        fetchTargets(),
        fetchUsers(),
        fetchSalespersons(),
        fetchAvailableProducts()
      ]);
      await calculateProgress();
      setIsDataLoading(false);
      setIsInitialLoading(false);
    };
    loadData();
  }, []);

  const fetchTargets = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/targets/all`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTargets(data.targets || []);
      }
    } catch (error) {
      console.error('Error fetching targets:', error);
    }
  };

  const fetchSalespersons = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/salespersons/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSalespersons(data.salesPersons || []);
      }
    } catch (error) {
      console.error('Error fetching salesperson :', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/salespersons/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.salesPersons || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId || !targetType || !period || !startDate || !endDate) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    
    if (targetType === 'product_based') {
      const hasAnyTarget = Object.values(productTargets).some(v => v && parseInt(v) > 0);
      if (!hasAnyTarget) {
        toast({ title: "Error", description: "Please set at least one product target", variant: "destructive" });
        return;
      }
    } else {
      if (!targetValue) {
        toast({ title: "Error", description: "Please enter target value", variant: "destructive" });
        return;
      }
    }
    
    setIsLoading(true);

    try {
      const payload: any = {};
      
      if (editingTarget) {
        // UPDATE: Only send fields that can be updated
        payload.targetType = targetType;
        payload.period = period;
        payload.startDate = startDate;
        payload.endDate = endDate;
        
        if (targetType === 'product_based') {
          payload.productTargets = Object.entries(productTargets)
            .filter(([_, value]) => value && parseInt(value) > 0)
            .map(([category, value]) => ({
              category,
              targetValue: parseInt(value),
              specificProducts: selectedProducts[category] || []
            }));
        } else {
          payload.targetValue = parseInt(targetValue);
        }
        
        if (incentiveSource === 'custom' && incentiveAmount) {
          payload.incentiveAmount = parseInt(incentiveAmount);
        }
        payload.incentiveSource = incentiveSource;
      } else {
        // CREATE: Send all required fields
        payload.userId = selectedUserId;
        payload.targetType = targetType;
        payload.period = period;
        payload.startDate = startDate;
        payload.endDate = endDate;
        
        if (targetType === 'product_based') {
          payload.productTargets = Object.entries(productTargets)
            .filter(([_, value]) => value && parseInt(value) > 0)
            .map(([category, value]) => ({
              category,
              targetValue: parseInt(value),
              specificProducts: selectedProducts[category] || []
            }));
        } else {
          payload.targetValue = parseInt(targetValue);
        }
        
        if (incentiveSource === 'custom' && incentiveAmount) {
          payload.incentiveAmount = parseInt(incentiveAmount);
        }
        payload.incentiveSource = incentiveSource;
      }
      
      const url = editingTarget 
        ? `${getApiUrl()}/api/targets/${editingTarget._id}`
        : `${getApiUrl()}/api/targets/`;
      const method = editingTarget ? 'PUT' : 'POST';
      
      console.log('=== TARGET REQUEST ===');
      console.log('Method:', method);
      console.log('URL:', url);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('Response Status:', response.status);
      const data = await response.json();
      console.log('Response Data:', JSON.stringify(data, null, 2));

      if (response.ok && data.success) {
        await fetchTargets();
        await calculateProgress();
        setIsModalOpen(false);
        resetForm();
        setEditingTarget(null);
        toast({ title: "Success", description: editingTarget ? "Target updated successfully!" : "Target assigned successfully!" });
      } else {
        toast({ title: editingTarget ? "Failed to update" : "Failed to create", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Save failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId("");
    setTargetType("");
    setTargetValue("");
    setPeriod("");
    setStartDate("");
    setEndDate("");
    setEditingTarget(null);
    setProductTargets({ laptops: '', desktops: '', aios: '', accessories: '' });
    setSelectedProducts({ laptops: [], desktops: [], aios: [], accessories: [] });
    setProductSearchQueries({ laptops: '', desktops: '', aios: '', accessories: '' });
    setFilteredProducts({ laptops: [], desktops: [], aios: [], accessories: [] });
    setIncentiveAmount('');
    setIncentiveSource('custom');
  };

  const formatTargetValue = (value: number, type: string) => {
    if (type === 'billing_amount') {
      return `₹${value.toLocaleString()}`;
    }
    if (type === 'billing_count' || type === 'sales' || type === 'product_based') {
      return `${value} units`;
    }
    return value.toString();
  };

  const getTargetTypeDisplay = (type: string) => {
    switch (type) {
      case 'sales':
        return 'Sales';
      case 'billing_count':
        return 'Billing Count';
      case 'billing_amount':
        return 'Billing Amount';
      case 'product_based':
        return 'Product-Based';
      default:
        return type.replace('_', ' ');
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getSalespersonName = (target: Target) => {
    if (target.user) {
      return `${target.user.firstName} ${target.user.lastName}`;
    }
    return 'Unknown';
  };

  const groupTargetsBySalesPerson = () => {
    const grouped = new Map<string, { person: any; targets: Target[] }>();
    
    targets.forEach(target => {
      const userId = target.user?._id;
      if (userId) {
        if (!grouped.has(userId)) {
          grouped.set(userId, {
            person: target.user,
            targets: []
          });
        }
        grouped.get(userId)!.targets.push(target);
      }
    });
    
    return Array.from(grouped.values());
  };

  const handleViewSalesPersonTargets = (person: any, personTargets: Target[]) => {
    setSelectedSalesPerson({ ...person, targets: personTargets });
    setShowSalesPersonTargets(true);
  };

  useEffect(() => {
    if (showSalesPersonTargets && selectedSalesPerson) {
      const updatedPerson = targets.filter(t => t.user?._id === selectedSalesPerson._id);
      if (updatedPerson.length > 0) {
        setSelectedSalesPerson({ ...selectedSalesPerson, targets: updatedPerson });
      }
    }
  }, [targets]);

  const SkeletonLoader = () => (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Salesperson</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Total Targets</TableHead>
            <TableHead>Active Targets</TableHead>
            <TableHead>Completed Targets</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></TableCell>
              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></TableCell>
              <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-8" /></TableCell>
              <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-8" /></TableCell>
              <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-8" /></TableCell>
              <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-28" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 min-h-screen">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="space-y-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Target Management</CardTitle>
              
              {/* Desktop Button Layout */}
              <div className="hidden sm:flex flex-wrap gap-2">
                <Button onClick={() => setShowUploadModal(true)} variant="outline" className="border-gray-300">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </Button>
                <Button onClick={downloadTargetsExcel} variant="outline" className="border-gray-300">
                  <Download className="mr-2 h-4 w-4" />
                  Download Excel
                </Button>
                <Button onClick={calculateProgress} disabled={isCalculating} variant="outline" className="border-gray-300">
                  {isCalculating ? 'Calculating...' : 'Refresh'}
                </Button>
                <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Target
                </Button>
              </div>
              
              {/* Mobile Button Layout */}
              <div className="sm:hidden space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => setShowUploadModal(true)} variant="outline" size="sm" className="border-gray-300">
                    <Upload className="mr-1 h-3 w-3" />
                    Upload
                  </Button>
                  <Button onClick={downloadTargetsExcel} variant="outline" size="sm" className="border-gray-300">
                    <Download className="mr-1 h-3 w-3" />
                    Excel
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={calculateProgress} disabled={isCalculating} variant="outline" size="sm" className="border-gray-300">
                    {isCalculating ? 'Calc...' : 'Refresh'}
                  </Button>
                  <Button onClick={() => setIsModalOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-1 h-3 w-3" />
                    Assign
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <SkeletonLoader />
            ) : isDataLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Loading targets...</div>
              </div>
            ) : (
            <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salesperson</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Targets</TableHead>
                  <TableHead>Active Targets</TableHead>
                  <TableHead>Completed Targets</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupTargetsBySalesPerson().map((group) => {
                  const activeTargets = group.targets.filter(t => t.status === 'active').length;
                  const completedTargets = group.targets.filter(t => t.status === 'completed').length;
                  
                  return (
                    <TableRow key={group.person._id}>
                      <TableCell className="font-medium">
                        {group.person.firstName} {group.person.lastName}
                      </TableCell>
                      <TableCell>{group.person.email}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                          group.targets.length > 5 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {group.targets.length}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                          activeTargets > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {activeTargets}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                          completedTargets > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {completedTargets}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewSalesPersonTargets(group.person, group.targets)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Targets
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => downloadSalespersonExcel(group.person, group.targets)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {groupTargetsBySalesPerson().map((group) => {
                const activeTargets = group.targets.filter(t => t.status === 'active').length;
                const completedTargets = group.targets.filter(t => t.status === 'completed').length;
                
                return (
                  <div key={group.person._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{group.person.firstName} {group.person.lastName}</h3>
                        <p className="text-sm text-gray-600">{group.person.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewSalesPersonTargets(group.person, group.targets)}
                          className="p-2"
                          title="View Targets"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadSalespersonExcel(group.person, group.targets)}
                          className="p-2"
                          title="Download Excel"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 block">Total</span>
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium border mt-1 ${
                          group.targets.length > 5 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {group.targets.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Active</span>
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium border mt-1 ${
                          activeTargets > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {activeTargets}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Completed</span>
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium border mt-1 ${
                          completedTargets > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {completedTargets}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogContent className="max-w-5xl rounded-sm max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editingTarget ? 'Edit Target' : 'Assign New Target'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Salesperson</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select salesperson" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.contactNo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Target Type</Label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="billing_count">Billing Count</SelectItem>
                      <SelectItem value="billing_amount">Billing Amount</SelectItem>
                      <SelectItem value="product_based">Product-Based Target</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {targetType === 'product_based' ? (
                <div className="space-y-4 col-span-1 sm:col-span-2">
                  <Label>Product Targets (Units)</Label>
                  <div className="space-y-4">
                    {Object.entries(productTargets).map(([category, value]) => {
                      const categoryProducts = filteredProducts[category] || [];
                      return (
                        <div key={category} className="border rounded-lg p-3 sm:p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <Label className="text-sm font-medium capitalize">{category}</Label>
                            <Input
                              type="number"
                              value={value}
                              onChange={(e) => setProductTargets({...productTargets, [category]: e.target.value})}
                              placeholder="Target"
                              className="w-full sm:w-20"
                            />
                          </div>
                          {parseInt(value) > 0 && (
                            <div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                <Label className="text-xs text-gray-600 whitespace-nowrap">Select specific products (optional):</Label>
                                <div className="relative flex-1">
                                  <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                                  <Input
                                    type="text"
                                    placeholder="Search products..."
                                    value={productSearchQueries[category]}
                                    onChange={(e) => handleProductSearch(category, e.target.value)}
                                    className="pl-7 h-7 text-xs"
                                  />
                                </div>
                              </div>
                              <div className="max-h-32 overflow-y-auto border rounded p-2">
                                {categoryProducts.length > 0 ? categoryProducts.map((product) => (
                                  <label key={product._id} className="flex items-center space-x-2 text-sm py-1 hover:bg-gray-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedProducts[category]?.includes(product._id) || false}
                                      onChange={(e) => {
                                        const current = selectedProducts[category] || [];
                                        const updated = e.target.checked
                                          ? [...current, product._id]
                                          : current.filter(id => id !== product._id);
                                        setSelectedProducts({...selectedProducts, [category]: updated});
                                      }}
                                      className="rounded flex-shrink-0"
                                    />
                                    <span className="truncate text-xs sm:text-sm">{product.name || product.model}</span>
                                  </label>
                                )) : (
                                  <div className="text-xs text-gray-500 py-2 text-center">
                                    {productSearchQueries[category] ? 'No products found' : 'No products available'}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {selectedProducts[category]?.length > 0 
                                  ? `${selectedProducts[category].length} products selected`
                                  : 'All products in category will count'}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="col-span-1 sm:col-span-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="Enter target value"
                    required
                  />
                </div>
              )}

              {targetType && (
                <div className="space-y-3 col-span-1 sm:col-span-2">
                  <div>
                    <Label>Incentive Source</Label>
                    <Select value={incentiveSource} onValueChange={(value: 'api' | 'custom') => setIncentiveSource(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api">Use API Incentive Data</SelectItem>
                        <SelectItem value="custom">Custom Incentive Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {incentiveSource === 'custom' && (
                    <div>
                      <Label>Incentive Amount (₹)</Label>
                      <Input
                        type="number"
                        value={incentiveAmount}
                        onChange={(e) => setIncentiveAmount(e.target.value)}
                        placeholder="Enter incentive amount"
                      />
                    </div>
                  )}
                  {incentiveSource === 'api' && (
                    <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <p>Incentive will be calculated automatically from API response data when targets are completed.</p>
                    </div>
                  )}
                </div>
              )}



              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 col-span-1 sm:col-span-2">
                <div>
                  <Label>Period</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 col-span-1 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto order-2 sm:order-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto order-1 sm:order-2">
                  {isLoading ? 'Saving...' : editingTarget ? 'Update Target' : 'Create Target'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: "", name: "" })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Target</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the target for {deleteDialog.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={viewDialog.open} onOpenChange={(open) => !open && setViewDialog({ open: false, target: null })}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Target Details</DialogTitle>
            </DialogHeader>
            {viewDialog.target && (
              <div className="space-y-6">
                {/* Target Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Target Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Salesperson</span>
                        <span className="text-sm text-gray-700">{getSalespersonName(viewDialog.target)}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Email</span>
                        <span className="text-sm text-gray-700">{viewDialog.target.user?.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Target Type</span>
                        <span className="text-sm text-gray-700">{getTargetTypeDisplay(viewDialog.target.targetType)}</span>
                      </div>
                      {viewDialog.target.targetType !== 'product_based' && (
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Period</span>
                          <span className="text-sm text-gray-700 capitalize">{viewDialog.target.period}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Progress Summary</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      {viewDialog.target.targetType === 'product_based' && viewDialog.target.productTargets ? (
                        <>
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">Product Targets</span>
                            <div className="space-y-2">
                              {viewDialog.target.productTargets.map((pt) => (
                                <div key={pt.category} className="flex items-center justify-between p-2 bg-white rounded">
                                  <span className="text-sm font-medium capitalize">{pt.category}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{pt.currentValue} / {pt.targetValue}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${pt.isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                      {pt.progressPercentage?.toFixed(0) || 0}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {viewDialog.target.incentiveAmount && viewDialog.target.incentiveAmount > 0 && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Incentive Amount</span>
                                <span className="text-lg font-bold text-green-600">₹{viewDialog.target.incentiveAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Incentive Status</span>
                                <span className={`px-3 py-1 rounded text-sm ${
                                  viewDialog.target.incentiveStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                  viewDialog.target.incentiveStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {viewDialog.target.incentiveStatus || 'pending'}
                                </span>
                              </div>
                              {viewDialog.target.incentivePaidDate && (
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs font-semibold text-gray-500 uppercase">Paid Date</span>
                                  <span className="text-sm">{formatDate(viewDialog.target.incentivePaidDate)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase block">Target Value</span>
                              <span className="text-sm text-gray-700">{formatTargetValue(viewDialog.target.targetValue || 0, viewDialog.target.targetType)}</span>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase block">Current Progress</span>
                              <span className="text-sm text-gray-700">{formatTargetValue(viewDialog.target.currentValue || 0, viewDialog.target.targetType)}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block">Progress</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-blue-600 h-3 rounded-full" 
                                  style={{ width: `${getProgressPercentage(viewDialog.target.currentValue || 0, viewDialog.target.targetValue || 1)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {Math.round(getProgressPercentage(viewDialog.target.currentValue || 0, viewDialog.target.targetValue || 1))}%
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Status</span>
                        <span className={`inline-block px-3 py-1 rounded text-sm mt-1 ${
                          viewDialog.target.status === 'completed' ? 'bg-green-100 text-green-800' :
                          viewDialog.target.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {viewDialog.target.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Timeline</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Start Date</span>
                        <span className="text-sm text-gray-700">{formatDate(viewDialog.target.startDate)}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">End Date</span>
                        <span className="text-sm text-gray-700">{formatDate(viewDialog.target.endDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setViewDialog({ open: false, target: null })} className="w-full sm:w-auto">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sales Person Targets Modal */}
        <Dialog open={showSalesPersonTargets} onOpenChange={setShowSalesPersonTargets}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">
                {selectedSalesPerson?.firstName} {selectedSalesPerson?.lastName} - Targets
              </DialogTitle>
            </DialogHeader>
            {selectedSalesPerson && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 block">Email</span>
                      <p className="font-medium text-gray-900 break-all">{selectedSalesPerson.email}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Total Targets</span>
                      <p className="font-semibold text-gray-900">{selectedSalesPerson.targets?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Active</span>
                      <p className="font-semibold text-amber-600">{selectedSalesPerson.targets?.filter((t: Target) => t.status === 'active').length || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedSalesPerson.targets?.map((target: Target) => {
                    const overallProgress = target.targetType === 'product_based' && target.productTargets
                      ? target.productTargets.reduce((sum, pt) => sum + (pt.progressPercentage ?? getProgressPercentage(pt.currentValue, pt.targetValue)), 0) / target.productTargets.length
                      : getProgressPercentage(target.currentValue || 0, target.targetValue || 1);
                    
                    return (
                    <Card key={target._id} className="border border-gray-200">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{getTargetTypeDisplay(target.targetType)}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                target.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                target.status === 'overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {target.status.charAt(0).toUpperCase() + target.status.slice(1)}
                              </span>
                              <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(target.startDate)} - {formatDate(target.endDate)}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 self-start sm:self-center">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(target)} className="h-7 w-7 p-0">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(target)} className="h-7 w-7 p-0 text-rose-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {target.targetType === 'product_based' && target.productTargets ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                            {target.productTargets.map((pt) => {
                              const progress = pt.progressPercentage ?? getProgressPercentage(pt.currentValue, pt.targetValue);
                              return (
                              <div key={pt.category} className="text-center p-3 bg-gray-50 rounded">
                                <p className="text-xs text-gray-600 capitalize mb-1">{pt.category}</p>
                                <p className="text-sm font-semibold">{pt.currentValue}/{pt.targetValue}</p>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                  <div className={`h-1.5 rounded-full ${
                                    target.status === 'completed' ? 'bg-emerald-600' :
                                    target.status === 'overdue' ? 'bg-rose-600' :
                                    progress < 50 ? 'bg-rose-600' : progress < 80 ? 'bg-amber-500' : 'bg-emerald-600'
                                  }`} style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{progress.toFixed(0)}%</p>
                              </div>
                            )})}
                          </div>
                        ) : (
                          <div className="mb-3">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-2">
                              <span className="text-lg font-semibold">{formatTargetValue(target.currentValue || 0, target.targetType)}</span>
                              <span className="text-xs text-gray-500">/ {formatTargetValue(target.targetValue || 0, target.targetType)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full ${
                                target.status === 'completed' ? 'bg-emerald-600' :
                                target.status === 'overdue' ? 'bg-rose-600' :
                                overallProgress < 50 ? 'bg-rose-600' : overallProgress < 80 ? 'bg-amber-500' : 'bg-emerald-600'
                              }`} style={{ width: `${overallProgress}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm pt-2 border-t gap-2">
                          <span className={`font-medium ${
                            overallProgress >= 80 ? 'text-emerald-600' :
                            overallProgress >= 50 ? 'text-amber-600' : 'text-rose-600'
                          }`}>{overallProgress.toFixed(0)}% Complete</span>
                          {target.incentiveAmount && target.incentiveAmount > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Incentive:</span>
                                <span className="font-semibold text-emerald-600">₹{target.incentiveAmount.toLocaleString()}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-xs self-start ${
                                target.incentiveStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                target.incentiveStatus === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {target.incentiveStatus || 'pending'}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )})}
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-3 border-t">
              <Button variant="outline" onClick={() => setShowSalesPersonTargets(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-md mx-2 sm:mx-4 w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Bulk Upload Targets</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Excel File</Label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                />
                <p className="text-xs text-gray-500">
                  Upload an Excel file with 12 columns: Salesperson Name, Email, Target Type, Target Value, Current Progress, Progress %, Status, Period, Start Date, End Date, Incentive Amount, Incentive Status
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button variant="outline" onClick={() => setShowUploadModal(false)} className="w-full sm:w-auto order-2 sm:order-1">
                  Cancel
                </Button>
                <Button onClick={handleBulkUpload} disabled={isUploading || !uploadFile} className="w-full sm:w-auto order-1 sm:order-2">
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}