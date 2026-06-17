import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import toast from "react-hot-toast";

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

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

  /* Warn user 5 minutes before JWT expires */
  useEffect(() => {
    if (!token) return;
    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const warnAt = expiry - 5 * 60 * 1000;
    const now    = Date.now();

    if (warnAt <= now) return; // already past warning window

    const toastId = "jwt-expiry-warn";
    const timer = setTimeout(() => {
      toast(
        "⏰ ເຊດຊັ່ນໃກ້ໝົດອາຍຸ — ກະລຸນາ Login ໃໝ່ ພາຍໃນ 5 ນາທີ",
        {
          id:       toastId,
          duration: 10000,
          style: {
            borderLeft: "4px solid #f59e0b",
            background: "#fffbeb",
            color:      "#92400e",
            fontWeight: 600,
          },
        }
      );
    }, warnAt - now);

    return () => clearTimeout(timer);
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
