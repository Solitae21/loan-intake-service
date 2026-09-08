import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Tokens, User } from "../../types";

type AuthState = { user: User | null; tokens: Tokens | null };
const storageKey = "loan-intake.auth";
const load = (): AuthState => {
  try { return JSON.parse(localStorage.getItem(storageKey) || "null") || { user: null, tokens: null }; }
  catch { return { user: null, tokens: null }; }
};
const persist = (state: AuthState) => localStorage.setItem(storageKey, JSON.stringify(state));
const authSlice = createSlice({
  name: "auth", initialState: load(), reducers: {
    setSession: (state, action: PayloadAction<AuthState>) => { state.user = action.payload.user; state.tokens = action.payload.tokens; persist(state); },
    setTokens: (state, action: PayloadAction<Tokens>) => { state.tokens = action.payload; persist(state); },
    clearSession: (state) => { state.user = null; state.tokens = null; localStorage.removeItem(storageKey); },
  },
});
export const { setSession, setTokens, clearSession } = authSlice.actions;
export default authSlice.reducer;
