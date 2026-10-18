import { Photo } from "@/components/Photo";
import { waLink } from "@/components/whatsapp";

/* The car page's furniture that more than one render shares.
 *
 * `RelatedShell` and `CarLayers` end both the sold view and the not-found view; `NotFoundView` is
 * the not-found view itself. They live here — not in `page.tsx` — because a **not-found boundary**
 * renders the same view when the page throws `notFound()`, and a boundary can import from a module
 * but not from the page that threw. One copy, two callers; the words, the ids and the markup are
 * unchanged from what the page rendered inline.
 */

export function RelatedShell() {
  return (
    <section className="rel">
      <div className="w">
        <div className="rh rv">
          <h2 id="rt">More cars</h2>
          <div className="rn">
            <button type="button" aria-label="Previous">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button type="button" aria-label="Next">
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
        <div className="rt" id="rt2" />
      </div>
    </section>
  );
}

export function CarLayers({ wa }: { wa: string }) {
  return (
    <>
      <div className="mbar" id="mbar">
        <div>
          <small>Doorstep price</small>
          <div className="num" id="mp" />
        </div>
        <a className="wab" id="mw" href={wa} target="_blank" rel="noopener noreferrer">
          <i className="fa-brands fa-whatsapp" />
          <span id="mwTxt">Chat now</span>
        </a>
      </div>

      <div className="lb" id="lb">
        <button type="button" className="x" aria-label="Close">
          <i className="fa-solid fa-xmark" />
        </button>
        <button type="button" className="p" aria-label="Previous">
          <i className="fa-solid fa-chevron-left" />
        </button>
        <Photo id="li" alt="" />
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
    </>
  );
}

export function NotFoundView({ num }: { num: string }) {
  const waSource = waLink(
    num,
    "Hello TrueSpec, the car I'm after isn't on your site. Make/Model/Year: ",
  );
  return (
    <>
      <div className="crumbs">
        <div className="w" id="crumb">
          <a href="/">Home</a>
          <i className="fa-solid fa-chevron-right" />
          <b>Not found</b>
        </div>
      </div>

      <div className="main" id="main">
      <div className="w nfbox">
        <div className="av" aria-hidden="true">
          U
        </div>
        <h1>We could not find that car</h1>
        <p>
          That car may have sold, or the link is old. Tell me what you were after and I&apos;ll
          find one like it — or browse what&apos;s on the lot now.
        </p>
        <div className="row">
          <a className="wab big" href={waSource} target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-whatsapp fa-xl" /> Message Umar
          </a>
          <a className="btn" href="/#cars">
            <i className="fa-solid fa-grip" /> See all cars
          </a>
        </div>
      </div>
      </div>

      <RelatedShell />
      <CarLayers wa={waSource} />
    </>
  );
}
