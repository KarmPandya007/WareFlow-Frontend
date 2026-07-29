import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./slices/themeSlice";
import branchReducer from "./slices/branchSlice";
import salespersonReducer from "./slices/salespersonSlice";
import productReducer from "./slices/productSlice";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    branches: branchReducer,
    salespersons: salespersonReducer,
    products: productReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
