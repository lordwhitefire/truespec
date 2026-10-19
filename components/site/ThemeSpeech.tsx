"use client";

import { useEffect, useState } from "react";

/**
 * The root 404's spoken theme line (extracted from `app/not-found.tsx` so the page itself can be a
 * server component and read the saved WhatsApp number). Behaviour unchanged.
 */
export function ThemeSpeech() {
  const [speaking, setSpeaking] = useState("");
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const theme = document.documentElement.dataset.theme;
    const text = theme === "dark" ? "Dark mode on." : "Light mode on.";
    setSpeaking(text);
    if (!m.matches) {
      setPopped(true);
      const t = setTimeout(() => setPopped(false), 350);
      return () => clearTimeout(t);
    }
  }, []);

  if (!speaking) return null;

  return (
    <p
      className={popped ? "speak pop" : "speak"}
      role="status"
      aria-live="polite"
      style={{
        margin: "26px auto 0",
        maxWidth: 440,
        background: "var(--lt)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--gold)",
        padding: "10px 14px",
        fontSize: 14,
      }}
    >
      {speaking}
    </p>
  );
}
