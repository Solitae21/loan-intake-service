import { Button, Card, CardContent, CircularProgress, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ApiAlert } from "../components/ApiAlert";
import { StatusChip } from "../components/StatusChip";
import { useAppSelector } from "../app/hooks";
import { useApplicationQuery, useDecideMutation, useUpdateStatusMutation } from "../services/api";
import { BoxTitle } from "./ApplicationFormPage";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export function ApplicationDetailPage() {
  const { id = "" } = useParams(); const user = useAppSelector((state) => state.auth.user); const query = useApplicationQuery(id); const [update, updateState] = useUpdateStatusMutation(); const [decide, decideState] = useDecideMutation();
  const [reason, setReason] = useState(""); const [status, setStatus] = useState<"IN_REVIEW" | "APPROVED" | "REJECTED">("IN_REVIEW");
  if (query.isLoading) return <Stack alignItems="center" sx={{ pt: 10 }}><CircularProgress /></Stack>;
  if (query.error || !query.data) return <ApiAlert error={query.error} />;
  const app = query.data; const canManage = user?.role === "OFFICER" || user?.role === "ADMIN"; const isFinal = app.status === "APPROVED" || app.status === "REJECTED";
  const perform = async (endpoint: "status" | "decision", target: "IN_REVIEW" | "APPROVED" | "REJECTED") => { if (endpoint === "status") await update({ id, body: { status: target, reason } }).unwrap(); else await decide({ id, body: { status: target, reason } }).unwrap(); setReason(""); };
  return <Stack spacing={3}><Stack direction="row" justifyContent="space-between" alignItems="start"><BoxTitle title="Application detail" subtitle={`Submitted ${new Date(app.createdAt).toLocaleString()}`} /><StatusChip status={app.status} /></Stack><Card><CardContent><Grid container spacing={3}><Value label="Requested amount" value={currency.format(Number(app.amount))} /><Value label="Monthly income" value={currency.format(Number(app.monthlyIncome))} /><Value label="Term" value={`${app.term} months`} /><Value label="Automated score" value={app.score === null ? "Pending" : String(app.score)} /><Grid size={{ xs: 12 }}><Typography variant="overline" color="text.secondary">Purpose</Typography><Typography>{app.purpose}</Typography></Grid>{app.decidedAt && <Value label="Decision date" value={new Date(app.decidedAt).toLocaleString()} />}</Grid></CardContent></Card>
    {canManage && !isFinal && <Card><CardContent><Stack spacing={2}><Typography variant="h6">Status controls</Typography><Typography variant="body2" color="text.secondary">Record a reason for every status change.</Typography>{(updateState.error || decideState.error) && <ApiAlert error={updateState.error || decideState.error} />}<TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><MenuItem value="IN_REVIEW">In review</MenuItem><MenuItem value="APPROVED">Approved</MenuItem><MenuItem value="REJECTED">Rejected</MenuItem></TextField><TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={3} helperText="3 to 500 characters" error={reason.length > 0 && (reason.trim().length < 3 || reason.trim().length > 500)} /><Stack direction={{ xs: "column", sm: "row" }} spacing={1}>{status === "IN_REVIEW" ? <Button variant="contained" disabled={reason.trim().length < 3 || updateState.isLoading} onClick={() => perform("status", status)}>Move to review</Button> : <Button variant="contained" disabled={reason.trim().length < 3 || decideState.isLoading} onClick={() => perform("decision", status)}>Record {status.toLowerCase()}</Button>}</Stack></Stack></CardContent></Card>}</Stack>;
}
function Value({ label, value }: { label: string; value: string }) { return <Grid size={{ xs: 12, sm: 6 }}><Typography variant="overline" color="text.secondary">{label}</Typography><Typography variant="h6">{value}</Typography></Grid>; }
