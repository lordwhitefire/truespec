// The one section definition (R-SEC-1…5). The section vocabulary lives here and
// nowhere else; every section label anywhere in the product reads from this module.
//
// Canonical form is lowercase ("available" | "on order" | "landed" | "sold") — it
// matches the stored `car_state.section` values and the public payload, so there is
// one section vocabulary end to end. The label ("Available" / "On Order" / "Landed"
// / "Sold") is derived from it, never stored as a second identity.
//
// A section and a primary state now name the same thing (design D15, owner ruling
// 2026-10-15): the four sections are the four fixed primary states. The showroom
// presents three of them — PUBLIC_SECTIONS — and Sold is never shown publicly.
//
// This module is the only place the section set is named, typed, resolved and
// validated. No screen keeps a section map of its own (see the TASK-002 model).

export type Section = 'available' | 'on order' | 'landed' | 'sold';

// R-SEC-1 — the section vocabulary is the four fixed primary states, and nothing
// derived from any owner state list.
export const SECTIONS = ['available', 'on order', 'landed', 'sold'] as const;

// R-SEC-1 — the three the showroom presents. Sold is a section but is never shown,
// so no public screen may iterate `SECTIONS`; it iterates this.
export const PUBLIC_SECTIONS: readonly Section[] = ['available', 'on order', 'landed'];

// R-SEC-1 — the display names, from the one place.
export const SECTION_LABEL: Record<Section, string> = {
  available: 'Available',
  'on order': 'On Order',
  landed: 'Landed',
  sold: 'Sold',
};

export function isSection(value: unknown): value is Section {
  return typeof value === 'string' && (SECTIONS as readonly string[]).includes(value);
}

export function sectionLabel(section: Section): string {
  return SECTION_LABEL[section];
}

// R-SEC-2 (read point: the inventory URL) — the short form a screen uses for a section
// in a query string, and the one normalisation from a loose URL value to a section.
// Kept here with the section set so no screen invents its own section/token map;
// `sectionOfToken` accepts both the short form and the section's own name, and returns
// `null` for anything that is not a section.
export const SECTION_TOKEN: Record<Section, string> = {
  available: 'a',
  'on order': 'o',
  landed: 'l',
  sold: 's',
};

export function tokenOf(section: Section): string {
  return SECTION_TOKEN[section];
}

export function sectionOfToken(value: string): Section | null {
  const key = value.trim().toLowerCase();
  if (isSection(key)) return key;
  return SECTIONS.find((section) => SECTION_TOKEN[section] === key) ?? null;
}

// R-SEC-2 — a state resolves to exactly one of the four sections. A state that maps
// to none, or to two, cannot exist: resolution raises rather than guessing. The
// configured section is what the owner's state registry (car_state) says the state
// means; passing it as an array lets "more than one" be caught instead of silently
// taking the first.
export function sectionOfState(
  state: string,
  configuredSection?: string | readonly string[] | null
): Section {
  if (typeof state !== 'string' || state.trim() === '') {
    throw new Error('sectionOfState: a state must be a non-empty string');
  }

  const configured: readonly string[] =
    configuredSection == null
      ? []
      : typeof configuredSection === 'string'
        ? [configuredSection]
        : configuredSection;

  if (configured.length === 0) {
    throw new Error(`sectionOfState: state "${state}" maps to no section`);
  }
  if (configured.length > 1) {
    throw new Error(`sectionOfState: state "${state}" maps to more than one section`);
  }

  const [only] = configured;
  if (!isSection(only)) {
    throw new Error(`sectionOfState: state "${state}" maps to an unknown section "${only}"`);
  }
  return only;
}

// R-SEC-3 — Landed is presented inside Available (a landed car is still buyable).
// This is the section-inclusion relation; the counting rule (R-CNT-1) is separate.
export const AVAILABLE_PRESENTATION: readonly Section[] = ['available', 'landed'];

export function inAvailablePresentation(section: Section): boolean {
  return AVAILABLE_PRESENTATION.includes(section);
}

// R-SEC-3 + R-SEC-4 — the sections a car is presented under, from its section and
// its new-arrival flag alone. A car in Landed appears under Available too; a car
// flagged as a new arrival appears under both Landed and Available. A Sold car is
// presented nowhere public — the showroom never shows Sold. The owner's state label
// is never an input. (The new-arrival flag is meaningful on a car that has landed;
// the flag on an on-order car is unstated by the specs — raised, not decided here.)
export function presentedSections(car: { section: Section; isNewArrival?: boolean }): Section[] {
  if (car.section === 'sold') return [];
  const presented = new Set<Section>([car.section]);
  if (car.section === 'available' || car.section === 'landed') presented.add('available');
  if (car.section === 'landed') presented.add('landed');
  if (car.isNewArrival && (car.section === 'available' || car.section === 'landed')) {
    presented.add('landed');
  }
  return SECTIONS.filter((section) => presented.has(section));
}
