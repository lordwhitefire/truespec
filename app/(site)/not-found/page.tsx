import { notFound } from 'next/navigation';

/**
 * `/not-found` is not a public page. It must answer a real 404, not a soft 200; the site segment's
 * `not-found.tsx` boundary renders the view.
 */
export default function NotFoundPage(): never {
  notFound();
}
