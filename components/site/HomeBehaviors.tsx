"use client";

import { useEffect } from "react";
import { countStock } from "@/lib/counts";
import { inAvailablePresentation } from "@/lib/sections";
import type { PublicCar } from "@/lib/serialize";
import { waLink } from "@/components/whatsapp";
import { carHref, carTitle } from "./car-view";
import { speak } from "./speak";
import { store } from "./store";

// The reference visitor behaviours for the home screen: first-visit welcome,
// the return bar, the ask panel answers, the farewell exit intent, the social
// proof toast and "last car opened". Renders the shared modal + toast slots.
const SAY = {
  askT: "What are you after?",
  askS: "Umar here — I own the place. One tap and I'll shorten the list for you, or skip it.",
  okOther:
    "Tell me the make, model and year and I'll source it in the USA — one doorstep price, delivered to you.",
  skipMsg: "No problem — the full showroom is below. Message me any time.",
  reopen: "Ask me again",
  welcomeBack: "Good to see you back",
  landedSince: (n: number) => `${n} cars landed since you last looked`,
  newSince: (n: number) => `${n} new cars since your last visit`,
  stillThinking: (t: string) => `Still thinking about the ${t}?`,
  openIt: "Open it",
  seeNew: "See what's new",
  farewellT: "Before you go",
  farewellS: "Tell me the car you're after and I'll find it — shipped, cleared and delivered, one price.",
  stayB: "I'll stay",
  waB: "Message me on WhatsApp",
  msgAny: "Message me about any of them.",
};

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City"];
const WHEN = ["20 min ago", "45 min ago", "1 hr ago", "this morning"];

