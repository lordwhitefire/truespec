'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The showroom's offline line (truth 36, Task 34).
 *
 * The showroom does not work offline: the store is read per request and nothing is cached. When the
 * network goes, the approved quiet line appears and every action that would need the network is
 * disabled in place with that line as its attached reason. Nothing is queued and nothing is kept:
 * there is no outbox and no cached showroom.
 *
 * The line is conservative. `navigator.onLine` is a link-presence hint, not reachability, so it is
 * paired with a real fetch failure (a network `TypeError`). Either signal can raise the line; a
 * successful fetch or the browser's `online` event withdraws it. It appears after a short delay (so
 * a blip does not flash a line) and withdraws at once.
 *
 * Wording is the owner-approved copy; it is not edited. The line is the reason for every disabled
 * action (`aria-describedby`), not a tooltip.
 */

const OFFLINE_LINE = 'You are offline. Reload to see the site.';
const NOTICE_ID = 'ts-offline-notice';
/** Slow to appear: a blip must not flash the line. The browser's `online` event withdraws at once. */
const SHOW_DELAY_MS = 1200;

type SavedState = {
  tabIndex: string | null;
  ariaDisabled: string | null;
  describedBy: string | null;
  disabled: boolean | null;
};

/**
 * True when following this element would need the network. A same-page hash link only scrolls;
 * everything else (a page, an external destination, a WhatsApp link) is a request. The WhatsApp
 * gate's Continue is marked explicitly because it is a button, not a link.
 */
function needsNetwork(el: Element): boolean {
  if (el.matches('[data-ts-network]')) return true;
  if (!(el instanceof HTMLAnchorElement)) return false;

  const raw = el.getAttribute('href');
  if (!raw) return false;
  if (
    raw.startsWith('#') ||
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    raw.startsWith('javascript:')
  ) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(el.href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return true;

  // Only a hash on the page already loaded is free. A same-URL navigation (the logo on the home
  // page) still sits on the server and needs the network.
  const samePage =
    url.pathname === window.location.pathname && url.search === window.location.search;
  return !(samePage && url.hash);
}

export function OfflineNotice() {
  const [online, setOnline] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const offlineRef = useRef(false);

  // The browser's own signal. `online` also clears a reachability failure: the next request is the
  // one that can prove the store is back.
  useEffect(() => {
    setOnline(window.navigator.onLine);
    const goOnline = () => {
      setOnline(true);
      setFailed(false);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // A real network failure while the browser still claims to be online. The wrapper only observes;
  // it rethrows unchanged, so nothing about the fetch's behaviour is altered.
  useEffect(() => {
    const original = window.fetch;
    if (typeof original !== 'function') return;
    const wrapped = (async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await original(...args);
        setFailed(false);
        return response;
      } catch (error) {
        if (error instanceof TypeError) setFailed(true);
        throw error;
      }
    }) as typeof fetch;
    window.fetch = wrapped;
    return () => {
      if (window.fetch === wrapped) window.fetch = original;
    };
  }, []);

  // Slow to appear, quick to withdraw. The ref is set with the state so a click is blocked from the
  // instant the line is due, not one render later.
  useEffect(() => {
    if (online && !failed) {
      offlineRef.current = false;
      setOffline(false);
      return;
    }
    const timer = window.setTimeout(() => {
      offlineRef.current = true;
      setOffline(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [online, failed]);

  // Let the sticky line and the sticky nav share the top of the page.
  useEffect(() => {
    const root = document.documentElement;
    if (offline) root.setAttribute('data-ts-offline', '');
    else root.removeAttribute('data-ts-offline');
    return () => root.removeAttribute('data-ts-offline');
  }, [offline]);

  // Disable what needs the network, with the line as the reason. The annotations are removed when
  // the line withdraws; the click guard below also checks the destination itself, so a React
  // re-render that drops an attribute cannot quietly make a link live again.
  useEffect(() => {
    if (!offline) return;

    const marked = new Set<HTMLElement>();
    const saved = new Map<HTMLElement, SavedState>();

    function annotate() {
      const candidates = document.querySelectorAll<HTMLElement>('a[href], [data-ts-network]');
      for (const el of candidates) {
        if (marked.has(el) || !needsNetwork(el)) continue;
        saved.set(el, {
          tabIndex: el.getAttribute('tabindex'),
          ariaDisabled: el.getAttribute('aria-disabled'),
          describedBy: el.getAttribute('aria-describedby'),
          disabled: el instanceof HTMLButtonElement ? el.disabled : null,
        });
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('tabindex', '-1');
        const describedBy = el.getAttribute('aria-describedby');
        el.setAttribute(
          'aria-describedby',
          describedBy ? `${describedBy} ${NOTICE_ID}` : NOTICE_ID
        );
        if (el instanceof HTMLButtonElement) el.disabled = true;
        el.classList.add('ts-offline-action');
        el.setAttribute('data-ts-offline', '');
        marked.add(el);
      }
    }

    function restore() {
      for (const el of marked) {
        const previous = saved.get(el);
        if (!previous) continue;
        el.classList.remove('ts-offline-action');
        el.removeAttribute('data-ts-offline');
        if (previous.tabIndex === null) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', previous.tabIndex);
        if (previous.ariaDisabled === null) el.removeAttribute('aria-disabled');
        else el.setAttribute('aria-disabled', previous.ariaDisabled);
        if (previous.describedBy === null) el.removeAttribute('aria-describedby');
        else el.setAttribute('aria-describedby', previous.describedBy);
        if (el instanceof HTMLButtonElement && previous.disabled !== null) {
          el.disabled = previous.disabled;
        }
      }
      marked.clear();
      saved.clear();
    }

    annotate();

    // A gate already open is a network surface; close it so the line (the reason) is what the
    // person sees, rather than a greyed Continue behind a modal.
    const gate = document.querySelector<HTMLDialogElement>('dialog.wagn[open]');
    if (gate) gate.close();

    // The showroom also builds controls after mount (client-side behaviour markup); catch those.
    const observer = new MutationObserver(annotate);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      restore();
    };
  }, [offline]);

  // Capture every activation of a network destination while offline. `defaultPrevented` is also
  // what the WhatsApp gate checks, so its own listener stands down and no notice opens.
  useEffect(() => {
    function block(event: MouseEvent) {
      if (!offlineRef.current) return;
      const target = event.target instanceof Element ? event.target : null;
      const action = target?.closest<HTMLElement>('a[href], [data-ts-network]');
      if (!action || !needsNetwork(action)) return;
      event.preventDefault();
      event.stopPropagation();
    }
    document.addEventListener('click', block, true);
    document.addEventListener('auxclick', block, true);
    return () => {
      document.removeEventListener('click', block, true);
      document.removeEventListener('auxclick', block, true);
    };
  }, []);

  return (
    <div
      id={NOTICE_ID}
      className="ts-offline-line"
      role="status"
      aria-live="polite"
      hidden={!offline}
    >
      {offline ? OFFLINE_LINE : null}
    </div>
  );
}
