import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import toast from "react-hot-toast";

export default function ProtectedRoute() {
  /* The session itself lives in an httpOnly cookie (unreadable from JS, by design).
     _sess is just a UI-side "did we log in this browser session" flag — actual
     authorization is enforced server-side; a 401 from any API call redirects to /login. */
  const sess = sessionStorage.getItem("_sess");

  /* Re-check auth when browser restores page from bfcache (back/forward).
     If the session flag is gone (logged out), immediately redirect without rendering. */
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted && !sessionStorage.getItem("_sess")) {
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
