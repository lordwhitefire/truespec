/**
 * The demo space's persistent notice.
 *
 * It is rendered by the office shell only when the session's space is demo; the main shell renders
 * nothing. It is not dismissible and it is not the boundary — the server-side space rule and the
 * store doors remain the boundary. The words are the design's: a demo, a daily reset around 03:00
 * UTC, and uploads deleted with the demo.
 *
 * The styles live here, not in `office.css`: each office page loads its own self-contained
 * stylesheet and the shell imports none, so a rule in `office.css` would not reach the car,
 * settings, drafts or inventory pages. The banner is sticky below the mobile topbar and below the
 * offline line when that line is showing.
 */
export function DemoBanner() {
  return (
    <>
      <style>{`
.ts-demo-banner{position:sticky;top:var(--ts-office-offline-h,0px);z-index:20;box-sizing:border-box;
  margin:0 0 22px;padding:10px 14px;border:1px solid var(--line);border-left:4px solid var(--gold);
  border-radius:8px;background:var(--lt);color:var(--ink);font-size:13px;font-weight:500;line-height:1.45}
.ts-demo-banner strong{font-weight:700;color:var(--ink)}
@media(max-width:820px){.ts-demo-banner{top:calc(56px + var(--ts-office-offline-h,0px))}}
`}</style>
      <div className="ts-demo-banner" role="note" aria-label="Demo notice">
        <strong>Demo</strong> — everything here resets daily (around 03:00 UTC). Uploads are
        deleted with the demo.
      </div>
    </>
  );
}
