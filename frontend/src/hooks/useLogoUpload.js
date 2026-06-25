import { useState, useEffect } from "react";
import { api } from "../api";
import { useCurrentUser } from "./useCurrentUser";

/* Shared logo upload/remove logic — used by Sidebar.jsx (compact) and the
   Settings > Appearance tab (full preview). Super Admin uploads sync to all
   users via Cloudinary/app_settings; other roles get a local-only preview. */
export function useLogoUpload() {
  const user = useCurrentUser();
  const isSuperAdmin = user?.role === "Super Admin";
  const [logoSrc, setLogoSrc] = useState(localStorage.getItem("sidebar_logo") || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const sync = () => setLogoSrc(localStorage.getItem("sidebar_logo") || null);
    window.addEventListener("storage", sync);
    window.addEventListener("sidebar_logo_changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("sidebar_logo_changed", sync);
    };
  }, []);

  const setAndBroadcast = (value) => {
    if (value) localStorage.setItem("sidebar_logo", value);
    else localStorage.removeItem("sidebar_logo");
    setLogoSrc(value);
    window.dispatchEvent(new CustomEvent("sidebar_logo_changed"));
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      if (isSuperAdmin) {
        const formData = new FormData();
        formData.append("logo", file);
        const res = await api.put("/settings/logo", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setAndBroadcast(res.data.logo_url);
      } else {
        const reader = new FileReader();
        await new Promise(resolve => {
          reader.onload = (ev) => { setAndBroadcast(ev.target.result); resolve(); };
          reader.readAsDataURL(file);
        });
      }
    } catch {
      /* fallback to local-only preview if the API upload fails */
      const reader = new FileReader();
      reader.onload = (ev) => setAndBroadcast(ev.target.result);
      reader.readAsDataURL(file);
    }
    setUploading(false);
  };

  const removeLogo = async () => {
    if (isSuperAdmin) await api.delete("/settings/logo").catch(() => {});
    setAndBroadcast(null);
  };

  return { logoSrc, uploading, isSuperAdmin, uploadLogo, removeLogo };
}
