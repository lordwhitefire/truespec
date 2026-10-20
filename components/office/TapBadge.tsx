// The WhatsApp tap notice, drawn as a **notification badge**: the WhatsApp glyph with the count on a
// small circle at the glyph's top-right — the cart-icon pattern (owner ruling, 2026-10-16: "WhatsApp
// icon with the number on top, like the way it is for a cart icon when there are two items").
//
// It is the *unit* the shell's two homes carry: the phone topbar's rightmost icon and the desktop
// sidebar's account footer. Both wrap it in a **link** to the taps tab (`TapNotice.tsx`), so this
// component is purely the picture — the whole of it is decorative (`aria-hidden`). The accessible
// name lives on that link (Designer ruling 4), so a screen reader hears "N WhatsApp taps recorded"
// once, from the parent, never a bare number announced twice.
//
// Styled inline on purpose: the Office shell's layout imports no CSS — each office page carries its
// own self-contained stylesheet — so a class here would have to be repeated in six stylesheets and
// could drift between them. The shell already styles its one other shared control (sign out) the
// same way.
//
// Persists at zero (owner ruling, 2026-10-16): the glyph is always present — only the gold circle
// clears when there is nothing new. The glyph is the taps list's permanent entry point; the circle is
// what says "something arrived". "None yet" is said in words on the dashboard panel and in the taps
// tab's own empty state.
//
// The circle is the app's own gold (`var(--gold)` fill, `var(--gt)` numeral) with a 2px `var(--dk)`
// ring — the ring is what keeps the circle a circle while the topbar button behind it fills gold on
// hover (Designer ruling 1). The visible figure is capped `99+`; the link's name states the true one.
export function TapBadge({ count }: { count: number }) {
  const n = count > 0 ? count : 0;
  return (
    <span
      aria-hidden="true"
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <i className="fa-brands fa-whatsapp" />
      {n > 0 && (
        <span
          style={{
            position: "absolute",
            top: -7,
            right: -9,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 8,
            background: "var(--gold)",
            color: "var(--gt)",
            border: "2px solid var(--dk)",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "12px",
            textAlign: "center",
          }}
        >
          {n > 99 ? "99+" : n}
        </span>
      )}
    </span>
  );
}
