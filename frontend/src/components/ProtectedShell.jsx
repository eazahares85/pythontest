import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "./AppLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedShell() {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session)
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <AppLayout />;
}
