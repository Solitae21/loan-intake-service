import { Alert } from "@mui/material";
import type { ApiError } from "../types";
export function ApiAlert({ error }: { error: unknown }) { const message = (error as { data?: ApiError })?.data?.error?.message || "Something went wrong. Please try again."; return <Alert severity="error">{message}</Alert>; }
