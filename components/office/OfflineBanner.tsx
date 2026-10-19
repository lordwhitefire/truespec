"use client";

import { useEffect, useRef, useState } from "react";

const LINE = "Offline, your draft is kept on this device.";
const BANNER_ID = "ts-office-offline";
const SHOW_AFTER_MS = 1200;
const SAVE_CLASS = "ts-office-offline-save";
const SAVE_NAME = /^save\b/i;

type SavedAttributes = {
  tabIndex: string | null;
  ariaDisabled: string | null;
};

/**
 * The office's quiet offline line (Task 35).
 *
 * It is the visible reason the Save controls are disabled; it keeps the approved words
 * verbatim. It is conservative in the same way the showroom line is (Task 34): a browser offline
 * event or a real network TypeError starts a 1200 ms timer; a successful fetch or an online event
 * withdraws it at once — a blip never flashes a banner, a flaky connection never keeps a stale one.
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
  const offlineRef = useRef(false);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const savedSaves = useRef(new Map<HTMLButtonElement, SavedAttributes>());

  function isSaveButton(el: Element): el is HTMLButtonElement {
    if (!(el instanceof HTMLButtonElement)) return false;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const label = el.getAttribute("aria-label") ?? "";
    return SAVE_NAME.test(text) || SAVE_NAME.test(label);
  }

  function addReason(el: Element) {
    const current = el.getAttribute("aria-describedby");
    const tokens = (current ?? "").split(/\s+/).filter(Boolean);
    if (tokens.includes(BANNER_ID)) return;
    tokens.push(BANNER_ID);
    el.setAttribute("aria-describedby", tokens.join(" "));
  }

  function removeReason(el: Element) {
    const current = el.getAttribute("aria-describedby");
    if (!current) return;
    const tokens = current.split(/\s+/).filter(Boolean).filter((token) => token !== BANNER_ID);
    if (tokens.length > 0) el.setAttribute("aria-describedby", tokens.join(" "));
    else el.removeAttribute("aria-describedby");
  }

  function annotateSaves() {
    for (const el of document.querySelectorAll("button")) {
      if (!isSaveButton(el)) continue;
      if (!savedSaves.current.has(el)) {
        savedSaves.current.set(el, {
          tabIndex: el.getAttribute("tabindex"),
          ariaDisabled: el.getAttribute("aria-disabled"),
        });
      }
      if (el.getAttribute("aria-disabled") !== "true") el.setAttribute("aria-disabled", "true");
      if (el.getAttribute("tabindex") !== "-1") el.setAttribute("tabindex", "-1");
      el.classList.add(SAVE_CLASS);
      addReason(el);
    }
  }

  function restoreSaves() {
    for (const [el, saved] of savedSaves.current) {
      if (!el.isConnected) continue;
      if (saved.tabIndex === null) {
        if (el.hasAttribute("tabindex")) el.removeAttribute("tabindex");
      } else if (el.getAttribute("tabindex") !== saved.tabIndex) {
        el.setAttribute("tabindex", saved.tabIndex);
      }
      if (saved.ariaDisabled === null) {
        if (el.hasAttribute("aria-disabled")) el.removeAttribute("aria-disabled");
      } else if (el.getAttribute("aria-disabled") !== saved.ariaDisabled) {
        el.setAttribute("aria-disabled", saved.ariaDisabled);
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
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
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
      setOffline(false);
      return;
    }
    const timer = window.setTimeout(() => {
      offlineRef.current = true;
      setOffline(true);
    }, SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [online, fetchFailed]);

  useEffect(() => {
    offlineRef.current = offline;
    const root = document.documentElement;
    if (offline) {
      annotateSaves();
      root.setAttribute("data-ts-office-offline", "");
      const height = lineRef.current?.offsetHeight ?? 38;
      root.style.setProperty("--ts-office-offline-h", `${height}px`);
    } else {
      restoreSaves();
      root.removeAttribute("data-ts-office-offline");
      root.style.removeProperty("--ts-office-offline-h");
    }
  }, [offline]);

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
      const button = target.closest("button");
      if (button && isSaveButton(button)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if ([...form.querySelectorAll("button")].some(isSaveButton)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [offline]);

  useEffect(() => {
    return () => {
      restoreSaves();
      document.documentElement.removeAttribute("data-ts-office-offline");
      document.documentElement.style.removeProperty("--ts-office-offline-h");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
#${BANNER_ID}{position:sticky;top:0;z-index:45;box-sizing:border-box;min-height:38px;display:flex;
  align-items:center;justify-content:center;padding:4px 16px;background:var(--lt);color:var(--ink);
  border-bottom:1px solid var(--line);font-size:13px;font-weight:500;line-height:1.3;text-align:center}
#${BANNER_ID}[hidden]{display:none!important}
html[data-ts-office-offline] .side{top:var(--ts-office-offline-h,38px);
  height:calc(100vh - var(--ts-office-offline-h,38px))}
html[data-ts-office-offline] .topbar{top:var(--ts-office-offline-h,38px)}
.${SAVE_CLASS}{filter:grayscale(1);opacity:.55;cursor:not-allowed!important;transform:none!important;
  box-shadow:none!important}
`}</style>
      <div
        id={BANNER_ID}
        ref={lineRef}
        className="ts-office-offline-line"
        role="status"
        aria-live="polite"
        hidden={!offline}
      >
        {offline ? LINE : null}
      </div>
    </>
  );
}
