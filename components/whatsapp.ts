import type { PublicCar } from "@/lib/serialize";

/**
 * The one place a WhatsApp link is built on the showroom.
 *
 * The saved number is normalised (`+234…`), and `wa.me` resolves only when the link carries digits
 * alone. With no number saved there is no recipient, and `https://wa.me/?text=…` is a dead button
 * dressed as a live one — the car page's link "does not lie, it dies" (FIX-001). So the helper
 * returns `null` instead of a link to nobody, and TypeScript makes every caller decide what an
 * absent number means before it renders.
 */
export function waLink(number: string | null | undefined, text: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function carWaLink(number: string | null | undefined, car: PublicCar): string | null {
  const name = [car.year, car.brand, car.model, car.trim].filter(Boolean).join(" ");
  return waLink(number, `Hello TrueSpec, I'm interested in the ${name} (${car.ref}).`);
}
