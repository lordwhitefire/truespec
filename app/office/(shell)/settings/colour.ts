// Label ink by relative luminance (RECON-001 v1 §4, ui-plan Q12/Q64).
// One colour per state; the written label always sits on it, and the ink is
// whichever of near-black or white reads better — computed, never guessed.
// No random generator anywhere (owner ruling 2026-10-12).

function channel(hex: string, i: number): number {
  return parseInt(hex.slice(i, i + 2), 16) / 255;
}

// WCAG relative luminance of a #rrggbb colour.
function luminance(hex: string): number {
  const parts = [channel(hex, 1), channel(hex, 3), channel(hex, 5)].map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const BLACK = '#16181b';
const WHITE = '#ffffff';

// The ink that reads against `hex`: whichever of near-black / white has the
// higher contrast ratio. Always yields a readable pair for any colour.
export function inkFor(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return WHITE;
  const l = luminance(hex);
  return contrast(l, luminance(WHITE)) >= contrast(l, luminance(BLACK)) ? WHITE : BLACK;
}
