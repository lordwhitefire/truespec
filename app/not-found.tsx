import "./globals.css";
import "./reference.css";

export default function NotFound() {
  return (
    <div className="wrap">
      <section className="hero">
        <h1>This car is no longer available.</h1>
        <p>
          It may have been sold or removed. Browse what is available now — the links
          below always show current stock.
        </p>
        <div className="cta">
          <a className="btn btn-gold" href="/inventory">
            Browse inventory
          </a>
          <a className="btn" href="/">
            Back to home
          </a>
        </div>
      </section>
    </div>
  );
}
