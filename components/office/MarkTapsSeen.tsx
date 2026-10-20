"use client";

import { useEffect, useRef } from "react";
import { markTapsSeenAction } from "@/app/office/actions/tap";

/**
 * Marks the taps seen when the Taps tab is viewed (owner ruling, 2026-10-16): the badge's number
 * clears because the office has now looked, and reappears only when new taps arrive.
 *
 * Mounted **only** on the Taps panel. The page is a GET and a GET must not change data, so this small
 * client component does the write instead: on mount it calls the Server Action with the id of the
 * newest tap that was actually rendered, and the store resolves that tap's own time — so a tap that
 * arrived after the list was drawn stays "new" (the badge can reappear at once for it, which is
 * correct).
 *
 * It fires once (the ref guard survives React's dev double-invoke). The write only ever moves the
 * watermark forward, so a repeat would be harmless anyway.
 */
export function MarkTapsSeen({ newestTapId }: { newestTapId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void markTapsSeenAction(newestTapId);
  }, [newestTapId]);

  return null;
}
