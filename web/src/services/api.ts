import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../app/store";
import { clearSession, setTokens } from "../features/auth/authSlice";
import type { Application, ApplicationPage, ApplicationStatus, Tokens, User } from "../types";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.tokens?.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});
let refreshInFlight: Promise<Tokens | null> | null = null;
const returnToLogin = () => {
  window.history.replaceState(null, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
};
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const isRefresh = typeof args !== "string" && args.url === "/auth/refresh";
  if (result.error?.status !== 401 || isRefresh) return result;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = (api.getState() as RootState).auth.tokens?.refreshToken;
      if (!refreshToken) return null;
      const refreshed = await rawBaseQuery({ url: "/auth/refresh", method: "POST", body: { refreshToken } }, api, extraOptions);
      if (refreshed.data && typeof refreshed.data === "object" && "accessToken" in refreshed.data && "refreshToken" in refreshed.data) {
        return refreshed.data as Tokens;
      }
      return null;
    })().finally(() => { refreshInFlight = null; });
  }
  const tokens = await refreshInFlight;
  if (!tokens) { api.dispatch(clearSession()); returnToLogin(); return result; }
  api.dispatch(setTokens(tokens));
  result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

type Credentials = { email: string; password: string };
type StatusUpdate = { status: "IN_REVIEW" | "APPROVED" | "REJECTED"; reason: string };
export const api = createApi({
  reducerPath: "api", baseQuery: baseQueryWithReauth, tagTypes: ["Applications", "Application"], endpoints: (build) => ({
    login: build.mutation<{ user: User } & Tokens, Credentials>({ query: (body) => ({ url: "/auth/login", method: "POST", body }) }),
    register: build.mutation<User, Credentials>({ query: (body) => ({ url: "/auth/register", method: "POST", body }) }),
    refresh: build.mutation<Tokens, { refreshToken: string }>({ query: (body) => ({ url: "/auth/refresh", method: "POST", body }) }),
    applications: build.query<ApplicationPage, { page: number; limit: number; status?: ApplicationStatus }>({ query: (params) => ({ url: "/applications", params }), providesTags: (result) => result ? [...result.data.map(({ id }) => ({ type: "Application" as const, id })), { type: "Applications", id: "LIST" }] : [{ type: "Applications", id: "LIST" }] }),
    application: build.query<Application, string>({ query: (id) => `/applications/${id}`, providesTags: (_r, _e, id) => [{ type: "Application", id }] }),
    createApplication: build.mutation<Application, { amount: number; term: number; monthlyIncome: number; purpose: string }>({ query: (body) => ({ url: "/applications", method: "POST", body }), invalidatesTags: [{ type: "Applications", id: "LIST" }] }),
    updateStatus: build.mutation<Application, { id: string; body: StatusUpdate }>({ query: ({ id, body }) => ({ url: `/applications/${id}/status`, method: "PATCH", body }), invalidatesTags: (_r, _e, { id }) => [{ type: "Application", id }, { type: "Applications", id: "LIST" }] }),
    decide: build.mutation<Application, { id: string; body: StatusUpdate }>({ query: ({ id, body }) => ({ url: `/applications/${id}/decision`, method: "PATCH", body }), invalidatesTags: (_r, _e, { id }) => [{ type: "Application", id }, { type: "Applications", id: "LIST" }] }),
  }),
});
export const { useLoginMutation, useRegisterMutation, useApplicationsQuery, useApplicationQuery, useCreateApplicationMutation, useUpdateStatusMutation, useDecideMutation } = api;
