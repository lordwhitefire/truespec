import './enquiries.css';
import Link from 'next/link';
import {
  getAllOfficeTaps,
  getEnquiries,
  getEnquiryStateRegistry,
  type OfficeEnquiry,
  type OfficeTap,
} from '@/lib/office';
import { type EnquiryRegistryState } from '@/lib/enquiry-state';
import { longDay, shortAge } from '@/lib/office-time';
import { requireOfficeSession } from '@/lib/session';
import { CreateFromFile } from '@/components/office/CreateFromFile';
import { MarkTapsSeen } from '@/components/office/MarkTapsSeen';
import { Enquiries } from './enquiries-client';

// The board is the store's rows, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = 'force-dynamic';

/* Enquiries — one page, two panels, chosen by `?tab` (Designer ruling 5).

   The page's header (the `h1`, the explainer and the import control) sits above the tab row and is
   shared by both panels. The **Enquiries** panel is the board; the **Taps** panel is the full
   WhatsApp-tap record, newest first. The panel is chosen **on the server**, from the URL, so the
   notice and the list come from one read and there is no client flash; `?tab=taps` is the same page,
   not a new route.

   The Taps panel lists the same `tap` rows the shell's notice counts, read uncapped
   (`getAllOfficeTaps()`) because a list a person asked for is not a panel. The two time strings are
   formatted here, in UTC, so the row and the server always agree (`lib/office-time.ts`). */

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireOfficeSession();
  const { tab } = await searchParams;
  const showTaps = tab === 'taps';
  const now = new Date();

  // Only the panel being shown is read: the taps tab does not need the board, and the board does not
  // need the tap record.
  const states: EnquiryRegistryState[] = showTaps ? [] : await getEnquiryStateRegistry();
  const enquiries: OfficeEnquiry[] = showTaps ? [] : await getEnquiries();
  const taps: OfficeTap[] = showTaps ? await getAllOfficeTaps() : [];

  return (
    <>
      <div className="hrow">
        <div>
          <h1>Enquiries</h1>
          <p className="sub2">
            The site only records that a WhatsApp tap happened, and on which car. You bring the
            names and numbers back here by importing the enquiry sheet.
          </p>
        </div>
        {/* Where the sheet comes in (task.md §Q2). Its rows become **drafts**, not enquiries —
            nothing lands on this board until the owner saves them at Drafts. */}
        <div className="hbtns">
          <a className="btn gh" href="/api/enquiry-template">
            <i className="fa-solid fa-file-arrow-down" aria-hidden="true" />
            Enquiry template
          </a>
          <CreateFromFile hint="Import a filled enquiry template or the sales desk's sheet — its rows become drafts." />
        </div>
      </div>

      {/* Two panels of the one page, chosen by the URL. Links, not in-place buttons: the shell's
          notice and the dashboard's "All taps" link are two entry points from outside this page that
          must land on the Taps panel, and a plain link can only do that if the panel is in the URL. */}
      <nav className="etabs" aria-label="Enquiries sections">
        <Link
          href="/office/enquiries"
          className={'etab' + (showTaps ? '' : ' on')}
          aria-current={showTaps ? undefined : 'page'}
        >
          Enquiries
        </Link>
        <Link
          href="/office/enquiries?tab=taps"
          className={'etab' + (showTaps ? ' on' : '')}
          aria-current={showTaps ? 'page' : undefined}
        >
          Taps
        </Link>
      </nav>

      {showTaps ? (
        <TapsPanel
          taps={taps.map((t) => ({
            id: t.id,
            page: t.page,
            carRef: t.carRef,
            car: t.car,
            when: shortAge(t.at, now),
          }))}
        />
      ) : (
        <Enquiries
          states={states.map((state) => ({
            id: state.id,
            label: state.label,
            colour: state.colour,
          }))}
          enquiries={enquiries.map((e) => ({
            id: e.id,
            ref: e.ref,
            name: e.name,
            number: e.number,
            askedFor: e.askedFor,
            note: e.note,
            stateId: e.stateId,
            when: shortAge(e.createdAt, now),
            since: longDay(e.createdAt),
            imported: e.imported,
          }))}
        />
      )}
    </>
  );
}

/** One tap, as the Taps panel lists it — the `tap` row plus the car's name (or its ref), and the
 *  time the server already formatted. */
type TapRow = {
  id: string;
  page: string;
  carRef: string | null;
  car: string | null;
  when: string;
};

/* The Taps panel: the full WhatsApp-tap record, newest first — the same rows (and the same markup)
   the dashboard's panel draws, minus its `RECENT` cap. It is a **display**: a tap is an event, not a
   state, so nothing here changes a row. The empty state says so in words, exactly as the dashboard
   panel does, rather than looking like a store that broke.

   `.wt` is styled in `enquiries.css` (the office's per-page stylesheets are self-contained;
   `office.css`, which holds the dashboard's copy, is not loaded here). */
function TapsPanel({ taps }: { taps: TapRow[] }) {
  if (taps.length === 0) {
    return (
      <div className="taplist">
        <div className="taps-empty">
          <i className="fa-brands fa-whatsapp" />
          <p>No taps yet. When a buyer taps WhatsApp on a car, it is recorded here.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="taplist">
      {/* Viewed: the office has now looked at the taps, so the badge clears (owner ruling, 2026-10-16).
          A GET must not change data, so this small client component does the write — it names the
          newest tap shown, and the store resolves that tap's own time. */}
      <MarkTapsSeen newestTapId={taps[0].id} />
      {taps.map((t) => (
        <div className="wt" key={t.id}>
          <span className="wti">
            <i className="fa-brands fa-whatsapp" />
          </span>
          <p>
            {t.carRef === null ? (
              <>General tap — {t.page}</>
            ) : t.car === null ? (
              <>
                Tap on <b>{t.carRef}</b>
              </>
            ) : (
              <>
                Tap on{' '}
                <Link href={`/office/car/${t.carRef}`} title={`Open ${t.carRef}`}>
                  {t.car}
                </Link>
              </>
            )}
          </p>
          <time>{t.when}</time>
        </div>
      ))}
    </div>
  );
}
