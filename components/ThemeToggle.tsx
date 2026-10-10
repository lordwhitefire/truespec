"use client";

import { useEffect, useState } from "react";

// The visitor's choice wins and is persisted; the device setting is never consulted.
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("ts-theme");
    setTheme(stored === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("ts-theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <button className="thm" id="thm" type="button" onClick={toggle} aria-label="Toggle dark mode">
      <i className="fa-solid fa-moon" />
    </button>
  );
}
