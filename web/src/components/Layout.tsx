import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { AppBar, Button, Container, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { clearSession } from "../features/auth/authSlice";

export function Layout() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  return <><AppBar position="sticky" elevation={0}><Toolbar><Typography component={RouterLink} to="/applications" variant="h6" sx={{ color: "inherit", textDecoration: "none", fontWeight: 700, flexGrow: 1 }}>Loan Intake</Typography>
    <Stack direction="row" spacing={1} alignItems="center"><Button component={RouterLink} to="/applications" color="inherit" startIcon={<ListAltIcon />}>Applications</Button>
      {user?.role === "APPLICANT" && <Button component={RouterLink} to="/applications/new" color="inherit" startIcon={<AddIcon />}>New application</Button>}
      <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>{user?.email} · {user?.role.toLowerCase()}</Typography>
      <IconButton color="inherit" aria-label="Sign out" onClick={() => dispatch(clearSession())}><LogoutIcon /></IconButton>
    </Stack></Toolbar></AppBar><Container maxWidth="lg" sx={{ py: 4 }}><Outlet /></Container></>;
}
