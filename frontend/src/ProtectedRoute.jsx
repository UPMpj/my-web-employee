import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import toast from "react-hot-toast";

export default function ProtectedRoute() {
  /* The session itself lives in an httpOnly cookie (unreadable from JS, by design).
     `user` in localStorage is the UI-side "are we logged in" flag — set on login,
     cleared on logout/401. (Don't use sessionStorage._sess for this: main.jsx
     unconditionally re-sets it on every page load, including the full reload that
     a 401 redirect triggers, which would bounce straight back here in a loop.) */
  const sess = localStorage.getItem("user");

  /* Re-check auth when browser restores page from bfcache (back/forward).
     If the session flag is gone (logged out), immediately redirect without rendering. */
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted && !localStorage.getItem("user")) {
        window.location.replace("/login");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  /* Warn user 5 minutes before the session cookie expires */
  useEffect(() => {
    const expiry = Number(sessionStorage.getItem("token_exp"));
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
  }, []);

  if (!sess) return <Navigate to="/login" replace />;
  return <Outlet />;
}
