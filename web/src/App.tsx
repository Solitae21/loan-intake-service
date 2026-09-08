import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAppSelector } from "./app/hooks";
import { Layout } from "./components/Layout";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationFormPage } from "./pages/ApplicationFormPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { AuthPage } from "./pages/AuthPage";
const theme = createTheme({ palette: { primary: { main: "#164e63" }, background: { default: "#f8fafc" } }, shape: { borderRadius: 10 } });
function Protected() { const user = useAppSelector((s) => s.auth.user); const location = useLocation(); return user ? <Layout /> : <Navigate to="/login" replace state={{ from: location }} />; }
function ApplicantOnly() { const user = useAppSelector((s) => s.auth.user); return user?.role === "APPLICANT" ? <ApplicationFormPage /> : <Navigate to="/applications" replace />; }
export default function App() { const user = useAppSelector((s) => s.auth.user); return <ThemeProvider theme={theme}><CssBaseline /><Routes><Route path="/login" element={user ? <Navigate to="/applications" replace /> : <AuthPage />} /><Route element={<Protected />}><Route path="/applications" element={<ApplicationsPage />} /><Route path="/applications/new" element={<ApplicantOnly />} /><Route path="/applications/:id" element={<ApplicationDetailPage />} /></Route><Route path="*" element={<Navigate to={user ? "/applications" : "/login"} replace />} /></Routes></ThemeProvider>; }
