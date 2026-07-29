import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getApiUrl } from "@/lib/api";

export interface Salesperson {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: string;
  branches?: any[];
}

interface SalespersonState {
  salespersons: Salesperson[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: SalespersonState = {
  salespersons: [],
  status: "idle",
  error: null,
};

export const fetchSalespersons = createAsyncThunk(
  "salespersons/fetchSalespersons",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/salespersons/`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch salespersons");
      const data = await res.json();
      return data.salesPersons || [];
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load salespersons");
    }
  }
);

export const salespersonSlice = createSlice({
  name: "salespersons",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalespersons.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchSalespersons.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.salespersons = action.payload;
      })
      .addCase(fetchSalespersons.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default salespersonSlice.reducer;
