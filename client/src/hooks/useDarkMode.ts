import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem("hajdeha-dark-mode");
    if (saved !== null) {
      return saved === "true";
    }
    // Check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      // Don't add "light" class - Tailwind doesn't need it
      // Just removing "dark" is enough for light mode
      root.style.colorScheme = "light";
    }

    // Save to localStorage
    localStorage.setItem("hajdeha-dark-mode", String(isDark));
  }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev) => !prev);
  };

  return { isDark, toggleDarkMode };
}
