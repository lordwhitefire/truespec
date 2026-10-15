// The tap count, as the office nav shows it (truth 8: "a count badge ... never a popup, an alert or a
// sound").
//
// It is drawn with inline styles on purpose: the Office shell's layout imports no CSS — each office
// page carries its own self-contained stylesheet — so a class here would have to be repeated in six
// stylesheets and could drift between them. The shell already styles its one other shared control
// (sign out) the same way.
//
// Hidden at zero: the badge is a notice that something arrived, not a statistic. The dashboard's panel
// is where "none yet" is said in words.
export function TapBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = `${count} WhatsApp ${count === 1 ? "tap" : "taps"} recorded`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        marginLeft: "auto",
        minWidth: 22,
        height: 20,
        padding: "0 7px",
        borderRadius: 10,
        background: "var(--gold)",
        color: "var(--gt)",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: "20px",
        textAlign: "center",
      }}
    >
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
    </span>
  );
}
