"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * The dashboard's refresh-on-focus (`specs/dashboard/spec.md:35-40`):
 * "The dashboard SHALL refresh on window/tab focus rather than offering a manual Refresh control."
 *
 * Mounted on the dashboard only. When the owner comes back to the tab, the current route's server
 * components are re-fetched, so the figures and the tap notice pick up anything that landed while the
 * tab was away — with no button and no full page load. `router.refresh()` re-renders the route
 * (its layout, which carries the tap notice, included) and keeps client state, so this is a refresh,
 * not a reload.
 *
 * `visibilitychange` is the event that matters (a tab made visible again); `focus` covers the window
 * being re-focused while already visible. Both are guarded by the tab actually being visible and by a
 * short cooldown, so a flurry of focus events asks the server once rather than on every event.
 */
const COOLDOWN_MS = 3000;

export function FocusRefresh() {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last.current < COOLDOWN_MS) return;
      last.current = now;
      router.refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  return null;
}