export function HomeBehaviors({ all, number }: { all: PublicCar[]; number: string }) {
  useEffect(() => {
    const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ovl = document.getElementById("ovl");
    const ask = document.getElementById("ask");
    const mx = document.getElementById("mx");
    const toast = document.getElementById("toast");
    const toastx = document.getElementById("toastx");
    const my = waLink(number, "Hello TrueSpec, I have a question.");
    const scrollGrid = () => document.getElementById("cars")?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });

    const asked0 = store.get("asked", false);
    const visits = store.get("visits", 0) + 1;
    store.set("visits", visits);
    const isFirst = visits === 1;
    const known = store.get<string[] | null>("known", null);
    const knownCars = known ? all.filter((c) => !known.includes(c.ref)) : [];
    store.set("known", all.map((c) => c.ref));
    const lastRef = store.get<string | null>("lastcar", null);
    const lastCar = lastRef ? (all.find((c) => c.ref === lastRef) ?? null) : null;

    let covering = store.sget("covering", 0);
    const lock = (on: boolean) => document.body.classList.toggle("lock", on);
    function openModal(title: string, body: string) {
      if (covering >= 2 || !ovl) return;
      covering += 1;
      store.sset("covering", covering);
      const mt = document.getElementById("mtitle");
      const mb = document.getElementById("mbody");
      if (mt) mt.textContent = title;
      if (mb) mb.innerHTML = body;
      ovl.hidden = false;
      lock(true);
      document.getElementById("mx")?.focus();
    }
    function closeModal() {
      if (ovl) ovl.hidden = true;
      lock(false);
    }

    const welcomeBody = `<p class="mp">${SAY.askS}</p><div class="mbtns" style="margin-top:14px"><button type="button" data-a="suv">A family SUV</button><button type="button" data-a="sedan">A saloon</button><button type="button" data-a="other">Something I haven't listed yet</button><button type="button" class="sk" data-a="skip">Skip</button></div>`;
    const farewellBody = `<p class="mp">${SAY.farewellS}</p><div class="mbtns" style="margin-top:14px"><a class="wab" target="_blank" rel="noopener noreferrer" href="${my}"><i class="fa-brands fa-whatsapp"></i>${SAY.waB}</a><button type="button" class="sk" data-a="stay">${SAY.stayB}</button></div>`;

    function returnBar() {
      let html = `${SAY.welcomeBack} \u{1F44B}`;
      if (knownCars.length) {
        // The count comes from the one counting rule, not local arithmetic (R-CNT-1).
        const fresh = countStock(knownCars);
        const allLanded = fresh.landed === knownCars.length;
        html += ` — ${
          allLanded ? SAY.landedSince(fresh.landed) : SAY.newSince(knownCars.length)
        }`;
      }
      if (lastCar) {
        html += `. ${SAY.stillThinking(carTitle(lastCar))} <a href="${carHref(lastCar)}">${SAY.openIt}</a>`;
      }
      html += ` <button class="lnk" type="button" data-a="reopen">${SAY.reopen}</button>`;
      if (knownCars.length) html += ` <button class="lnk" type="button" data-a="new">${SAY.seeNew}</button>`;
      speak(html);
    }

    if (asked0) {
      if (ask) ask.hidden = true;
      if (!isFirst) returnBar();
    } else if (ask) {
      ask.hidden = false;
    }

    // first-visit welcome, ~1s in
    const welcomeTimer =
      isFirst && !asked0
        ? window.setTimeout(() => {
            if (!store.get("asked", false)) openModal(SAY.askT, welcomeBody);
          }, 1000)
        : undefined;

    // farewell — desktop exit intent + mobile flick, at least 7s dwell
    const t0 = Date.now();
    let farewellShown = false;
    function tryFarewell() {
      if (farewellShown || Date.now() - t0 < 7000) return;
      farewellShown = true;
      const wasOpen = ovl ? !ovl.hidden : false;
      openModal(SAY.farewellT, farewellBody);
      if (ovl && !ovl.hidden && !wasOpen) scrollGrid();
    }
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) tryFarewell();
    };

    let samples: { y: number; t: number }[] = [];
    const onTouchStart = (e: TouchEvent) => {
      samples = [{ y: e.touches[0].clientY, t: Date.now() }];
    };
    const onTouchMove = (e: TouchEvent) => {
      samples.push({ y: e.touches[0].clientY, t: Date.now() });
      if (samples.length > 4) samples.shift();
    };
    const onTouchEnd = () => {
      if (samples.length < 2) return;
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = b.t - a.t;
      if (dt > 0 && (b.y - a.y) / dt < -0.9 && b.y < 140 && window.scrollY < 80) tryFarewell();
    };

    // social proof toast — one per session
    let toastTimer: number | undefined;
    let hideToastTimer: number | undefined;
    if (!store.sget("toast", false)) {
      const fire = () => {
        if (ovl && !ovl.hidden) {
          toastTimer = window.setTimeout(fire, 12000);
          return;
        }
        store.sset("toast", true);
        const pool = all.filter((c) => inAvailablePresentation(c.section));
        if (!pool.length) return;
        const car = pool[Math.floor(Math.random() * pool.length)];
        const txt = document.getElementById("toasttxt");
        if (txt) {
          txt.textContent = `Someone from ${CITIES[Math.floor(Math.random() * CITIES.length)]} asked about the ${carTitle(car)} — ${WHEN[Math.floor(Math.random() * WHEN.length)]}`;
        }
        if (toast) toast.hidden = false;
        hideToastTimer = window.setTimeout(() => {
          if (toast) toast.hidden = true;
        }, 7000);
      };
      toastTimer = window.setTimeout(fire, 9000);
    }

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const link = t.closest('a[href*="/car/"]') as HTMLAnchorElement | null;
      if (link) {
        const m = /\/car\/([^/?#]+)/.exec(link.getAttribute("href") || "");
        if (m) store.set("lastcar", decodeURIComponent(m[1]));
      }
      const b = t.closest("[data-a]") as HTMLElement | null;
      if (!b) return;
      const act = b.dataset.a;
      if (act === "stay") {
        closeModal();
        return;
      }
      if (act === "skip") {
        store.set("asked", true);
        if (ask) ask.hidden = true;
        closeModal();
        speak(SAY.skipMsg);
        return;
      }
      if (act === "reopen") {
        if (ask) ask.hidden = false;
        document.getElementById("ask")?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
        return;
      }
      if (act === "new") {
        window.dispatchEvent(new CustomEvent("ts-show-new"));
        scrollGrid();
        return;
      }
      if (act === "suv" || act === "sedan" || act === "other") {
        store.set("asked", true);
        if (ask) ask.hidden = true;
        closeModal();
        if (act === "other") {
          speak(`${SAY.okOther} <a class="wab sm" target="_blank" rel="noopener noreferrer" href="${my}"><i class="fa-brands fa-whatsapp"></i>${SAY.waB}</a>`);
          scrollGrid();
          return;
        }
        window.location.href = act === "suv" ? "/inventory?body=SUV" : "/inventory?body=Sedan";
      }
    };
    const onOvlClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.id === "ovl") closeModal();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ovl && !ovl.hidden) closeModal();
    };
    const onToastX = () => {
      if (toast) toast.hidden = true;
    };

    mx?.addEventListener("click", closeModal);
    ovl?.addEventListener("click", onOvlClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    toastx?.addEventListener("click", onToastX);

    return () => {
      if (welcomeTimer) window.clearTimeout(welcomeTimer);
      if (toastTimer) window.clearTimeout(toastTimer);
      if (hideToastTimer) window.clearTimeout(hideToastTimer);
      mx?.removeEventListener("click", closeModal);
      ovl?.removeEventListener("click", onOvlClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      toastx?.removeEventListener("click", onToastX);
    };
  }, [all, number]);

  return (
    <>
      <div className="ovl" id="ovl" hidden>
        <div className="mdl" role="dialog" aria-modal="true" aria-labelledby="mtitle">
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
      </div>
      <div className="toast" id="toast" role="status" hidden>
        <span id="toasttxt" />
        <button id="toastx" type="button" aria-label="Dismiss">
          &times;
        </button>
      </div>
    </>
  );
}
