import type { PublicCar } from '@/lib/serialize';

/**
 * D16 — with no number saved the chat affordances stay on the screen and are visibly off. The
 * header line says why there is no number; every control carries the fuller reason (title and
 * accessible description), because a control that only looks dead is still a control that
 * explains nothing.
 */
export const WA_OFF_TEXT = 'No number saved';
export const WA_OFF_REASON = 'No WhatsApp number is saved yet.';

/** A base class plus the off state's class, in one place so the name cannot drift. */
export function waClass(base: string, off: boolean): string {
  return off ? `${base} wa-off` : base;
}

/**
 * The attributes of an off chat control. There is no `href`, so it is not a link and not in the
 * tab order; `role="link"` + `aria-disabled` keep it announced as a control that is switched off
 * rather than as plain text, and `title` is the reason a sighted visitor can read.
 */
export function waOffProps(off: boolean) {
  return off
    ? {
        role: 'link' as const,
        'aria-disabled': true as const,
        tabIndex: -1,
        title: WA_OFF_REASON,
      }
    : {};
}

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
  const digits = (number ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function carWaLink(number: string | null | undefined, car: PublicCar): string | null {
  const name = [car.year, car.brand, car.model, car.trim].filter(Boolean).join(' ');
  return waLink(number, `Hello TrueSpec, I'm interested in the ${name} (${car.ref}).`);
}
