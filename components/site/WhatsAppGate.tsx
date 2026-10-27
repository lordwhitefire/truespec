'use client';

import { useEffect, useRef, useState } from 'react';
import { carRefInPath } from '@/lib/tap-rules';

/**
 * The step between a buyer and WhatsApp (truth 8):
 *
 * > The privacy notice is shown on the way to WhatsApp, **before** the tap. The tap is recorded by the
 * > application and the buyer then continues to WhatsApp as before.
 *
 * It sits in the site's layout and catches **every** WhatsApp link on the showroom — the header, the
 * footer, the floating button, a car's own button and the mobile bar — because they are written in
 * half a dozen places, some of them built as markup by client-side behaviours. One listener at the
 * document covers them all, so a new WhatsApp button anywhere on the site is behind the notice the day
 * it is written, without anyone having to remember to wire it.
 *
 * **Once per visit.** The first plain tap shows the notice; after the buyer continues, later taps on
 * the same visit are recorded and go straight through. Showing the same notice before every tap would
 * be hostile, and the notice has been shown on the way to WhatsApp before every one of them.
 *
 * **The buyer is never blocked by our bookkeeping.** The record is a `keepalive` request that is not
 * awaited: if the store refuses it, the buyer still reaches WhatsApp and one tap is lost — which is the
 * honest failure, since the figure must not count a tap that did not happen. (A ctrl/cmd-click before
 * the notice has been shown is left entirely alone: hijacking a "open in a new tab" gesture to show a
 * dialog would be worse than missing that one tap.)
 *
 * A buyer with no JavaScript is not stopped either: the link is a real link and still goes to WhatsApp,
 * without the notice and without a record. That is the same trade the gallery and the lightbox already
 * make, and it is written down rather than hoped over.
 */

/** The one shape of a WhatsApp link on this site (`components/whatsapp.ts` builds them). */
const WA_LINK = /^https:\/\/wa\.me\//;

/**
 * Record the tap. Fire-and-forget on purpose: the buyer must never wait on it, and a failure must never
 * be shown to them. The page and the car's code are read here, at the moment of the tap.
 */
function recordTap(): void {
  try {
    const page = window.location.pathname;
    void fetch('/api/tap', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page, carRef: carRefInPath(page) }),
      keepalive: true,
    }).catch(() => {
      /* the record is never worth an error in the buyer's face */
    });
  } catch {
    /* ditto */
  }
}

export function WhatsAppGate() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [href, setHref] = useState<string | null>(null);
  /** Set once the buyer has continued through the notice on this visit. */
  const shown = useRef(false);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      const link = (event.target as Element | null)?.closest?.(
        'a[href]'
      ) as HTMLAnchorElement | null;
      if (!link) return;
      const target = link.getAttribute('href') ?? '';
      if (!WA_LINK.test(target)) return;

      const plain =
        event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

      if (shown.current || !plain) {
        // The notice has been shown on the way here: record and let the browser do what it always did.
        // Before it has been shown, a modified click is left alone rather than hijacked.
        if (shown.current) recordTap();
        return;
      }

      event.preventDefault();
      setHref(target);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // The dialog follows `href`: the notice is up while a link is waiting, and gone once it is answered.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (href !== null && !dialog.open) dialog.showModal();
    if (href === null && dialog.open) dialog.close();
  }, [href]);

  function continueToWhatsApp() {
    const target = href;
    shown.current = true;
    setHref(null);
    if (target === null) return;
    recordTap();
    // Opened in the buyer's own gesture, so a popup blocker does not stop it; if anything does, fall
    // back to a plain navigation rather than leaving them with nothing.
    const opened = window.open(target, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.assign(target);
  }

  return (
    <dialog
      ref={dialogRef}
      className="wagn"
      aria-labelledby="wagn-h"
      onCancel={() => setHref(null)}
      onClose={() => setHref(null)}
    >
      <h2 id="wagn-h">Before you go to WhatsApp</h2>
      <p>
        TrueSpec records three things when you tap through, so the office knows a car was asked
        about: <b>the page you tapped from</b>, <b>the car&rsquo;s code</b> (when you tap on a car)
        and <b>the time</b>. Nothing else — no name, no number, no message.
      </p>
      <p className="wagn-more">
        <a href="/privacy">Read the full privacy notice</a>
      </p>
      <div className="wagn-btns">
        <button type="button" className="wab" data-ts-network onClick={continueToWhatsApp}>
          <i className="fa-brands fa-whatsapp" />
          Continue to WhatsApp
        </button>
        <button type="button" className="wagn-cancel" onClick={() => setHref(null)}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
