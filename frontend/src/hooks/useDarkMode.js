import { useEffect, useState } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("upm-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("upm-theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, setDark];
}
