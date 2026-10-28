import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/app/(site)/car/car.css';
import { CarBehaviors } from '@/components/site/CarBehaviors';
import { Photo } from '@/components/Photo';
import { carHref, carTitle, mileageLabel } from '@/components/site/car-view';
import { carWaLink, waClass, waLink, waOffProps } from '@/components/whatsapp';
import { formatNaira } from '@/lib/money';
import { sectionLabel, tokenOf } from '@/lib/sections';
import { isSpecial, type PublicCar } from '@/lib/serialize';
import { getPublicCarForView, getPublicCars, getSetting } from '@/lib/public-cars';
import { pageMetadata } from '@/lib/site';
import { carGallerySrcSet, sizedPhotoUrl } from '@/lib/photo-url';
import { buildBreadcrumbJsonLd, buildCarJsonLd } from '@/lib/structured-data';
import { JsonLd } from '@/components/JsonLd';
import { CarLayers, RelatedShell } from './car-parts';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref } = await params;
  const car = await getPublicCarForView(ref);
  if (!car) {
    // The not-found boundary answers 404; keep the metadata honest too.
    return {
      title: 'Car not found | TrueSpec Automotive',
      description:
        'That car is no longer listed. Browse the current TrueSpec inventory of available, on-order and landed cars, each with one doorstep price. Imported from the USA.',
      robots: { index: false, follow: false },
    };
  }

  const name = carTitle(car);
  const price = formatNaira(car.priceKobo);
  const mileage = mileageLabel(car) ?? 'Mileage not stated';
  const image = car.photos[0] ? sizedPhotoUrl(car.photos[0], 1200, 630) : undefined;
  const sold = car.sold || car.section === 'sold';

  if (sold) {
    return pageMetadata({
      title: `Sold — ${name}`,
      description: `Sold — ${name}. ${price}, ${mileage}. See what else TrueSpec Automotive has available, imported from the USA and delivered anywhere in Nigeria.`,
      path: carHref(car),
      image,
      imageAlt: `${name} — sold`,
      noIndex: true,
    });
  }

  return pageMetadata({
    title: name,
    description: `${name} — ${price}, ${mileage}. ${sectionLabel(car.section)} from TrueSpec Automotive, imported from the USA and delivered anywhere in Nigeria. One price.`,
    path: carHref(car),
    image,
    imageAlt: name,
  });
}

const RELATED_H2: Record<string, string> = {
  available: 'More available cars',
  'on order': 'More cars on order',
  landed: 'More landed cars',
};

const DELIVERY_STEPS: { title: string; desc: string }[] = [
  {
    title: 'Pick the car',
    desc: 'Choose a car here or tell us the make, model and year you want.',
  },
  {
    title: 'Chat with us on WhatsApp',
    desc: 'Confirm the car and agree the doorstep price with the owner.',
  },
  { title: 'We ship and clear', desc: 'We buy, ship from the USA and clear the car at the port.' },
  {
    title: 'Delivered to your door',
    desc: 'Delivery anywhere in Nigeria is already in the price.',
  },
];

const FEATURE_TAIL = ['Shipping included', 'Clearing included', 'Delivery included'];

function crumbTitle(c: PublicCar): string {
  return [c.brand, c.model, c.year].filter(Boolean).join(' ');
}

function h1Title(c: PublicCar): string {
  return [c.brand, c.model, c.trim, c.year].filter(Boolean).join(' ');
}

function cardTitle(c: PublicCar): string {
  return [c.year, c.brand, c.model].filter(Boolean).join(' ');
}

function mileage(c: PublicCar): string {
  return c.mileageKm === null ? '—' : `${c.mileageKm.toLocaleString('en-US')} km`;
}

function leadSentence(c: PublicCar): string {
  const name = [c.year, c.brand, c.model, c.trim].filter(Boolean).join(' ');
  const ext = (c.exteriorColor ?? '—').toLowerCase();
  const int = (c.interiorColor ?? '—').toLowerCase();
  return `This ${name} comes in ${ext} with a ${int} interior and ${mileage(c)} on the clock.`;
}

