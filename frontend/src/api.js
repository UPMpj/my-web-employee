import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true, // send httpOnly cookie on every request
});

/* Auth is carried entirely by the httpOnly cookie (withCredentials above) —
   the session token is never readable from JS, so an XSS bug can't steal it. */

/* Redirect to login on 401 — but NOT when already on the login page */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("user");
      sessionStorage.removeItem("_sess");
      sessionStorage.removeItem("token_exp");
      /* tell the login page to show "session expired" message */
      sessionStorage.setItem("session_expired", "1");
      window.location.replace("/login");
    }
    return Promise.reject(err);
  }
);

/** Properly logout: invalidate token on server, clear all auth state, block back-button */
export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // ignore network errors — still clear local state
  } finally {
    localStorage.removeItem("user");
    sessionStorage.removeItem("_sess");
    sessionStorage.removeItem("token_exp");
    /* replace() overwrites the current history entry so back-button
       cannot return to the protected page that triggered logout */
    window.location.replace("/login");
  }
}

/** ຮອງຮັບທັງ Cloudinary URL ແລະ legacy /uploads/ path */
export function photoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  return `${API_BASE}${photo}`;
}

/** Password strength rules (ກົງກັບ backend) */
export function validatePassword(pw) {
  if (pw.length < 8)            return "ລະຫັດຜ່ານຕ້ອງຢ່າງໜ້ອຍ 8 ຕົວ";
  if (!/[A-Z]/.test(pw))        return "ຕ້ອງມີຕົວພິມໃຫຍ່ຢ່າງໜ້ອຍ 1 ໂຕ (A-Z)";
  if (!/[0-9]/.test(pw))        return "ຕ້ອງມີຕົວເລກຢ່າງໜ້ອຍ 1 ໂຕ (0-9)";
  if (!/[^A-Za-z0-9]/.test(pw)) return "ຕ້ອງມີຕົວອັກສອນພິເສດຢ່າງໜ້ອຍ 1 ໂຕ (@, #, !, ...)";
  return null;
}
