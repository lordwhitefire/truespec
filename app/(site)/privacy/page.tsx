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
          Last updated: 4 October 2026
        </p>

        <div className="sumbox">
          <h2>The short version</h2>
          <p>
            This site collects almost nothing. There are no accounts, no forms and no analytics. The
            only things stored are a few small settings <b>in your own browser</b> — like your
            dark-mode choice — and they never leave your device. The one thing we keep on our side is
            the record of a WhatsApp tap: which page, the car&rsquo;s code and the time, and nothing
            about you. When you contact us, that happens on WhatsApp, on your phone, with a message
            you can read before you send it.
          </p>
          <div className="chips">
            <span className="schip">
              <i className="fa-solid fa-user-slash" />
              No accounts
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
              <b>Nothing for users</b> — We don't create user accounts or profiles.
            </li>
            <li>
              <b>A WhatsApp tap</b> — When you tap a WhatsApp link on a car, we record three things so
              the office knows that car was asked about: the page you tapped from, the car&rsquo;s code
              and the time. Nothing about you: no name, no number, no message, no address.
            </li>
          </ul>
        </section>

        <section id="never">
          <h2>What we never collect</h2>
          <ul className="ul">
            <li>No email addresses, passwords or phone numbers (unless you write one yourself in a WhatsApp message).</li>
            <li>No cookies for tracking, advertising or analytics.</li>
            <li>No IP-address logs for marketing.</li>
            <li>No third-party trackers (no Google Analytics, Meta Pixel, etc).</li>
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
            normal business retention for sales enquiries. We don't keep copies of full lists of
            visitors.
          </p>
        </section>

        <section id="rights">
          <h2>Your rights</h2>
          <p>
            If you'd like us to delete a WhatsApp enquiry, email a short request to the contact
            below with enough detail to identify it. Depending on your jurisdiction, you may have
            other rights; we'll try to help.
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
              <b>Owner note:</b> this is a demo privacy notice. Replace the "last updated" date and
              any contact details before publishing.
            </span>
          </div>
        </section>
      </main>
    </>
  );
}
