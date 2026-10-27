import { sectionLabel } from '@/lib/sections';
import type { PublicCar } from '@/lib/serialize';

// Shared view helpers for the home screen (reference card/hero/featured markup).

export function carTitle(c: PublicCar): string {
  return [c.year, c.brand, c.model, c.trim].filter(Boolean).join(' ');
}

export type CarState = { t: string; rb: string; chip: string; dot: string };

// The reference `state(c)`: a "was" price reads as Special; otherwise the section.
// The section wording comes from the one module (`sectionLabel`), never a local map.
export function carState(c: PublicCar): CarState | null {
  if (c.wasPriceKobo !== null) return { t: 'Special', rb: '', chip: 'deal', dot: 'var(--gold)' };
  if (c.section === 'on order')
    return { t: sectionLabel('on order'), rb: 'oo', chip: 'oo', dot: 'var(--oo)' };
  if (c.section === 'landed')
    return { t: sectionLabel('landed'), rb: 'ld', chip: 'ld', dot: 'var(--ld)' };
  return null;
}

export function mileageLabel(c: PublicCar): string | null {
  return c.mileageKm === null ? null : `${c.mileageKm.toLocaleString('en-US')} km`;
}

export function heroPrice(kobo: number): string {
  return `₦${(kobo / 100 / 1e6).toFixed(1)}M`;
}

export function carHref(c: PublicCar): string {
  return `/car/${encodeURIComponent(c.ref)}`;
}
