import { configureStore } from "@reduxjs/toolkit";
import auth from "../features/auth/authSlice";
import { api } from "../services/api";

export const store = configureStore({ reducer: { auth, [api.reducerPath]: api.reducer }, middleware: (getDefault) => getDefault().concat(api.middleware) });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
