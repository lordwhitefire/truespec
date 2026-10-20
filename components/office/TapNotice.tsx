import Link from "next/link";
import { TapBadge } from "./TapBadge";

// The tap notice as a **link**: the one figure, carried in the shell's two homes (Designer ruling 2)
// — the phone topbar (rightmost icon, every office route) and the desktop sidebar's account footer —
// and it opens the taps tab on the Enquiries page.
//
// The accessible name lives here, on the link, and the glyph+circle inside are decorative (ruling 4),
// so the figure is announced once and the link is never nameless. It states the true count even when
// the visible circle is capped `99+`. "new" is deliberate (owner ruling, 2026-10-16): the figure is
// the taps since the office last looked at the taps list, not an all-time total — it clears when that
// list is viewed and climbs again as new taps arrive.
//
// Present at zero (owner ruling, 2026-10-16): the link and its glyph stay in both homes — only the
// circle clears — so the taps list always has an entry point. The name drops the figure when there is
// nothing new.
//
// `className` is the one thing each home supplies — the topbar's `ico` button look, or nothing in the
// footer (where `.sfoot a` already styles it).
export function TapNotice({ count, className }: { count: number; className?: string }) {
  const n = count > 0 ? count : 0;
  const label = n > 0 ? `${n} new WhatsApp ${n === 1 ? "tap" : "taps"}` : "WhatsApp taps";
  return (
    <Link className={className} href="/office/enquiries?tab=taps" aria-label={label}>
      <TapBadge count={n} />
    </Link>
  );
}
