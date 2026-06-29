import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { CompanyProvider } from "./context/CompanyContext";
import "./responsive.css";

/* ── Session guard ──────────────────────────────────────────
   sessionStorage clears when all browser tabs/windows close,
   so every new browser open = new session = must re-login.
   ─────────────────────────────────────────────────────────── */
if (!sessionStorage.getItem("_sess")) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token_exp");
}
sessionStorage.setItem("_sess", "1");

/* ── bfcache guard ───────────────────────────────────────────
   Browser may restore page from cache on back-button (persisted).
   Re-check session flag; if missing → force login immediately.
   ─────────────────────────────────────────────────────────── */
window.addEventListener("pageshow", (e) => {
  if (e.persisted && !sessionStorage.getItem("_sess")) {
    window.location.replace("/login");
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CompanyProvider>
      <App />
    </CompanyProvider>
  </React.StrictMode>
);