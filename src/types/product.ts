export interface Product {
  _id?: string;
  model?: string;
  serialNumber?: string;
  checkCode?: string;
  branch?: string;
  srp?: number; // suggested retail price
  supportedAmount?: number;
  t2DBP?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  // legacy/compat
  name?: string;
  price?: number | string;
}

export function productLabel(p?: Product | null) {
  if (!p) return 'Unknown Product';
  return p.model || p.name || p.serialNumber || 'Unknown Product';
}

export default Product;
