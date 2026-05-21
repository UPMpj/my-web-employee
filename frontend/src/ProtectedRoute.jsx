import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");

  /* Re-check auth when browser restores page from bfcache (back/forward).
     If token is gone (logged out), immediately redirect without rendering. */
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted && !localStorage.getItem("token")) {
        window.location.replace("/login");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  /* replace=true: login redirect replaces history entry so
     back-button cannot return to the protected route. */
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
