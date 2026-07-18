"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import { getApiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Scan, X } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  model: string;
  category?: string;
  checkCode?: string;
  serialNumber?: string;
}

interface Branch {
  _id: string;
  name: string;
}

export default function InventoryTransferFormPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  // Serial number dropdown state
  const [selectedSerialNumber, setSelectedSerialNumber] = useState<string>("");
  const [sourceGodownId, setSourceGodownId] = useState<string>("");
  const [destinationGodownId, setDestinationGodownId] = useState<string>("");
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; batchNo: string; serialNumber?: string }>>([]);
  const [transferCount, setTransferCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Scanner states
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [scannedValue, setScannedValue] = useState<string>("");
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // External Scanner functions
  const openExternalScanner = () => {
    setShowSerialScanner(true);
    setScannedValue("");
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

  const handleScannerKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScannerInput(scannedValue);
    }
  };


  useEffect(() => {
    setSelectedSerialNumber(""); // Reset serial number when product/category changes
    const userRole = localStorage.getItem("userRole") || "";
    // if (userRole === "admin") {
    //   router.push("/inventory-transfer");
    // }
    fetchProducts();
    fetchBranches();
  }, [router]);



  useEffect(() => {
    // Derive categories from API products if available, otherwise use fallback
    const categories = products.map(p => p.category).filter((cat): cat is string => cat !== undefined);
    const fallback = ['laptop', 'desktop', 'aio', 'accessory'];
    const uniqueCategories = Array.from(new Set([...categories, ...fallback]));
    setProductCategories(uniqueCategories);
  }, [products]);

  useEffect(() => {
    if (selectedCategory) {
      // Filter all products for the selected category
      const filtered = products.filter((product) => product.category === selectedCategory);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [selectedCategory, products]);

const fetchProducts = async () => {
  try {
    setIsLoadingProducts(true);
    const response = await fetch(`${getApiUrl()}/api/products/`, {
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

const fetchBranches = async () => {
  try {
    setIsLoadingBranches(true);
    const userRole = localStorage.getItem('userRole');
    
    if (userRole === 'admin') {
      const response = await fetch(`${getApiUrl()}/api/branches`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.branches)) {
          setBranches(data.branches);
        }
      }
    } else {
      const response = await fetch(`${getApiUrl()}/api/salespersons/me`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user?.branches) {
          setBranches(data.user.branches);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching branches:', error);
  } finally {
    setIsLoadingBranches(false);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting transfer with productId:", productId);
    setMessage(null);

    // Basic validations
    if (!sourceGodownId || !destinationGodownId) {
      setMessage("Please select source and destination godowns.");
      return;
    }

    if (sourceGodownId === destinationGodownId) {
      setMessage("Source and Destination godown cannot be the same.");
      return;
    }

    // If there are no items, require the current product fields
    if (items.length === 0 && (!productId || !quantity || !selectedSerialNumber)) {
      setMessage("Please fill in all required fields or add at least one item.");
      return;
    }

    setIsLoading(true);
    try {
      // If there are multiple items added, submit them all (no Excel download)
      if (items.length > 0) {
        const savedTransfers: any[] = [];
        const itemsToSubmit = items.slice();
        for (const it of itemsToSubmit) {
          if (!it.productId || !it.quantity || !it.serialNumber) {
            throw new Error('One of the items is missing required fields');
          }
          const transferData: any = {
            date,
            items: [
              {
                product: it.productId,
                quantity: it.quantity,
                batchNo: it.batchNo || undefined,
              }
            ],
            batchNo: it.batchNo || undefined,
            sourceGodown: sourceGodownId,
            destinationGodown: destinationGodownId,
          };
          try {
            const srcBranch = branches.find(b => b._id === sourceGodownId);
            const dstBranch = branches.find(b => b._id === destinationGodownId);
            if (srcBranch) {
              transferData.sourceGodown = srcBranch.name;
              console.log('Using source branch name:', srcBranch.name);
            }
            if (dstBranch) {
              transferData.destinationGodown = dstBranch.name;
              console.log('Using destination branch name:', dstBranch.name);
            }
          } catch (mapErr) {
            console.warn('Branch mapping failed, proceeding with selected ids', mapErr);
          }
          const res = await fetch(`${getApiUrl()}/api/inventory-transfers/create`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transferData)
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to save one of the transfers');
          }
          const saved = await res.json().catch(() => null);
          savedTransfers.push({ saved, local: transferData });
        }
        setMessage('Inventory transfers submitted successfully.');
        setItems([]);
        resetForm();
        return;
      }

      // No items array: fallback to single transfer submit (existing behavior)
      if (!productId || !quantity || !selectedSerialNumber) {
        setMessage("Please fill in all required fields.");
        return;
      }

      const transferData: any = {
        date,
        items: [
          {
            product: productId,
            quantity: parseInt(quantity),
            batchNo: selectedSerialNumber,
          }
        ],
        batchNo: selectedSerialNumber,
        sourceGodown: sourceGodownId,
        destinationGodown: destinationGodownId,
      };

      try {
        const srcBranch = branches.find(b => b._id === sourceGodownId);
        const dstBranch = branches.find(b => b._id === destinationGodownId);

        if (srcBranch) {
          transferData.sourceGodown = srcBranch.name;
          console.log('Using source branch name:', srcBranch.name);
        }

        if (dstBranch) {
          transferData.destinationGodown = dstBranch.name;
          console.log('Using destination branch name:', dstBranch.name);
        }
      } catch (mapErr) {
        console.warn('Branch mapping failed, proceeding with selected ids', mapErr);
      }

      const response = await fetch(`${getApiUrl()}/api/inventory-transfers/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setMessage("Session expired. Please login again.");
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        throw new Error(errorData.message || 'Failed to save transfer');
      }

      setMessage("INventory Transfer submitted successfully!");
      setTimeout(() => resetForm(), 1500);

    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Inventory Transfer</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Transfer Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                      setProductId("");
                    }}
                    disabled={isLoadingProducts}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder={isLoadingProducts ? 'Loading...' : 'Select category'} />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map((category) => (
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
                  <Select
                    value={productId}
                    onValueChange={(val) => {
                      setProductId(val);
                      setSelectedSerialNumber("");
                    }}
                    disabled={!selectedCategory || isLoadingProducts}
                  >
                    <SelectTrigger id="product">
                      <SelectValue placeholder={!selectedCategory ? 'Select category first' : 'Select product'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.model || product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      onClick={openExternalScanner}
                      className="px-3 bg-purple-500 hover:bg-purple-600 text-white"
                      title="Scan Serial Number"
                    >
                      <Scan className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => {
                        if (!productId || !quantity || !selectedSerialNumber) {
                          toast({
                            title: "Missing fields",
                            description: "Please select item, quantity and serial number before adding",
                            variant: "destructive"
                          });
                          return;
                        }
                        const qn = parseInt(quantity || '1');
                        // Prevent duplicate product+serial
                        if (items.some(it => it.productId === productId && it.serialNumber === selectedSerialNumber)) {
                          toast({
                            title: "Duplicate item",
                            description: "This product with the same serial number is already added.",
                            variant: "destructive"
                          });
                          return;
                        }
                        setItems(prev => [...prev, { productId, quantity: qn, batchNo: selectedSerialNumber, serialNumber: selectedSerialNumber }]);
                        // Reset only product fields after adding item
                        setSelectedCategory('');
                        setProductId('');
                        setQuantity('1');
                        setSelectedSerialNumber("");
                        setMessage(null);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source-godown">Source Branch</Label>
                  <Select
                    value={sourceGodownId}
                    onValueChange={setSourceGodownId}
                    disabled={isLoadingBranches}
                  >
                    <SelectTrigger id="source-godown">
                      <SelectValue placeholder={isLoadingBranches ? 'Loading...' : 'Select source'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination-godown">Destination Branch</Label>
                  <Select
                    value={destinationGodownId}
                    onValueChange={setDestinationGodownId}
                    disabled={isLoadingBranches}
                  >
                    <SelectTrigger id="destination-godown">
                      <SelectValue placeholder={isLoadingBranches ? 'Loading...' : 'Select destination'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Items to Submit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex flex-col md:flex-row md:gap-8 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-semibold text-black">Source:</span> {branches.find(b => b._id === sourceGodownId)?.name || '—'}
                      </div>
                      <div>
                        <span className="font-semibold text-black">Destination:</span> {branches.find(b => b._id === destinationGodownId)?.name || '—'}
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Batch No.</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="w-[100px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((it, idx) => {
                          const prod = products.find(p => p._id === it.productId);
                          const getProductDisplayName = (product: Product | undefined) => {
                            if (!product) return 'Unknown item';
                            if (product.name && product.model) {
                              return `${product.model}`;
                            }
                            return product.model || product.name || 'Unknown item';
                          };
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {getProductDisplayName(prod)}
                                {/* Show serial number if present in item */}
                                {it.serialNumber && (
                                  <div className="text-xs text-muted-foreground">S/N: {it.serialNumber}</div>
                                )}
                              </TableCell>
                              <TableCell>{it.batchNo}</TableCell>
                              <TableCell className="text-right">{it.quantity}</TableCell>
                              <TableCell className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    // Edit: load item into form fields
                                    setSelectedCategory(prod?.category || '');
                                    setProductId(it.productId);
                                    setQuantity(String(it.quantity));
                                    setSelectedSerialNumber(it.serialNumber || "");
                                    // Remove from list
                                    setItems(prev => prev.filter((_,i) => i!==idx));
                                  }}
                                >Edit</Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setItems(prev => prev.filter((_,i) => i!==idx))}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {message && (
                <div className={`p-4 rounded-xl text-center border-2 ${
                  message.includes('success') 
                    ? 'text-green-700 border-green-200 bg-green-50'
                    : 'text-red-700 border-red-200 bg-red-50'
                }`}>
                  <p className="font-medium">{message}</p>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Reset
                </Button>
               
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Submitting...' : 'Submit Transfer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
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
      </div>
    </AdminLayout>
  );
}