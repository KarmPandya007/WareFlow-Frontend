import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getApiUrl } from "@/lib/api";

interface ProductState {
  products: any[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: ProductState = {
  products: [],
  status: "idle",
  error: null,
};

export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/products/`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      if (data.success && data.products) {
        const flattened = [
          ...(data.products.laptops || []).map((p: any) => ({ ...p, category: "Laptop" })),
          ...(data.products.desktops || []).map((p: any) => ({ ...p, category: "Desktop" })),
          ...(data.products.aios || []).map((p: any) => ({ ...p, category: "AIO" })),
          ...(data.products.accessories || []).map((p: any) => ({ ...p, category: "Accessory" }))
        ];
        return flattened;
      }
      return [];
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load products");
    }
  }
);

export const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default productSlice.reducer;