function overview(c: PublicCar): string[] {
  const out: string[] = [];
  out.push(
    `Every ${c.brand ?? 'car'} we list is imported from the USA and delivered with one honest doorstep price.`
  );
  out.push(
    `Message us and we will send more photos, a video walk-around, or answer anything about this ${c.model ?? 'car'}.`
  );
  return out;
}

export default async function CarPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [car, number, all] = await Promise.all([
    getPublicCarForView(ref),
    getSetting('whatsapp_number'),
    getPublicCars(),
  ]);
  // A car that is not there answers a real 404: thrown before the response streams, it sends the
  // status and lets the co-located boundary render the view this page used to render inline.
  if (!car) notFound();

  // Separate sold from unknown - sold cars exist but are not listed. A car whose
  // configured section is Sold but whose sale row is absent is still sold, not a
  // normal listing; the sold view and noindex keep it out of the index.
  const sold = car.sold || car.section === 'sold';
  const jsonLd = buildCarJsonLd(car);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Inventory', path: '/inventory' },
    { name: sold ? 'Sold' : crumbTitle(car), path: carHref(car) },
  ]);
  const jsonLdScript = (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
    </>
  );
  if (sold) {
    return (
      <>
        {jsonLdScript}
        {soldPageView(car, all, number ?? '')}
      </>
    );
  }

  const num = number ?? '';
  const name = [car.brand, car.model].filter(Boolean).join(' ');
  const special = isSpecial(car);
  const sectionName = sectionLabel(car.section);
  const statusKey = tokenOf(car.section);
  const wa = carWaLink(num, car);
  const offerLink = waLink(
    num,
    `Hello TrueSpec, I would like to make an offer on the ${[car.year, car.brand, car.model, car.trim].filter(Boolean).join(' ')} (Ref ${car.ref}), listed at ${formatNaira(car.priceKobo)}.`
  );
  const viewingLink = waLink(
    num,
    `Hello TrueSpec, I would like to book a viewing for the ${[car.year, car.brand, car.model, car.trim].filter(Boolean).join(' ')} (Ref ${car.ref}).`
  );

  const related = all.filter((c) => c.ref !== car.ref).slice(0, 11);
  const cover = car.photos[0] ?? '';
  const coverSrcSet = cover ? carGallerySrcSet(cover) : undefined;
  const lead = leadSentence(car);
  const paragraphs = overview(car);
  const slug = [car.year, car.brand, car.model, car.trim]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const note =
    car.section === 'on order' && car.arrivalNote
      ? car.arrivalNote
      : `${sectionName} now. Message us to arrange a viewing.`;

  return (
    <>
      {jsonLdScript}
      <nav className="crumbs" aria-label="Breadcrumb">
        <div className="w" id="crumb">
          <a href="/">Home</a>
          <i className="fa-solid fa-chevron-right" />
          <a href="/inventory">Inventory</a>
          <i className="fa-solid fa-chevron-right" />
          <b aria-current="page">{crumbTitle(car)}</b>
        </div>
      </nav>

      <main className="main" id="main">
        <div className="w">
          <div className="cols">
            <div>
              <h1 className="in" id="ti">
                {h1Title(car)}
              </h1>

              <div className="chips in" style={{ '--d': 1 } as React.CSSProperties} id="chips">
                <span className={`chip st ${statusKey}`}>
                  <i className="fa-solid fa-circle" />
                  {sectionName}
                </span>
                <span className="chip">
                  <i className="fa-solid fa-hashtag" />
                  Ref {car.ref}
                </span>
                <button type="button" className="chip">
                  <i className="fa-solid fa-share-nodes" />
                  Share this
                </button>
                {car.arrivalNote ? (
                  <span className="chip">
                    <i className="fa-regular fa-calendar" />
                    {car.arrivalNote}
                  </span>
                ) : null}
              </div>

              <p
                className="speak in"
                style={{ '--d': 1 } as React.CSSProperties}
                id="speak"
                role="status"
                aria-live="polite"
              />

              <div className="in" style={{ '--d': 2 } as React.CSSProperties}>
                <div className="gal" id="gal" tabIndex={0}>
                  <div className="rib" id="rib">
                    {special ? (
                      <span>Special</span>
                    ) : car.section === 'on order' ? (
                      <span className="oo">On order</span>
                    ) : car.section === 'landed' ? (
                      <span className="ld">Landed</span>
                    ) : null}
                  </div>
                  <Photo
                    id="gi"
                    src={cover}
                    srcSet={coverSrcSet}
                    sizes="(max-width: 1000px) calc(100vw - 48px), 832px"
                    alt={`${h1Title(car)} photo 1`}
                    boxRef={car.ref}
                    sized={{ width: 1200, height: 720 }}
                    fetchPriority="high"
                    decoding="async"
                  />
                  {/* No photos: the drawn box stands alone — nothing to count, step through or
                      thumbnail (DR5); the box itself is the car's own gradient (D7/E2). One photo
                      keeps its counter and loses the arrows. */}
                  {car.photos.length > 1 ? (
                    <>
                      <button type="button" className="gb l" aria-label="Previous photo">
                        <i className="fa-solid fa-chevron-left" />
                      </button>
                      <button type="button" className="gb r" aria-label="Next photo">
                        <i className="fa-solid fa-chevron-right" />
                      </button>
                    </>
                  ) : null}
                  {car.photos.length > 0 ? (
                    <div className="cn" id="cn">
                      <i className="fa-regular fa-image" /> 1 / {car.photos.length}
                    </div>
                  ) : null}
                </div>
                {car.photos.length > 0 ? (
                  <div className="thumbs" id="thumbs">
                    {car.photos.map((p, i) => (
                      <button
                        key={p + i}
                        type="button"
                        className={i === 0 ? 'on' : undefined}
                        aria-label={`Photo ${i + 1}`}
                        data-i={i}
                      >
                        <Photo
                          src={p}
                          alt={`${h1Title(car)} photo ${i + 1}`}
                          sized={{ width: 320, height: 180 }}
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="tabs rv" id="tabs" role="tablist" aria-label="Car information">
                <button type="button" role="tab" data-p="p1" aria-selected="true" className="on">
                  Overview
                </button>
                <button type="button" role="tab" data-p="p2" aria-selected="false">
                  Features
                </button>
                <button type="button" role="tab" data-p="p3" aria-selected="false">
                  Delivery
                </button>
                <span className="bar" id="bar" />
              </div>

              <div className="pn on rv" id="p1" role="tabpanel">
                <p className="lead">{lead}</p>
                {paragraphs.map((t) => (
                  <p key={t}>{t}</p>
                ))}
                <div className="quote">{note}</div>
                <p>
                  Message us on WhatsApp for more photos, a video walk-around or to ask anything
                  about this car.
                </p>
              </div>

              <div className="pn" id="p2" role="tabpanel">
                <ul className="fl">
                  {[...car.features, ...FEATURE_TAIL].map((f, i) => (
                    <li key={f} style={{ '--i': i } as React.CSSProperties}>
                      <i className="fa-solid fa-check" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pn" id="p3" role="tabpanel">
                <ol className="steps">
                  {DELIVERY_STEPS.map((s, i) => (
                    <li key={s.title}>
                      <span className="num">{i + 1}</span>
                      <div>
                        <b>{s.title}</b>
                        <span>{s.desc}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <aside className="aside in" style={{ '--d': 3 } as React.CSSProperties}>
              <div className="pc">
                <small>Doorstep price</small>
                <span className="num" id="pr">
                  {formatNaira(car.priceKobo)}
                </span>
                <div id="old">
                  {special && car.wasPriceKobo !== null ? (
                    <s>{formatNaira(car.wasPriceKobo)}</s>
                  ) : null}
                </div>
                <div className="inc">Shipping, clearing and delivery included.</div>
                <div className="sv" id="sv" hidden={!(special && car.wasPriceKobo !== null)}>
                  {special && car.wasPriceKobo !== null ? (
                    <>
                      Instant savings: <b>{formatNaira(car.wasPriceKobo - car.priceKobo)}</b>
                    </>
                  ) : null}
                </div>
              </div>
              <a
                className={waClass('wab big', !wa)}
                id="wa"
                href={wa ?? undefined}
                {...waOffProps(!wa)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa-brands fa-whatsapp fa-xl" />
                <span id="waTxt">
                  {car.section === 'on order' ? 'Reserve this car' : 'Chat on WhatsApp'}
                </span>
              </a>
              <a
                className={waClass('ofr', !offerLink)}
                id="of"
                href={offerLink ?? undefined}
                {...waOffProps(!offerLink)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Make an offer
                <i className="fa-solid fa-naira-sign" />
              </a>
              <a
                className={waClass('ofr', !viewingLink)}
                id="vw"
                href={viewingLink ?? undefined}
                {...waOffProps(!viewingLink)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book a viewing
                <i className="fa-regular fa-calendar-check" />
              </a>
              <div id="spec">
                <div>
                  <span>Brand</span>
                  <b>{car.brand ?? '—'}</b>
                </div>
                <div>
                  <span>Model</span>
                  <b>{car.model ?? '—'}</b>
                </div>
                <div>
                  <span>Trim</span>
                  <b>{car.trim ?? '—'}</b>
                </div>
                <div>
                  <span>Year</span>
                  <b>{car.year ?? '—'}</b>
                </div>
                <div>
                  <span>Mileage</span>
                  <b>{mileage(car)}</b>
                </div>
                <div>
                  <span>Exterior</span>
                  <b>{car.exteriorColor ?? '—'}</b>
                </div>
                <div>
                  <span>Interior</span>
                  <b>{car.interiorColor ?? '—'}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b>{sectionName}</b>
                </div>
              </div>
              <div className="trust">
                <p>
                  <i className="fa-solid fa-tags" /> One doorstep price, no extra fees
                </p>
                <p>
                  <i className="fa-solid fa-ship" /> Shipped from the USA
                </p>
                <p>
                  <i className="fa-solid fa-truck-fast" /> Delivered anywhere in Nigeria
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <section className="rel">
        <div className="w">
          <div className="rh rv">
            <h2 id="rt">{RELATED_H2[car.section] ?? 'More available cars'}</h2>
            <div className="rn">
              <button type="button" aria-label="Previous">
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button type="button" aria-label="Next">
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
          <div className="rt" id="rt2">
            {related.map((c) => (
              <a className="rc" href={carHref(c)} key={c.ref}>
                <div className="ph">
                  <Photo
                    src={c.photos[0]}
                    alt={cardTitle(c)}
                    loading="lazy"
                    decoding="async"
                    sized={{ width: 580, height: 320 }}
                  />
                </div>
                <div className="bd">
                  <h3>{cardTitle(c)}</h3>
                  <div className="pr">{formatNaira(c.priceKobo)}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="mbar" id="mbar">
        <div>
          <small>Doorstep price</small>
          <div className="num" id="mp">
            {formatNaira(car.priceKobo)}
          </div>
        </div>
        <a
          className={waClass('wab', !wa)}
          id="mw"
          href={wa ?? undefined}
          {...waOffProps(!wa)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fa-brands fa-whatsapp" />
          <span id="mwTxt">{car.section === 'on order' ? 'Reserve now' : 'Chat now'}</span>
        </a>
      </div>

      <div className="lb" id="lb">
        <button type="button" className="x" aria-label="Close">
          <i className="fa-solid fa-xmark" />
        </button>
        <button type="button" className="p" aria-label="Previous">
          <i className="fa-solid fa-chevron-left" />
        </button>
        <Photo id="li" alt={`${h1Title(car)} photo`} />
        <button type="button" className="n" aria-label="Next">
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>

      <div className="stoast" id="stoast" />

      <dialog className="ovl" id="ovl" aria-labelledby="mtitle">
        <div className="mdl">
          <button className="mx" id="mx" type="button" aria-label="Close">
            &times;
          </button>
          <div className="mdlh">
            <div className="av" aria-hidden="true">
              U
            </div>
            <h2 id="mtitle" />
          </div>
          <div id="mbody" />
        </div>
      </dialog>

      <div className="ptoast" id="ptoast" role="status" hidden>
        <span id="ptxt" />
        <button id="ptx" type="button" aria-label="Dismiss">
          &times;
        </button>
      </div>

      <CarBehaviors
        photos={car.photos}
        alt={h1Title(car)}
        wa={wa}
        viewing={viewingLink}
        name={[car.year, car.brand, car.model, car.trim].filter(Boolean).join(' ')}
        slug={slug}
        status={statusKey}
        was={
          special && car.wasPriceKobo !== null
            ? formatNaira(car.wasPriceKobo - car.priceKobo)
            : null
        }
        note={car.arrivalNote ?? ''}
      />
    </>
  );
}

function soldPageView(car: PublicCar, all: PublicCar[], num: string) {
  const name = [car.year, car.brand, car.model, car.trim].filter(Boolean).join(' ');
  const month = car.soldAt
    ? new Date(car.soldAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;
  const soldWa = waLink(
    num,
    `Hello TrueSpec, I saw the link to the ${name} — it's sold. I'm after something similar.`
  );
  const similar = all.filter((c) => c.section === 'available').slice(0, 4);
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <div className="w" id="crumb">
          <a href="/">Home</a>
          <i className="fa-solid fa-chevron-right" />
          <a href="/inventory">Inventory</a>
          <i className="fa-solid fa-chevron-right" />
          <b aria-current="page">Sold</b>
        </div>
      </nav>

      <main className="main" id="main">
        <div className="w nfbox">
          {car.photos[0] ? (
            <Photo
              src={car.photos[0]}
              alt={name}
              sized={{ width: 840, height: 525 }}
              fetchPriority="high"
              decoding="async"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: 420,
                height: 'auto',
                aspectRatio: '16 / 10',
                objectFit: 'cover',
                borderRadius: 12,
                border: '1px solid var(--line)',
                margin: '0 auto 26px',
              }}
            />
          ) : null}
          <div className="av" aria-hidden="true">
            U
          </div>
          <h1>That one found a new owner</h1>
          <p>
            {name} {month ? `went in ${month}` : 'is sold'}. Good car — it moved quickly.
            Here&apos;s what I can put you in instead:
          </p>
          <div className="row">
            <a
              className={waClass('wab big', !soldWa)}
              href={soldWa ?? undefined}
              {...waOffProps(!soldWa)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-brands fa-whatsapp fa-xl" /> Message Umar
            </a>
            <a className="btn" href="/inventory">
              <i className="fa-solid fa-grip" /> See the full inventory
            </a>
          </div>
        </div>
        {similar.length ? (
          <section className="rel">
            <div className="w">
              <div className="rh">
                <h2>On the lot right now</h2>
              </div>
              <p style={{ color: 'var(--mute)', fontSize: 14, margin: '-12px 0 18px' }}>
                Similar body, same one-price rule.
              </p>
              <div className="rt">
                {similar.map((c) => (
                  <a className="rc" href={carHref(c)} key={c.ref}>
                    <div className="ph">
                      <Photo
                        src={c.photos[0]}
                        alt={cardTitle(c)}
                        loading="lazy"
                        decoding="async"
                        sized={{ width: 580, height: 320 }}
                      />
                    </div>
                    <div className="bd">
                      <h3>{[c.brand, c.model, c.year].filter(Boolean).join(' ')}</h3>
                      <div className="pr">{formatNaira(c.priceKobo)}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div
            className="w"
            style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mute)' }}
          >
            Nothing quite like it on the lot right now — tell me what you were after and I&apos;ll
            find one.
          </div>
        )}
      </main>

      <RelatedShell />
      <CarLayers wa={soldWa} alt={`${name} photo`} />
    </>
  );
}
