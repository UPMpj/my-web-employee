import { Navigate, Outlet } from "react-router-dom";

export default function RoleRoute({ roles }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
