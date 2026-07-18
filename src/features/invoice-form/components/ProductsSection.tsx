import { memo, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Scan } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Product {
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

interface ProductsSectionProps {
  products: Product[];
  availableProducts: any[];
  productSearchInputMap: Record<number, string>;
  searchResultsMap: Record<number, any[]>;
  filteredProductsMap: Record<number, any[]>;
  updateProduct: (id: number, field: keyof Product, value: string) => void;
  handleCategoryChange: (productId: number, category: string) => void;
  handleModelChange: (productId: number, model: string) => Promise<void>;
  searchProducts: (productId: number, query: string) => void;
  setProductSearchInputMap: (map: any) => void;
  setSearchResultsMap: (map: any) => void;
  fetchProductsByCategory: (productId: number, category?: string) => Promise<any[]>;
  openExternalScanner: (productId: number, type: 'serial' | 'checkCode' | 'model') => void;
  addProduct: () => void;
  deleteProduct: (id: number) => void;
}

export const ProductsSection = memo(function ProductsSection({
  products,
  availableProducts,
  productSearchInputMap,
  searchResultsMap,
  filteredProductsMap,
  updateProduct,
  handleCategoryChange,
  handleModelChange,
  searchProducts,
  setProductSearchInputMap,
  setSearchResultsMap,
  fetchProductsByCategory,
  openExternalScanner,
  addProduct,
  deleteProduct
}: ProductsSectionProps) {
  
  // Memoize category list
  const categories = useCallback(() => {
    const cats = Array.from(new Set(availableProducts.map(ap => (ap as any).type || (ap as any).category).filter(Boolean)));
    const fallback = ['Laptop', 'Desktop', 'AIO', 'Accessory'];
    return Array.from(new Set([...cats, ...fallback]));
  }, [availableProducts]);

  return (
    <section className="p-6 border rounded-lg shadow bg-white">
      <h2 className="text-lg font-bold mb-4 text-gray-800">Products</h2>

      {products.map((product, index) => (
        <div key={product.id} className="mb-6 p-4 bg-gray-50 rounded border">
          <h3 className="text-sm font-medium text-gray-700 mb-3 bg-white px-2 py-1 rounded inline-block border">
            Product {index + 1}{product.model ? ` - ${product.model}` : ''}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="mb-1 text-xs">Product Category</Label>
              <Select value={product.type || undefined} onValueChange={(v: string) => handleCategoryChange(product.id, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories().map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 text-xs">Model</Label>
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder={!product.type ? 'Select category first' : 'Search model by name or code'}
                    value={productSearchInputMap[product.id] ?? product.model}
                    onChange={(e) => {
                      searchProducts(product.id, e.target.value);
                      setProductSearchInputMap((prev: any) => ({ ...prev, [product.id]: e.target.value }));
                    }}
                    disabled={!product.type}
                    onFocus={() => {
                      if (product.type) {
                        const filtered = filteredProductsMap[product.id] || [];
                        if (filtered.length > 0) {
                          setSearchResultsMap((prev: any) => ({ ...prev, [product.id]: filtered }));
                        } else {
                          fetchProductsByCategory(product.id, product.type);
                        }
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => openExternalScanner(product.id, 'model')}
                    className="px-3 bg-purple-500 hover:bg-purple-600"
                    title="Scan Model with External Scanner"
                  >
                    <Scan className="w-4 h-4" />
                  </Button>
                </div>

                {searchResultsMap[product.id] && searchResultsMap[product.id].length > 0 && (
                  <ul className="absolute z-10 bg-white border border-gray-300 rounded w-full max-h-48 overflow-y-auto mt-1 shadow-lg">
                    {searchResultsMap[product.id].map(apiProduct => (
                      <li
                        key={apiProduct._id}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                        onMouseDown={() => {
                          handleModelChange(product.id, apiProduct.model || apiProduct.name || '');
                          setProductSearchInputMap((prev: any) => ({ ...prev, [product.id]: apiProduct.model || apiProduct.name || '' }));
                          setSearchResultsMap((prev: any) => ({ ...prev, [product.id]: [] }));
                        }}
                      >
                        {apiProduct.model || apiProduct.name || 'Unnamed Model'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1 text-xs">Serial Number</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Serial Number"
                  value={product.serialNumber}
                  onChange={(e) => updateProduct(product.id, 'serialNumber', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => openExternalScanner(product.id, 'serial')}
                  className="px-3 bg-purple-500 hover:bg-purple-600"
                  title="Scan with External Scanner"
                >
                  <Scan className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-1 text-xs">CHECK Code</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="CHECK Code"
                  value={product.checkCode}
                  onChange={(e) => updateProduct(product.id, 'checkCode', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => openExternalScanner(product.id, 'checkCode')}
                  className="px-3 bg-purple-500 hover:bg-purple-600"
                  title="Scan CHECK Code with External Scanner"
                >
                  <Scan className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-1 text-xs">Price *</Label>
              <Input
                type="number"
                placeholder="Price"
                value={product.price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    updateProduct(product.id, 'price', value);
                  }
                }}
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label className="mb-1 text-xs">Claim Code</Label>
              <Input
                placeholder="Claim Code"
                value={product.claimCode || ''}
                onChange={(e) => updateProduct(product.id, 'claimCode', e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1 text-xs">Time Period</Label>
              <Input
                placeholder="Time Period"
                value={product.timePeriod || ''}
                onChange={(e) => updateProduct(product.id, 'timePeriod', e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1 text-xs">CN To Partner</Label>
              <Input
                type="number"
                placeholder="CN To Partner"
                value={product.cnToPartner as any || ''}
                onChange={(e) => updateProduct(product.id, 'cnToPartner', e.target.value)}
                min="0"
                step="1"
              />
            </div>
          </div>
          {products.length > 1 && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteProduct(product.id)}
              className="mt-3 w-full sm:w-auto text-sm"
            >
              Remove Product
            </Button>
          )}
        </div>
      ))}

      <Button
        type="button"
        onClick={addProduct}
        className="w-full sm:w-auto text-sm sm:text-base"
        variant="default"
      >
        + Add Product
      </Button>
    </section>
  );
});
