import './not-found.css';
import '../../reference.css';
import Link from 'next/link';
import { getSetting } from '@/lib/public-cars';
import { waClass, waLink, waOffProps } from '@/components/whatsapp';

const WA_MESSAGE = 'Hello TrueSpec, I was looking for a car on your site.';

export default async function NotFound() {
  // The page sits under the site layout's `force-dynamic`; the number is read per request so the
  // 404 can never show a number the owner has since removed.
  const num = (await getSetting('whatsapp_number')) ?? '';
  const wa = waLink(num, WA_MESSAGE);

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
          className={waClass('wab big', !wa)}
          target="_blank"
          rel="noopener noreferrer"
          href={wa ?? undefined}
          {...waOffProps(!wa)}
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
