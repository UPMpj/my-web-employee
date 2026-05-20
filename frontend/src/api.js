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

/** ຮອງຮັບທັງ Cloudinary URL ແລະ legacy /uploads/ path */
export function photoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  return `${API_BASE}${photo}`;
}
