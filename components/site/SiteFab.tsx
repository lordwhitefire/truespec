"use client";

import { usePathname } from "next/navigation";

// The floating WhatsApp button exists on the home and inventory pages in the
// reference site, but the car detail page has none. Render it everywhere except
// the car route so the runtime structure matches the reference per route.
export function SiteFab({ href }: { href: string }) {
  const pathname = usePathname();
  if (pathname && pathname.startsWith("/car/")) return null;

  return (
    <a className="fab" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
      <i className="fa-brands fa-whatsapp" />
    </a>
  );
}
