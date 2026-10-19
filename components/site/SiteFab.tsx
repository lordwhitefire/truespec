"use client";

import { usePathname } from "next/navigation";
import { WA_OFF_REASON, waClass, waOffProps } from "@/components/whatsapp";

// The floating WhatsApp button exists on the home and inventory pages in the
// reference site, but the car detail page has none. Render it everywhere except
// the car route so the runtime structure matches the reference per route.
export function SiteFab({ href }: { href: string | null }) {
  const pathname = usePathname();
  if (pathname && pathname.startsWith("/car/")) return null;
  const off = !href;

  return (
    <a
      className={waClass("fab", off)}
      href={href ?? undefined}
      {...waOffProps(off)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={off ? `Chat on WhatsApp — ${WA_OFF_REASON}` : "Chat on WhatsApp"}
    >
      <i className="fa-brands fa-whatsapp" />
    </a>
  );
}
