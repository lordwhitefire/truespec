import Link from 'next/link';
import './office.css';

/* The office's own not-found — design I28, words from the approved copy sheet.
 *
 * It renders **inside the office shell**: the shell's layout is above this boundary, so the
 * sidebar, the topbar and the signed-in identity are all present and only the content area is
 * this. Reached by `notFound()` from any office page — today the car editor on a ref with no row.
 * Gold + icon + words, never colour alone; one way out, the dashboard.
 */
export default function NotFound() {
  return (
    <div className="nfx">
      <div className="nfi" aria-hidden="true">
        <i className="fa-solid fa-compass" />
      </div>
      <h1>That page isn&apos;t in the office</h1>
      <p>No office screen matches that address. Nothing was lost.</p>
      <Link className="btn" href="/office">
        <i className="fa-solid fa-gauge-high" />
        Back to the dashboard
      </Link>
    </div>
  );
}
