import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, Grid, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiAlert } from "../components/ApiAlert";
import { useCreateApplicationMutation } from "../services/api";

const schema = z.object({ amount: z.coerce.number().positive("Amount must be greater than zero").max(100_000_000), term: z.coerce.number().int().min(6).max(360), monthlyIncome: z.coerce.number().positive("Income must be greater than zero").max(100_000_000), purpose: z.string().trim().min(3).max(140) });
type FormValues = z.input<typeof schema>;
type SubmitValues = z.output<typeof schema>;
export function ApplicationFormPage() {
  const navigate = useNavigate(); const [create, state] = useCreateApplicationMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues, unknown, SubmitValues>({ resolver: zodResolver(schema), defaultValues: { amount: undefined, term: 36, monthlyIncome: undefined, purpose: "" } });
  const submit = async (values: SubmitValues) => { const application = await create(values).unwrap(); navigate(`/applications/${application.id}`); };
  return <Stack spacing={3}><BoxTitle title="New application" subtitle="Provide the requested loan details. You can track the decision after submission." /><Card><CardContent><Stack component="form" spacing={3} onSubmit={handleSubmit(submit)}>{state.error && <ApiAlert error={state.error} />}<Grid container spacing={2}><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Requested amount" type="number" slotProps={{ input: { startAdornment: "$" }, htmlInput: { min: 0, step: "0.01" } }} {...register("amount")} error={!!errors.amount} helperText={errors.amount?.message} /></Grid><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Monthly income" type="number" slotProps={{ input: { startAdornment: "$" }, htmlInput: { min: 0, step: "0.01" } }} {...register("monthlyIncome")} error={!!errors.monthlyIncome} helperText={errors.monthlyIncome?.message} /></Grid><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Term (months)" type="number" slotProps={{ htmlInput: { min: 6, max: 360 } }} {...register("term")} error={!!errors.term} helperText={errors.term?.message || "6 to 360 months"} /></Grid><Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label="Purpose" {...register("purpose")} error={!!errors.purpose} helperText={errors.purpose?.message || "3 to 140 characters"} /></Grid></Grid><Button type="submit" variant="contained" size="large" sx={{ alignSelf: "flex-start" }} disabled={state.isLoading}>Submit application</Button></Stack></CardContent></Card></Stack>;
}
export function BoxTitle({ title, subtitle }: { title: string; subtitle?: string }) { return <Stack spacing={0.5}><Typography variant="h4" fontWeight={700}>{title}</Typography>{subtitle && <Typography color="text.secondary">{subtitle}</Typography>}</Stack>; }
