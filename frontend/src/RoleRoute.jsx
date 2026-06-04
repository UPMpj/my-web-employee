import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "./hooks/useCurrentUser";

export default function RoleRoute({ roles }) {
  const user = useCurrentUser();
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
