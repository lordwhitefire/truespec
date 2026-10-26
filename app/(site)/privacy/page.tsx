import Link from "next/link";
import "./privacy.css";
import "../../reference.css";
import { getSetting } from "@/lib/public-cars";

export default async function PrivacyPage() {
  // The site layout above this page is force-dynamic, so the number is read per request: the notice
  // names only the number the owner actually saved.
  const num = (await getSetting("whatsapp_number")) ?? "";
  const digits = num.replace(/\D/g, "");

  return (
    <>
      <main className="doc" id="doc">
        <p className="crumb">
          <Link href="/">Home</Link> / Privacy notice
        </p>
        <h1>Privacy notice</h1>
        <p className="upd">
          <i className="fa-regular fa-calendar" />
          Last updated: 26 October 2026
        </p>

        <div className="sumbox">
          <h2>The short version</h2>
          <p>
            This site collects almost nothing. The public showroom needs no account: you can browse
            without signing in, and there are no analytics. You can choose an optional demo account
            to try the office. If you do, the email you sign up with is used for signing in only; the
            demo&rsquo;s data and uploads reset daily, and the public showroom still shows the main
            inventory, not the demo&rsquo;s. The one thing we keep for every visitor is the record of
            a WhatsApp tap: which page, the car&rsquo;s code and the time, and nothing about you.
            When you contact us, that happens on WhatsApp, on your phone, with a message you can read
            before you send it.
          </p>
          <div className="chips">
            <span className="schip">
              <i className="fa-solid fa-user-slash" />
              Showroom: no account
            </span>
            <span className="schip">
              <i className="fa-solid fa-flask" />
              Optional demo account
            </span>
            <span className="schip">
              <i className="fa-solid fa-chart-simple" />
              No analytics
            </span>
            <span className="schip">
              <i className="fa-solid fa-ban" />
              No ads or trackers
            </span>
          </div>
        </div>

        <nav className="toc" aria-label="On this page">
          <a href="#collect">What we store</a>
          <a href="#demo">Demo accounts</a>
          <a href="#email">Email</a>
          <a href="#never">What we never collect</a>
          <a href="#whatsapp">WhatsApp</a>
          <a href="#retention">How long we keep it</a>
          <a href="#rights">Your rights</a>
          <a href="#contact">Who to contact</a>
        </nav>

        <section id="collect">
          <h2>What we store</h2>
          <ul className="ul">
            <li>
              <b>Dark mode choice</b> — If you toggle dark/light, a tiny value called{" "}
              <code>ts-theme</code> is saved in <code>localStorage</code> in your browser. It is not
              sent to our servers.
            </li>
            <li>
              <b>A demo account</b> — If you choose one, the email you sign up with is held by our
              sign-in provider and recorded in the demo office so the office can show who is signed
              in. The cars, enquiries, settings and uploads you create in the demo office are stored
              there. Demo data and uploads reset daily; see <a href="#demo">Demo accounts</a> below.
            </li>
            <li>
              <b>A main office account</b> — The main office is invitation-only. If you are invited,
              the email on that account is held by our sign-in provider and recorded in the main
              office for signing in.
            </li>
            <li>
              <b>A WhatsApp tap</b> — When you tap a WhatsApp link on a car, we record three things so
              the office knows that car was asked about: the page you tapped from, the car&rsquo;s code
              and the time. Nothing about you: no name, no number, no message, no address.
            </li>
          </ul>
        </section>

        <section id="demo">
          <h2>Demo accounts</h2>
          <p>
            The public showroom does not need an account. The demo office is a separate practice
            space: a demo account can create cars, enquiries, settings and uploads there without
            touching the main office.
          </p>
          <p>
            Demo data resets daily, around 03:00 UTC. Uploads are deleted with the demo. The public
            showroom always shows the main inventory, never the demo inventory. A demo account does
            not grant access to the main office; main access remains invitation-only.
          </p>
        </section>

        <section id="email">
          <h2>Email</h2>
          <p>
            If you create a demo account or are invited to the main office, the email you sign up
            with is used for signing in only. We do not send marketing email. This application has no
            email channel of its own: it sends no enquiry, marketing or notification email.
          </p>
          <p>
            Our sign-in provider may send its own authentication messages as part of the sign-up you
            chose. Those messages come from the provider, not from a marketing list.
          </p>
        </section>

        <section id="never">
          <h2>What we never collect</h2>
          <ul className="ul">
            <li>
              No email address is required to browse the showroom. If you choose a demo or main
              office account, the email you sign up with is used for signing in only. If you send us
              an enquiry sheet, it may contain contact details you choose to include.
            </li>
            <li>
              No password material in this application. The sign-in provider handles passwords; this
              application never sees or stores them.
            </li>
            <li>
              No phone numbers unless you write one in a WhatsApp message or an enquiry sheet you
              send us.
            </li>
            <li>No cookies for tracking, advertising or analytics.</li>
            <li>No IP-address logs for marketing.</li>
            <li>No third-party trackers (no Google Analytics, Meta Pixel, etc).</li>
            <li>No marketing email.</li>
          </ul>
        </section>

        <section id="whatsapp">
          <h2>WhatsApp</h2>
          <p>
            Enquiries go to{" "}
            {num ? (
              <>
                WhatsApp directly (<b>{num}</b>)
              </>
            ) : (
              <>our WhatsApp directly</>
            )}
            . When you tap "Chat on
            WhatsApp", you leave this site and open WhatsApp. WhatsApp is a separate service with
            its own privacy policy. Before you leave, this site records that the tap happened — the
            page, the car&rsquo;s code (when there is one) and the time — and nothing else. We only see
            what you choose to send us in that WhatsApp chat.
          </p>
        </section>

        <section id="retention">
          <h2>How long we keep it</h2>
          <p>
            We store no browsing data beyond that tap record — no name, no number, no message, no
            address. WhatsApp conversations are kept according to your WhatsApp settings and our
            normal business retention for sales enquiries. We don&rsquo;t keep copies of full lists of
            visitors.
          </p>
          <p>
            Demo data and uploads reset daily, around 03:00 UTC. The demo office&rsquo;s account record
            is reset with the demo; the account itself is held by our sign-in provider. Main office
            records are kept as normal business records. If you want an account removed, see{" "}
            <a href="#rights">Your rights</a>.
          </p>
        </section>

        <section id="rights">
          <h2>Your rights</h2>
          <p>
            If you sent us an enquiry and would like it removed, message us on{" "}
            {digits ? (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                WhatsApp ({num})
              </a>
            ) : (
              "WhatsApp"
            )}{" "}
            with enough detail to identify it — for example the car&rsquo;s code, or the number you
            wrote from. We will remove the enquiry, and its imported sheet when no other enquiry or
            draft is using it. The tap record — the page, the car&rsquo;s code and the time, and
            nothing about you — stays.
          </p>
          <p>
            If you created a demo account and want it removed, message us on{" "}
            {digits ? (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            ) : (
              "WhatsApp"
            )}{" "}
            with the email you used to sign up. We will remove the account. Demo data and uploads are
            reset daily anyway. Depending on your jurisdiction, you may have other rights; we&rsquo;ll
            try to help.
          </p>
        </section>

        <section id="contact">
          <h2>Who to contact</h2>
          <p>
            Questions about this notice: message us on{" "}
            {digits ? (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            ) : (
              "WhatsApp"
            )}
            .
          </p>
          <div className="own">
            <i className="fa-solid fa-user-shield" />
            <span>
              <b>Owner note:</b> replace the &quot;last updated&quot; date and any contact details
              before publishing.
            </span>
          </div>
        </section>
      </main>
    </>
  );
}
