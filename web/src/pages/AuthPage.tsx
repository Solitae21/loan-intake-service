import { zodResolver } from "@hookform/resolvers/zod";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Alert, Box, Button, Card, CardContent, Container, IconButton, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiAlert } from "../components/ApiAlert";
import { useAppDispatch } from "../app/hooks";
import { setSession } from "../features/auth/authSlice";
import { useLoginMutation, useRegisterMutation } from "../services/api";

const credentialsSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address"), password: z.string().min(12, "Password must be at least 12 characters").max(128) });
type Credentials = z.infer<typeof credentialsSchema>;

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const { register: field, handleSubmit, formState: { errors } } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema), defaultValues: { email: "", password: "" } });

  const submit = async (values: Credentials) => {
    if (mode === "register") {
      await register(values).unwrap();
      setMode("login");
      return;
    }
    const session = await login(values).unwrap();
    dispatch(setSession({ user: session.user, tokens: { accessToken: session.accessToken, refreshToken: session.refreshToken } }));
    navigate("/applications", { replace: true });
  };

  const error = loginState.error || registerState.error;
  return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "grey.100", px: 2 }}><Container maxWidth="xs"><Stack spacing={2}><Box><Typography variant="h3" fontWeight={700}>Loan Intake</Typography><Typography color="text.secondary">Submit and track your application securely.</Typography></Box><Card><CardContent><Stack component="form" spacing={2} onSubmit={handleSubmit(submit)}>
    <ToggleButtonGroup value={mode} exclusive fullWidth onChange={(_, value) => value && setMode(value)}><ToggleButton value="login">Sign in</ToggleButton><ToggleButton value="register">Create account</ToggleButton></ToggleButtonGroup>
    {mode === "register" && <Alert severity="info">New accounts are created as applicants.</Alert>}{error && <ApiAlert error={error} />}
    <TextField label="Email" autoComplete="email" {...field("email")} error={!!errors.email} helperText={errors.email?.message} />
    <TextField label="Password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} {...field("password")} error={!!errors.password} helperText={errors.password?.message || "12-128 characters"} slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} onMouseDown={(event) => event.preventDefault()} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }} />
    <Button type="submit" size="large" variant="contained" disabled={loginState.isLoading || registerState.isLoading}>{mode === "login" ? "Sign in" : "Create account"}</Button>
  </Stack></CardContent></Card></Stack></Container></Box>;
}
