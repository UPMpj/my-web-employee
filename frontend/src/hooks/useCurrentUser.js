import { useState, useEffect } from "react";

function readUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem("user") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState(readUser);

  useEffect(() => {
    const sync = () => setUser(readUser());
    /* cross-tab changes */
    window.addEventListener("storage",      sync);
    /* same-tab changes (dispatched by Settings after saving profile) */
    window.addEventListener("user_changed", sync);
    return () => {
      window.removeEventListener("storage",      sync);
      window.removeEventListener("user_changed", sync);
    };
  }, []);

  return user;
}
