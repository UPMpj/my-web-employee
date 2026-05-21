import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Redirect to login on 401 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/** Properly logout: invalidate token on server then clear local storage */
export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // ignore network errors — still clear local state
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
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
