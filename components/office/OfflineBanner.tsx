'use client';

import { useEffect, useRef, useState } from 'react';

const LINE = 'Offline, your draft is kept on this device.';
const RECOVERY_LINE = "You're back online. Your draft is still here — press Save.";
const BANNER_ID = 'ts-office-offline';
const OFFLINE_MARKER = 'data-ts-office-offline';
const RECOVERED_MARKER = 'data-ts-office-recovered';
const DRAFT_MARKER = 'data-ts-office-draft';
const PRESENCE_EVENT = 'ts-office-draft-presence';
const SHOW_AFTER_MS = 1200;
const SAVE_CLASS = 'ts-office-offline-save';
const SAVE_NAME = /^save\b/i;

type SavedAttributes = {
  tabIndex: string | null;
  ariaDisabled: string | null;
};

/**
 * The office's quiet offline line (Task 35) and the recovery line (Task 37).
 *
 * It is the visible reason the Save controls are disabled; it keeps the approved words
 * verbatim. It is conservative in the same way the showroom line is (Task 34): a browser offline
 * event or a real network TypeError starts a 1200 ms timer; a successful fetch or an online event
 * withdraws it at once — a blip never flashes a banner, a flaky connection never keeps a stale one.
 *
 * When a line that actually showed withdraws, and the page has told us a draft is present (the
 * `data-ts-office-draft` marker), the same banner becomes the approved recovery line: “You're back
 * online. Your draft is still here — press Save.” It stays until the draft is saved or discarded
 * (the form sends `ts-office-draft-presence` false), or the person leaves that form. It never
 * queues or sends anything; the person still presses Save.
 *
 * Every Save control is found in the DOM, marked `aria-disabled`, removed from the tab order, and
 * given the banner as its `aria-describedby` reason. A document-level capture guard refuses the
 * activation (including an Enter-submitted car form), so a Save can never post while offline. The
 * button's own disabled prop keeps doing its usual job; the banner does not overwrite it, so React
 * still owns that state and the reconnect restores exactly what the page would have shown.
 *
 * The banner and its styles live here, not in `office.css`: each office page loads its own
 * self-contained stylesheet (the shell never imports one), so a rule in `office.css` would not
 * reach the car, settings, drafts or inventory pages.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const offlineRef = useRef(false);
  const wasShownRef = useRef(false);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const savedSaves = useRef(new Map<HTMLButtonElement, SavedAttributes>());

  function isSaveButton(el: Element): el is HTMLButtonElement {
    if (!(el instanceof HTMLButtonElement)) return false;
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    const label = el.getAttribute('aria-label') ?? '';
    return SAVE_NAME.test(text) || SAVE_NAME.test(label);
  }

  function addReason(el: Element) {
    const current = el.getAttribute('aria-describedby');
    const tokens = (current ?? '').split(/\s+/).filter(Boolean);
    if (tokens.includes(BANNER_ID)) return;
    tokens.push(BANNER_ID);
    el.setAttribute('aria-describedby', tokens.join(' '));
  }

  function removeReason(el: Element) {
    const current = el.getAttribute('aria-describedby');
    if (!current) return;
    const tokens = current
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => token !== BANNER_ID);
    if (tokens.length > 0) el.setAttribute('aria-describedby', tokens.join(' '));
    else el.removeAttribute('aria-describedby');
  }

  function annotateSaves() {
    for (const el of document.querySelectorAll('button')) {
      if (!isSaveButton(el)) continue;
      if (!savedSaves.current.has(el)) {
        savedSaves.current.set(el, {
          tabIndex: el.getAttribute('tabindex'),
          ariaDisabled: el.getAttribute('aria-disabled'),
        });
      }
      if (el.getAttribute('aria-disabled') !== 'true') el.setAttribute('aria-disabled', 'true');
      if (el.getAttribute('tabindex') !== '-1') el.setAttribute('tabindex', '-1');
      el.classList.add(SAVE_CLASS);
      addReason(el);
    }
  }

  function restoreSaves() {
    for (const [el, saved] of savedSaves.current) {
      if (!el.isConnected) continue;
      if (saved.tabIndex === null) {
        if (el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
      } else if (el.getAttribute('tabindex') !== saved.tabIndex) {
        el.setAttribute('tabindex', saved.tabIndex);
      }
      if (saved.ariaDisabled === null) {
        if (el.hasAttribute('aria-disabled')) el.removeAttribute('aria-disabled');
      } else if (el.getAttribute('aria-disabled') !== saved.ariaDisabled) {
        el.setAttribute('aria-disabled', saved.ariaDisabled);
      }
      el.classList.remove(SAVE_CLASS);
      removeReason(el);
    }
    savedSaves.current.clear();
  }

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    const onOnline = () => {
      setFetchFailed(false);
      setOnline(true);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // navigator.onLine is a link-presence hint, not reachability. A real network failure counts too;
  // a successful response clears that signal. The wrapper only observes and rethrows.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        setFetchFailed(false);
        return response;
      } catch (error) {
        if (error instanceof TypeError) setFetchFailed(true);
        throw error;
      }
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (online && !fetchFailed) {
      offlineRef.current = false;
      const wasShown = wasShownRef.current;
      wasShownRef.current = false;
      setOffline(false);
      if (wasShown && document.documentElement.hasAttribute(DRAFT_MARKER)) setRecovered(true);
      return;
    }
    setRecovered(false);
    const timer = window.setTimeout(() => {
      offlineRef.current = true;
      wasShownRef.current = true;
      setOffline(true);
    }, SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [online, fetchFailed]);

  // A form says when its draft is in the page. The recovery line is only true when that marker is
  // present; a save/discard sends false and takes the line down at once.
  useEffect(() => {
    const onPresence = (event: Event) => {
      const present = (event as CustomEvent<{ present?: boolean }>).detail?.present;
      if (!present) setRecovered(false);
    };
    window.addEventListener(PRESENCE_EVENT, onPresence);
    return () => window.removeEventListener(PRESENCE_EVENT, onPresence);
  }, []);

  useEffect(() => {
    offlineRef.current = offline;
    const root = document.documentElement;
    if (offline) annotateSaves();
    else restoreSaves();
    if (offline) root.setAttribute(OFFLINE_MARKER, '');
    else root.removeAttribute(OFFLINE_MARKER);
    if (recovered && !offline) root.setAttribute(RECOVERED_MARKER, '');
    else root.removeAttribute(RECOVERED_MARKER);
    if (offline || recovered) {
      const height = lineRef.current?.offsetHeight ?? 38;
      root.style.setProperty('--ts-office-offline-h', `${height}px`);
    } else {
      root.style.removeProperty('--ts-office-offline-h');
    }
  }, [offline, recovered]);

  // Controls built after the first pass (a settings tab, a dialog) must be caught too. Watch only
  // additions/removals — never the attributes this component writes itself, or annotating a button
  // would feed its own observer. React owns each button's disabled prop; it is not mirrored here.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (offlineRef.current) annotateSaves();
      else if (savedSaves.current.size > 0) restoreSaves();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!offline) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (button && isSaveButton(button)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if ([...form.querySelectorAll('button')].some(isSaveButton)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [offline]);

  useEffect(() => {
    return () => {
      restoreSaves();
      document.documentElement.removeAttribute(OFFLINE_MARKER);
      document.documentElement.removeAttribute(RECOVERED_MARKER);
      document.documentElement.style.removeProperty('--ts-office-offline-h');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const line = offline ? LINE : recovered ? RECOVERY_LINE : null;

  return (
    <>
      <style>{`
#${BANNER_ID}{position:sticky;top:0;z-index:45;box-sizing:border-box;min-height:38px;display:flex;
  align-items:center;justify-content:center;padding:4px 16px;background:var(--lt);color:var(--ink);
  border-bottom:1px solid var(--line);font-size:13px;font-weight:500;line-height:1.3;text-align:center}
#${BANNER_ID}[hidden]{display:none!important}
html[${OFFLINE_MARKER}] .side,html[${RECOVERED_MARKER}] .side{top:var(--ts-office-offline-h,38px);
  height:calc(100vh - var(--ts-office-offline-h,38px))}
html[${OFFLINE_MARKER}] .topbar,html[${RECOVERED_MARKER}] .topbar{top:var(--ts-office-offline-h,38px)}
.${SAVE_CLASS}{filter:grayscale(1);opacity:.55;cursor:not-allowed!important;transform:none!important;
  box-shadow:none!important}
`}</style>
      <div
        id={BANNER_ID}
        ref={lineRef}
        className="ts-office-offline-line"
        role="status"
        aria-live="polite"
        hidden={line === null}
      >
        {line}
      </div>
    </>
  );
}
