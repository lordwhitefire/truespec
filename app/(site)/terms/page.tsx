import Link from 'next/link';
import './terms.css';
import '../../reference.css';
import { pageMetadata, TERMS_LAST_UPDATED } from '@/lib/site';
import { getSetting } from '@/lib/public-cars';
import type { Metadata } from 'next';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of service',
  description:
    'TrueSpec Automotive terms of service: availability, price changes, the WhatsApp sale path, delivery, and Nigerian law (Lagos).',
  path: '/terms',
});

export default async function TermsPage() {
  const num = (await getSetting('whatsapp_number')) ?? '';
  const digits = num.replace(/\D/g, '');

  return (
    <>
      <main className="doc" id="doc">
        <p className="crumb">
          <Link href="/">Home</Link> / Terms of service
        </p>
        <h1>Terms of service</h1>
        <p className="upd">
          <i className="fa-regular fa-calendar" />
          Last updated: {TERMS_LAST_UPDATED}
        </p>
        <p className="own">
          <i className="fa-regular fa-user" />
          <b>Owner:</b> TrueSpec Automotive · <b>Reviewed:</b> {TERMS_LAST_UPDATED}
        </p>

        <div className="sumbox">
          <h2>The short version</h2>
          <p>
            This site is a vehicle-import showroom: browse, judge a car completely, and buy through
            WhatsApp. No payment is taken on this site, and a WhatsApp conversation is not a binding
            sale until you and TrueSpec agree the car, the price and the delivery. Prices are in
            Nigerian naira (NGN) and include shipping, clearing and delivery to your door.
          </p>
          <div className="chips">
            <span className="schip">
              <i className="fa-solid fa-user-slash" />
              Showroom: no account
            </span>
            <span className="schip">
              <i className="fa-solid fa-ban" />
              No payment taken here
            </span>
            <span className="schip">
              <i className="fa-solid fa-chart-simple" />
              No analytics
            </span>
          </div>
        </div>

        <nav className="toc" aria-label="On this page">
          <a href="#what">What this site is</a>
          <a href="#availability">Availability</a>
          <a href="#prices">Prices</a>
          <a href="#sale">The WhatsApp sale</a>
          <a href="#delivery">Delivery</a>
          <a href="#condition">Condition and information</a>
          <a href="#liability">Liability</a>
          <a href="#law">Governing law</a>
          <a href="#contact">Contact</a>
        </nav>

        <section id="what">
          <h2>What this site is</h2>
          <p>
            TrueSpec Automotive is a Nigerian vehicle-import showroom. The public pages show the
            cars we have, the cars we have on order and the cars that have landed. The private
            office is for TrueSpec; this site is the showroom. Nothing is sold on this page — buying
            happens in the WhatsApp conversation.
          </p>
        </section>

        <section id="availability">
          <h2>Availability</h2>
          <p>
            Each car page shows the car’s current state — available, on order or landed.
            Availability can change: a car can be sold or reserved while you are looking. We do not
            hold a car for you until we agree it in the WhatsApp conversation. If a car is no longer
            available, we will tell you and help you find another.
          </p>
        </section>

        <section id="prices">
          <h2>Prices</h2>
          <p>
            Prices are shown in Nigerian naira (NGN). The price on a car page is the current
            doorstep price: shipping, clearing and delivery to your door in Nigeria are included.
            Prices may change, and the price we agree in the WhatsApp conversation is the price for
            that sale. We do not add a separate delivery charge at the door.
          </p>
        </section>

        <section id="sale">
          <h2>The WhatsApp sale</h2>
          <p>
            When you tap “Chat on WhatsApp”, you leave this site and open WhatsApp. A WhatsApp
            conversation is not a binding sale until you and TrueSpec agree the car, the price and
            the delivery. The messages you send are yours; the privacy notice explains what the site
            records.
          </p>
        </section>

        <section id="delivery">
          <h2>Delivery</h2>
          <p>
            We deliver to your door anywhere in Nigeria. Delivery is included in the price. Timing
            depends on the car’s state: an available or landed car can be delivered sooner; an
            on-order car is shipped from the USA and cleared at the port first. We will confirm the
            expected timing in the WhatsApp conversation, and the car is delivered fully cleared
            with the requirements completed.
          </p>
        </section>

        <section id="condition">
          <h2>Condition and information</h2>
          <p>
            We describe each car from the records and photos we have. Condition, mileage, features
            and colours are shown in good faith; minor differences can occur. Ask us for the current
            photos and details before you agree. The car is sold with the condition and terms we
            agree in the WhatsApp conversation.
          </p>
        </section>

        <section id="liability">
          <h2>Liability</h2>
          <p>
            We do not exclude liability that cannot be excluded by law. Beyond that, the site is
            provided as it is, and we are not liable for indirect losses arising from the site or
            from a car before a sale is agreed. The terms of the sale are the ones we agree in the
            WhatsApp conversation.
          </p>
        </section>

        <section id="law">
          <h2>Governing law</h2>
          <p>
            These terms and any sale are governed by the laws of the Federal Republic of Nigeria.
            The courts of Lagos State have jurisdiction.
          </p>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>
            Questions about these terms: message us on WhatsApp,{' '}
            {digits ? (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            ) : (
              'WhatsApp'
            )}
            .
          </p>
        </section>
      </main>
    </>
  );
}
