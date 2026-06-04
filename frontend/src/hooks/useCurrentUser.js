import { useState, useEffect } from "react";

export function useCurrentUser() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  });

  useEffect(() => {
    const sync = () => {
      try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); }
      catch { setUser({}); }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return user;
}
