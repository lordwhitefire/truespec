import "./not-found.css";
import "../../reference.css";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="nfbox">
      <div className="av" aria-hidden="true">
        U
      </div>
      <h1>We couldn't find that page</h1>
      <p>
        The link may be old, or the address mistyped. The showroom is still open — every car, one
        doorstep price, delivered anywhere in Nigeria.
      </p>
      <div className="row">
        <Link className="btn" href="/inventory">
          <i className="fa-solid fa-grip" />
          Browse the inventory
        </Link>
        <a
          className="wab big"
          target="_blank"
          rel="noopener noreferrer"
          href="https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20was%20looking%20for%20a%20car%20on%20your%20site."
        >
          <i className="fa-brands fa-whatsapp fa-xl" />
          Message Umar
        </a>
      </div>
      <p className="small">
        Or head back to the <Link href="/">home page</Link>.
      </p>
    </div>
  );
}
