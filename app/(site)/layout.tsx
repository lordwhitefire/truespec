import "../globals.css";
import "../reference.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Ticker } from "@/components/site/Ticker";
import { SiteFab } from "@/components/site/SiteFab";
import { getPublicCars, getSetting } from "@/lib/public-cars";
import { isSpecial, type PublicCar } from "@/lib/serialize";
import { formatNaira } from "@/lib/money";
import { waLink } from "@/components/whatsapp";

// The site chrome reads the store — the ticker, the gallery, the WhatsApp number — so every page
// under this layout renders per request, never from a build-time snapshot. (The three data-heavy
// public pages declare this themselves as well; this is the declaration the two client pages,
// /privacy and /not-found, cannot make for themselves.)
export const dynamic = "force-dynamic";

// Public-area fonts — matches the reference car page, which loads Oswald 600;700
// (no 400/500) plus Inter 400;500;600. Text requesting weight 400/500 therefore
// resolves through Chrome's font-weight substitution exactly as the reference does.
const fonts = (
  <link
    href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
);

function carTitle(c: PublicCar): string {
  return [c.year, c.brand, c.model, c.trim].filter(Boolean).join(" ");
}

// The ticker's news lines (reference tickerLines), computed from live data.
function buildTicker(cars: PublicCar[]): string[] {
  const landed = cars.find((c) => c.section === "landed");
  const onOrder = cars.find((c) => c.section === "on order");
  const drops = cars
    .filter(isSpecial)
    .sort((a, b) => (b.wasPriceKobo ?? 0) - b.priceKobo - ((a.wasPriceKobo ?? 0) - a.priceKobo));
  const drop = drops[0];
  const out: string[] = [];
  if (landed) out.push(`New on the lot: ${carTitle(landed)} — landed this year`);
  if (onOrder) out.push(`Next to land: ${carTitle(onOrder)} — ${onOrder.arrivalNote ?? "expected soon"}`);
  if (drop) {
    out.push(
      `Biggest drop: ${carTitle(drop)} — was ${formatNaira(drop.wasPriceKobo ?? 0)}, now ${formatNaira(drop.priceKobo)}`,
    );
  }
  out.push("One doorstep price — shipping, clearing and delivery included.");
  out.push("Shipped from the USA, delivered anywhere in Nigeria.");
  return out.slice(0, 4);
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [number, cars] = await Promise.all([getSetting("whatsapp_number"), getPublicCars()]);
  const num = number ?? "";
  const wa = (text: string) => waLink(num, text);
  const gallery = cars
    .filter((c) => c.section === "available")
    .slice(0, 4)
    .map((c) => c.photos[0])
    .filter(Boolean);
  const ticker = buildTicker(cars);

  return (
    <>
      {fonts}
      <div id="site-header">
        <div className="top" id="top">
          <div className="w">
            <a href="/" className="lg">
              <i className="fa-solid fa-gauge-high" />
              TrueSpec
            </a>
            <div className="inf hide">
              <i className="fa-solid fa-location-dot" />
              <div>
                Imported from the USA
                <br />
                Delivered anywhere in Nigeria
                <small style={{ marginTop: 2 }}>Visits by appointment</small>
              </div>
            </div>
            <div className="inf">
              <i className="fa-brands fa-whatsapp" />
              <div>
                <small>WhatsApp</small>
                <b>{num || "+234 800 000 0000"}</b>
              </div>
            </div>
            <div className="inf hide">
              <div>
                <small>Chat hours</small>
                <b style={{ fontSize: 16 }}>Mon - Sat, 9AM - 6PM</b>
              </div>
            </div>
            <a className="soc" href="#" aria-label="Instagram">
              <i className="fa-brands fa-instagram" />
            </a>
          </div>
        </div>

        <div className="nav">
          <div className="w">
            <Ticker lines={ticker} />
            <ThemeToggle />
            <a
              className="wab"
              href={wa("Hello TrueSpec, I have a question.")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-brands fa-whatsapp" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {children}

      <div id="site-footer">
        <footer id="contact">
          <div className="w">
            <div className="fg">
              <div>
                <h4>
                  <em>TrueSpec</em> Automotive
                </h4>
                <p>We import and deliver quality vehicles from the USA. One honest doorstep price on every car.</p>
              </div>
              <div>
                <h4>Photo gallery</h4>
                <div className="gl" id="gl">
                  {gallery.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" loading="lazy" />
                  ))}
                </div>
              </div>
              <div>
                <h4>How buying works</h4>
                <ul>
                  <li>
                    <b>1.</b> Pick a car or ask for one
                  </li>
                  <li>
                    <b>2.</b> Chat with us on WhatsApp
                  </li>
                  <li>
                    <b>3.</b> We ship, clear and deliver
                  </li>
                </ul>
              </div>
              <div>
                <h4>Social network</h4>
                <div className="sq">
                  <a href="#" aria-label="Instagram">
                    <i className="fa-brands fa-instagram" />
                  </a>
                  <a
                    href={wa("Hello TrueSpec, I have a question.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                  >
                    <i className="fa-brands fa-whatsapp" />
                  </a>
                  <a href="#" aria-label="Facebook">
                    <i className="fa-brands fa-facebook-f" />
                  </a>
                  <a href="#" aria-label="YouTube">
                    <i className="fa-brands fa-youtube" />
                  </a>
                </div>
              </div>
            </div>
            <div className="fg" style={{ border: 0, margin: 0, paddingBottom: 30 }}>
              <div>
                <h4>Chat with us</h4>
                <a
                  className="wab big"
                  href={wa("Hello TrueSpec, I have a question.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fa-brands fa-whatsapp" />
                  WhatsApp us
                </a>
              </div>
              <div>
                <h4>Chat hours</h4>
                <p>
                  <b style={{ color: "#fff" }}>Mon - Fri:</b> 09:00AM - 06:00PM
                  <br />
                  <b style={{ color: "#fff" }}>Saturday:</b> 10:00AM - 04:00PM
                  <br />
                  <b style={{ color: "#fff" }}>Sunday:</b> Closed
                </p>
              </div>
              <div>
                <h4>Viewing</h4>
                <p>Cars can be viewed by appointment once they have landed. Message us to book a time.</p>
              </div>
              <div>
                <h4>Delivery</h4>
                <p>We deliver to your door anywhere in Nigeria. Delivery is included in the price.</p>
              </div>
            </div>
            <div className="cp">
              <span>&copy; {new Date().getFullYear()} TrueSpec Automotive. All rights reserved.</span>
              <span>
                <a href="/privacy">Privacy notice</a> · Imported from the USA
              </span>
            </div>
          </div>
        </footer>
      </div>

      <SiteFab href={wa("Hello TrueSpec, I have a question.")} />
    </>
  );
}
