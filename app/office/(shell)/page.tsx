import "./office.css";
import Link from "next/link";
import { getOfficeDashboard } from "@/lib/office";
import { formatNaira, nairaDigits } from "@/lib/money";

// The figures come from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";

// Dashboard — built to the reference runtime model.
//
// The figures are computed by the office read layer (lib/office.ts) from the one
// `car` table with `cost_line` and `car_state` — plan §6. The two feed panels
// (activity, WhatsApp taps) stay presentational for now; they are the activity
// and enquiries screens' data and get DB-backed when those screens are built.
export default async function DashboardPage() {
  const d = await getOfficeDashboard();

  return (
    <>
      <div className="hrow">
        <div>
          <h1>Dashboard</h1>
          <p className="sub2">Saturday morning, 4 October 2026 · things at a glance</p>
        </div>
        <Link className="btn" href="/office/car">
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

      {/* counts strip: Available includes landed, never counted twice */}
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
            <span>arriving Nov – Jan</span>
          </div>
        </div>
        <div className="sc">
          <i className="fa-solid fa-comments" />
          <div>
            <b>5 open enquiries</b>
            <span>2 new this week</span>
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
          <div className="rowl">
            <span className="avx">U</span>
            <p>
              <b>Umar</b> changed state of <b>Toyota Land Cruiser Prado TX</b> to <b>At port</b>
              <span className="tag state">state</span>
              <time>Today, 08:42</time>
            </p>
          </div>
          <div className="rowl">
            <span className="avx">U</span>
            <p>
              <b>Umar</b> added <b>Toyota Camry SE 2021</b>
              <span className="tag add">added</span>
              <time>Yesterday, 17:05</time>
            </p>
          </div>
          <div className="rowl">
            <span className="avx">U</span>
            <p>
              <b>Umar</b> edited costs on <b>Toyota Sienna LE</b>
              <span className="tag edit">edited</span>
              <time>Yesterday, 14:31</time>
            </p>
          </div>
          <div className="rowl">
            <span className="avx">U</span>
            <p>
              <b>Umar</b> marked <b>Toyota Camry XLE 2018</b> as <b>Sold — ₦31.5M</b>
              <span className="tag sold">sold</span>
              <time>Mon, 29 Sep, 11:20</time>
            </p>
          </div>
          <div className="rowl">
            <span className="avx">U</span>
            <p>
              <b>Umar</b> added <b>Lexus RX 350 2019</b>
              <span className="tag add">added</span>
              <time>Mon, 29 Sep, 09:14</time>
            </p>
          </div>
          <button className="more2" type="button">
            Show older entries
          </button>
        </section>

        <section className="panel" aria-label="Recent WhatsApp taps">
          <div className="ph2">
            <h2>Recent WhatsApp taps</h2>
            <Link href="/office/enquiries">All enquiries</Link>
          </div>
          <div className="wt">
            <span className="wti">
              <i className="fa-brands fa-whatsapp" />
            </span>
            <p>
              Tap on <a href="#">2019 Lexus RX 350</a>
            </p>
            <time>18 min ago</time>
          </div>
          <div className="wt">
            <span className="wti">
              <i className="fa-brands fa-whatsapp" />
            </span>
            <p>
              Tap on <a href="#">2021 Toyota Camry SE</a>
            </p>
            <time>1 hr ago</time>
          </div>
          <div className="wt">
            <span className="wti">
              <i className="fa-brands fa-whatsapp" />
            </span>
            <p>General tap — home page</p>
            <time>3 hrs ago</time>
          </div>
          <div className="wt">
            <span className="wti">
              <i className="fa-brands fa-whatsapp" />
            </span>
            <p>
              Tap on <a href="#">2019 Toyota Hilux SRV</a>
            </p>
            <time>Yesterday</time>
          </div>
          <div className="wt">
            <span className="wti">
              <i className="fa-brands fa-whatsapp" />
            </span>
            <p>
              Tap on <a href="#">2020 Toyota Sienna LE</a>
            </p>
            <time>Yesterday</time>
          </div>
          <button className="more2" type="button">
            Show all taps
          </button>
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
