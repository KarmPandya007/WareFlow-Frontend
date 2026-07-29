import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getApiUrl } from "@/lib/api";

export interface Branch {
  _id: string;
  name: string;
  code?: string;
  location?: string;
}

interface BranchState {
  branches: Branch[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: BranchState = {
  branches: [],
  status: "idle",
  error: null,
};

export const fetchBranches = createAsyncThunk(
  "branches/fetchBranches",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/branches`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      return data.branches || [];
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load branches");
    }
  }
);

export const branchSlice = createSlice({
  name: "branches",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranches.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.branches = action.payload;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default branchSlice.reducer;
