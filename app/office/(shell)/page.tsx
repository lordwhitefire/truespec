import "./office.css";
import Link from "next/link";
import { getOfficeActivity, getOfficeDashboard, getOfficeTaps } from "@/lib/office";
import { formatNaira, nairaDigits } from "@/lib/money";
import { requireOfficeSession } from "@/lib/session";
import { categoryLabel, categoryOf, operator, toActivityEntries, wordOf } from "@/lib/activity-feed";
import { shortAge, weekdayDay } from "@/lib/office-time";

// The figures come from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";

/** How many rows a feed panel draws. A feed is "recent" by nature; the log page reads the whole
 *  bounded feed, and the taps panel's full list is the office's to come (Task 19). */
const RECENT = 5;

// Dashboard — built to the reference runtime model.
//
// Every figure and both feeds come from the store: the counts and the money from `getOfficeDashboard()`
// (the one shared counting rule, `lib/counts.ts`), the activity rows from `activity_event` and the taps
// from `tap` (truth 15). Nothing on this page is a seed and nothing is drafted from one — an empty feed
// says it is empty rather than standing in as real-looking rows (truth 16).
export default async function DashboardPage() {
  await requireOfficeSession();
  const [d, activity, taps] = await Promise.all([
    getOfficeDashboard(),
    getOfficeActivity(),
    getOfficeTaps(),
  ]);
  const now = new Date();
  const entries = toActivityEntries(activity, now);

  return (
    <>
      <div className="hrow">
        <div>
          <h1>Dashboard</h1>
          <p className="sub2">{weekdayDay(now.toISOString())} · things at a glance</p>
        </div>
        <Link className="btn" href="/office/car/new">
          <i className="fa-solid fa-plus" />
          Add a car
        </Link>
      </div>

      {/* the three totals, exactly as the product model defines them */}
      <div className="kpis">
        <div className="kpi">
          <small>
            <i className="fa-solid fa-car-side" />
            Money tied up
          </small>
          <div className="num">
            <s>₦</s>
            {nairaDigits(d.moneyTiedUp.kobo)}
          </div>
          <p className="foot">
            Across <b>{d.moneyTiedUp.of} cars</b> in stock — includes cars with incomplete costs, because that money is spent.
          </p>
        </div>
        <div className="kpi warn">
          <small>
            <i className="fa-solid fa-sack-dollar" />
            Projected profit
          </small>
          <div className="num">
            <s>₦</s>
            {nairaDigits(d.projectedProfit.kobo)}
          </div>
          <p className="foot w">
            <b>
              From {d.projectedProfit.counted} of {d.projectedProfit.of} cars.
            </b>{" "}
            {d.projectedProfit.stillBuilding} excluded: costs incomplete.{" "}
            <Link href="/office/inventory" style={{ textDecoration: "underline" }}>
              See which
            </Link>
          </p>
        </div>
        <div className="kpi">
          <small>
            <i className="fa-solid fa-flag-checkered" />
            Real profit (sold)
          </small>
          <div className="num">
            <s>₦</s>
            {nairaDigits(d.realProfit.kobo)}
          </div>
          <p className="foot">
            <b>{d.counts.sold} car sold</b> — {d.sold?.label ?? "—"}, sale price{" "}
            {d.sold?.priceKobo != null ? formatNaira(d.sold.priceKobo) : "—"}. Sits in Inventory → Sold.
          </p>
        </div>
      </div>

      {/* counts strip: the stock counts, from the one shared rule. Available and Landed overlap by
          this year's arrivals, which the notes say out loud (R-CNT-1); Sold is counted apart, on the
          profit card. No enquiry total here: the enquiry states are labels, not stages, so there is no
          "open" to count (D12, the UX decision of 2026-10-14). */}
      <div className="strip">
        <div className="sc">
          <i className="fa-solid fa-circle-check" />
          <div>
            <b>{d.counts.available} available</b>
            <span>of which {d.counts.newArrivals} new arrival</span>
          </div>
        </div>
        <div className="sc">
          <i className="fa-solid fa-ship" />
          <div>
            <b>{d.counts.onOrder} on order</b>
            <span>waiting to arrive</span>
          </div>
        </div>
        <div className="sc">
          <i className="fa-solid fa-plane-arrival" />
          <div>
            <b>{d.counts.landed} landed</b>
            <span>new ones counted in available</span>
          </div>
        </div>
      </div>

      {/* two panels */}
      <div className="duo">
        <section className="panel" aria-label="Recent activity">
          <div className="ph2">
            <h2>Recent activity</h2>
            <Link href="/office/activity">Full log</Link>
          </div>
          {entries.length === 0 ? (
            <div className="feed-empty">
              <i className="fa-solid fa-list-check" />
              <p>Nothing has been done to a car yet. Add one, or change one, and it will appear here.</p>
            </div>
          ) : (
            entries.slice(0, RECENT).map((e) => {
              const who = operator(e.actor);
              return (
                <div className="rowl" key={e.id}>
                  <span className="avx" title={who.title}>
                    {who.initial}
                  </span>
                  <p>
                    {wordOf(e.kind)}{" "}
                    {e.kind.startsWith("car.") ? (
                      <b>
                        <Link href={`/office/car/${e.subject}`} title={`Open ${e.subject}`}>
                          {e.subject}
                        </Link>
                      </b>
                    ) : (
                      <b>{e.subject}</b>
                    )}
                    <span className={`tag ${categoryOf(e.kind) || "other"}`}>{categoryLabel(e.kind)}</span>
                    <time>{shortAge(e.at, now)}</time>
                  </p>
                </div>
              );
            })
          )}
        </section>

        <section className="panel" aria-label="Recent WhatsApp taps">
          <div className="ph2">
            <h2>Recent WhatsApp taps</h2>
            <Link href="/office/enquiries">All enquiries</Link>
          </div>
          {taps.length === 0 ? (
            <div className="feed-empty">
              <i className="fa-brands fa-whatsapp" />
              <p>No taps yet. When a buyer taps WhatsApp on a car, it is recorded here.</p>
            </div>
          ) : (
            taps.slice(0, RECENT).map((t) => (
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
                      Tap on{" "}
                      <Link href={`/office/car/${t.carRef}`} title={`Open ${t.carRef}`}>
                        {t.car}
                      </Link>
                    </>
                  )}
                </p>
                <time>{shortAge(t.at, now)}</time>
              </div>
            ))
          )}
        </section>
      </div>

      {/* quiet reminder of the one rule */}
      <div className="legend">
        <span className="pill">
          <i />
          What the buyer never sees: costs, profit, private states — server-side rule, not a setting
        </span>
      </div>
    </>
  );
}
