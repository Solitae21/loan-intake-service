import { Chip } from "@mui/material";
import type { ApplicationStatus } from "../types";
const colors: Record<ApplicationStatus, "default" | "warning" | "info" | "success" | "error"> = { PENDING: "warning", IN_REVIEW: "info", NEEDS_REVIEW: "warning", APPROVED: "success", REJECTED: "error" };
export function StatusChip({ status }: { status: ApplicationStatus }) { return <Chip size="small" color={colors[status]} label={status.replace("_", " ")} />; }
