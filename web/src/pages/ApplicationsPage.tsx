import { Add as AddIcon } from "@mui/icons-material";
import { Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ApiAlert } from "../components/ApiAlert";
import { StatusChip } from "../components/StatusChip";
import { useAppSelector } from "../app/hooks";
import { useApplicationsQuery } from "../services/api";
import type { ApplicationStatus } from "../types";
import { BoxTitle } from "./ApplicationFormPage";

const statuses: ApplicationStatus[] = ["PENDING", "IN_REVIEW", "NEEDS_REVIEW", "APPROVED", "REJECTED"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export function ApplicationsPage() {
  const user = useAppSelector((state) => state.auth.user); const [page, setPage] = useState(0); const [limit, setLimit] = useState(10); const [status, setStatus] = useState<ApplicationStatus | "">("");
  const query = useApplicationsQuery({ page: page + 1, limit, ...(status ? { status } : {}) }, { pollingInterval: 0 });
  const hasPending = query.data?.data.some((row) => row.status === "PENDING") ?? false;
  const pollingQuery = useApplicationsQuery({ page: page + 1, limit, ...(status ? { status } : {}) }, { skip: !hasPending, pollingInterval: 5000 });
  const data = pollingQuery.data ?? query.data;
  return <Stack spacing={3}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}><BoxTitle title="Applications" subtitle={user?.role === "APPLICANT" ? "Your submitted loan requests." : "Review and manage submitted loan requests."} />{user?.role === "APPLICANT" && <Button component={RouterLink} to="/applications/new" variant="contained" startIcon={<AddIcon />}>New application</Button>}</Stack>
    <Paper variant="outlined"><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}><FormControl size="small" sx={{ minWidth: 190 }}><InputLabel id="status-filter">Status</InputLabel><Select labelId="status-filter" value={status} label="Status" onChange={(e) => { setStatus(e.target.value as ApplicationStatus | ""); setPage(0); }}><MenuItem value="">All statuses</MenuItem>{statuses.map((value) => <MenuItem key={value} value={value}>{value.replace("_", " ")}</MenuItem>)}</Select></FormControl>{hasPending && <Typography variant="body2" color="text.secondary">Refreshing pending applications…</Typography>}</Stack>
      {query.error && <Box sx={{ p: 2 }}><ApiAlert error={query.error} /></Box>}
      {query.isLoading ? <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}><CircularProgress /></Box> : <><TableContainer><Table><TableHead><TableRow><TableCell>Submitted</TableCell><TableCell>Purpose</TableCell><TableCell align="right">Amount</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead><TableBody>{data?.data.map((row) => <TableRow hover key={row.id}><TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell><TableCell>{row.purpose}</TableCell><TableCell align="right">{currency.format(Number(row.amount))}</TableCell><TableCell><StatusChip status={row.status} /></TableCell><TableCell align="right"><Button component={RouterLink} to={`/applications/${row.id}`}>View</Button></TableCell></TableRow>)}{data?.data.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>No applications found.</TableCell></TableRow>}</TableBody></Table></TableContainer><TablePagination component="div" count={data?.total ?? 0} page={page} onPageChange={(_, next) => setPage(next)} rowsPerPage={limit} onRowsPerPageChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 20, 50]} /></>}</Paper></Stack>;
}
