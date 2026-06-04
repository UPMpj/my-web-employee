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
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return user;
}
