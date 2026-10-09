import { HeroSlider } from "@/components/site/HeroSlider";
import { FeaturedSlider } from "@/components/site/FeaturedSlider";
import { HomeInventory } from "@/components/site/HomeInventory";
import { HomeBehaviors } from "@/components/site/HomeBehaviors";
import { waLink } from "@/components/whatsapp";
import { getPublicCars, getSetting } from "@/lib/public-cars";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [cars, number] = await Promise.all([getPublicCars(), getSetting("whatsapp_number")]);
  const num = number ?? "";

  const available = cars.filter((c) => c.section === "available");
  const heroCars = [...available].sort((a, b) => b.priceKobo - a.priceKobo).slice(0, 3);
  const wa = waLink(num, "Hello TrueSpec, I have a question.");

  return (
    <>
      <div className="sv">
        <HeroSlider cars={heroCars} />

        {/* Umar's one question, inline after the hero. First visit until answered/skipped. */}
        <section className="ask" id="ask" hidden>
          <div className="w askw">
            <div className="av" aria-hidden="true">
              U
            </div>
            <div>
              <h2 className="askt">What are you after?</h2>
              <p className="asks">Umar here — I own the place. One tap and I&rsquo;ll shorten the list for you, or skip it.</p>
              <div className="aska">
                <button type="button" data-a="suv">
                  A family SUV
                </button>
                <button type="button" data-a="sedan">
                  A saloon
                </button>
                <button type="button" data-a="other">
                  Something I haven&rsquo;t listed yet
                </button>
                <button type="button" className="sk" data-a="skip">
                  Skip
                </button>
              </div>
            </div>
          </div>
        </section>

        <HomeInventory cars={cars} number={num} />

        <div className="boxes">
          <div className="w">
            <div className="bx g">
              <i className="fa-solid fa-magnifying-glass" />
              <div>
                <h3>Are you looking for a car?</h3>
                <p>
                  Our cars are delivered fully cleared with all requirements completed. We deliver your car wherever you are
                  in Nigeria.
                </p>
              </div>
            </div>
            <div className="bx w2">
              <i className="fa-brands fa-whatsapp" />
              <div>
                <h3>Want a car you cannot see here?</h3>
                <p>
                  Tell us the make, model and year. We source it in the USA, ship it and clear it for you. Send us a message
                  to start.
                </p>
              </div>
            </div>
          </div>
        </div>

        <FeaturedSlider cars={available} />

        <div className="why">
          <div className="w">
            <div className="st">
              <h2>Why choose us</h2>
            </div>
            <div className="f4">
              <div className="fi">
                <i className="fa-solid fa-tags" />
                <div>
                  <h3>One doorstep price</h3>
                  <p>Shipping, clearing and delivery are already included in every price.</p>
                </div>
              </div>
              <div className="fi">
                <i className="fa-solid fa-ship" />
                <div>
                  <h3>Shipped from the USA</h3>
                  <p>We buy, ship and clear your car so you never deal with the port.</p>
                </div>
              </div>
              <div className="fi">
                <i className="fa-solid fa-car-on" />
                <div>
                  <h3>Wide range of brands</h3>
                  <p>Toyota, Lexus, Mercedes-Benz, BMW and more, all imported fresh.</p>
                </div>
              </div>
              <div className="fi">
                <i className="fa-regular fa-comments" />
                <div>
                  <h3>Talk to us directly</h3>
                  <p>Message us on WhatsApp about any car and get a reply from the owner.</p>
                </div>
              </div>
            </div>
            <div className="more">
              <a className="btn" target="_blank" rel="noopener noreferrer" href={wa}>
                <i className="fa-brands fa-whatsapp" />
                Chat with us
              </a>
            </div>
          </div>
        </div>

        <div className="ab">
          <div className="w">
            <div className="abx">
              <h2>
                Vehicle imports
                <br />
                done right
              </h2>
              <p>
                TrueSpec Automotive brings quality vehicles from the USA to Nigeria. Every car you see here is either in stock,
                on its way, or landed this year. Choose a car, message us on WhatsApp and we handle the shipping and clearing
                until it reaches your door.
              </p>
            </div>
          </div>
        </div>
      </div>

      <HomeBehaviors all={cars} number={num} />
    </>
  );
}
