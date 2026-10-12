"use client";

import "./globals.css";
import "./reference.css";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
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

  return (
    <div className="nfbox" style={{ padding: "90px 24px", textAlign: "center", maxWidth: 620, margin: "auto" }}>
      <div
        className="av"
        aria-hidden="true"
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--gold)",
          color: "var(--gt)",
          display: "grid",
          placeItems: "center",
          fontFamily: "Oswald,sans-serif",
          fontWeight: 700,
          fontSize: 28,
          margin: "0 auto 20px",
        }}
      >
        U
      </div>
      <h1 style={{ fontSize: "clamp(26px,4vw,36px)", marginBottom: 12 }}>We couldn't find that page</h1>
      <p style={{ color: "var(--mute)", marginBottom: 28, fontSize: 15.5 }}>
        The link may be old, or the address mistyped. The showroom is still open — every car, one
        doorstep price, delivered anywhere in Nigeria.
      </p>
      <div className="row" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          className="btn"
          href="/inventory"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--gold)",
            color: "var(--gt)",
            height: 48,
            padding: "0 26px",
            fontWeight: 700,
            fontSize: 14,
            border: 0,
            borderRadius: 5,
          }}
        >
          <i className="fa-solid fa-grip" />
          Browse the inventory
        </Link>
        <a
          className="wab big"
          target="_blank"
          rel="noopener noreferrer"
          href="https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20was%20looking%20for%20a%20car%20on%20your%20site."
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--wa)",
            color: "#06220f",
            fontWeight: 700,
            fontSize: 15,
            padding: "0 26px",
            height: 48,
            borderRadius: 5,
            whiteSpace: "nowrap",
          }}
        >
          <i className="fa-brands fa-whatsapp fa-xl" />
          Message Umar
        </a>
      </div>
      <p style={{ marginTop: 22, fontSize: 13, color: "var(--mute)" }}>
        Or head back to the <Link href="/" style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>home page</Link>.
      </p>
      {speaking ? (
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
      ) : null}
    </div>
  );
}
