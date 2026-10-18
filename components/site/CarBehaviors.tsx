"use client";

import { useEffect } from "react";

import { PHOTO_PLACEHOLDER } from "../Photo";

type Props = {
  photos: string[];
  alt: string;
  wa: string;
  viewing: string;
  name: string;
  slug: string;
  status: string;
  was: string | null;
  note: string;
};

// Reference copy ported from the reference car page's runtime script.
const SAY = {
  tabP: "The full story on this car — condition, history and what the price covers.",
  tabF: "Everything that comes with it. Shipping, clearing and delivery are already in the price.",
  tabD: "Four steps from here to your door, and delivery anywhere in Nigeria is included.",
  greetA: "This one is on the lot right now. Message me and I'll send a video walk-around today.",
  greetO: (m: string) => `Arriving ${m}. Reserve it with a message and I hold it for you — no payment yet.`,
  greetL: (m: string) => `Landed in ${m}, fully cleared and ready to view. Book a time and come see it.`,
  greetSpecial: (s: string) => `Dropped ${s} — that's the full doorstep price, nothing added on top.`,
  backGreet: (t: string) => `Good to see you back on this one \u{1F44B} — the ${t} is still waiting. Want to book a viewing?`,
  backBtn: "Book a viewing",
  reserveB: "Reserve this car",
  farewellT: "Before you go",
  farewellS: (t: string) => `Want more photos of the ${t}? Message me and I'll send a video walk-around.`,
  waB: "Message me on WhatsApp",
  stayB: "I'll keep looking",
  toastHide: "Link copied",
  toastFallback: "Copy the link from the address bar",
};

const MIDX: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "");
const monthWord = (s: string, rx: RegExp) => {
  const m = rx.exec(s || "");
  return m ? cap(m[1]) : "";
};

export function CarBehaviors({ photos, alt, wa, viewing, name, slug, status, was, note }: Props) {
  useEffect(() => {
    const $ = <T extends Element = HTMLElement>(sel: string) => document.getElementById(sel) as T | null;
    const cleanups: Array<() => void> = [];
    const on = (el: EventTarget | null, ev: string, fn: EventListener, opts?: AddEventListenerOptions) => {
      if (!el) return;
      el.addEventListener(ev, fn, opts);
      cleanups.push(() => el.removeEventListener(ev, fn, opts));
    };
    const store = {
      get: <T,>(k: string, d: T): T => {
        try {
          const v = localStorage.getItem("ts-" + k);
          return v == null ? d : (JSON.parse(v) as T);
        } catch {
          return d;
        }
      },
      set: (k: string, v: unknown) => {
        try {
          localStorage.setItem("ts-" + k, JSON.stringify(v));
        } catch {
          /* ignored */
        }
      },
      sget: <T,>(k: string, d: T): T => {
        try {
          const v = sessionStorage.getItem("ts-" + k);
          return v == null ? d : (JSON.parse(v) as T);
        } catch {
          return d;
        }
      },
      sset: (k: string, v: unknown) => {
        try {
          sessionStorage.setItem("ts-" + k, JSON.stringify(v));
        } catch {
          /* ignored */
        }
      },
    };

    const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const safe = (fn: () => void) => {
      try {
        fn();
      } catch {
        /* ignored */
      }
    };

    // ---- SPEAK — in-view answer line --------------------------------------
    const speak = (html: string) => {
      const s = $("speak");
      if (!s) return;
      s.innerHTML = html;
      s.classList.remove("pop");
      void (s as HTMLElement).offsetWidth;
      s.classList.add("pop");
    };

    // ---- MODAL — shared 2-per-visit budget --------------------------------
    // The dialog is the platform's (Task 13): escaping, trapping and the top layer are its own.
    // Its `close` event is where the page unlocks, so Escape and our own close end the same way.
    const ovl = $<HTMLDialogElement>("ovl");
    let covering = store.sget("covering", 0);
    const openModal = (title: string, body: string) => {
      if (covering >= 2) return;
      covering++;
      store.sset("covering", covering);
      const t = $("mtitle");
      if (t) t.textContent = title;
      const b = $("mbody");
      if (b) b.innerHTML = body;
      if (ovl && !ovl.open) ovl.showModal();
      document.body.classList.add("lock");
      $("mx")?.focus();
    };
    const closeModal = () => {
      if (ovl?.open) ovl.close();
      document.body.classList.remove("lock");
    };
    on(ovl, "close", () => document.body.classList.remove("lock"));
    on($("mx"), "click", closeModal);
    on(ovl, "click", (e) => {
      if ((e.target as HTMLElement).id === "ovl") closeModal();
    });

    // ---- Umar's greeting: return visitor first, then status ---------------
    safe(() => {
      const seen = store.get<Record<string, number>>("seen", {});
      const isBack = (seen[slug] ?? 0) >= 2;
      seen[slug] = (seen[slug] ?? 0) + 1;
      store.set("seen", seen);
      store.set("lastcar", slug);
      if (isBack) {
        speak(
          `${SAY.backGreet(name)} <a class="wab sm" target="_blank" href="${viewing}"><i class="fa-brands fa-whatsapp"></i>${SAY.backBtn}</a>`,
        );
      } else if (was) {
        speak(SAY.greetSpecial(was));
      } else if (status === "o") {
        const m = monthWord(note, /arrival:?\s*([a-z]+)/i) || "soon";
        speak(
          `${SAY.greetO(m)} <a class="wab sm" target="_blank" href="${wa}"><i class="fa-brands fa-whatsapp"></i>${SAY.reserveB}</a>`,
        );
      } else if (status === "l") {
        const m = monthWord(note, /landed in\s+([a-z]+)/i) || "recently";
        speak(
          `${SAY.greetL(m)} <a class="wab sm" target="_blank" href="${viewing}"><i class="fa-brands fa-whatsapp"></i>${SAY.backBtn}</a>`,
        );
      } else {
        speak(SAY.greetA);
      }
    });

    // ---- gallery ----------------------------------------------------------
    // A car with no photos has nothing to page, count or zoom: the drawn box stands in the frame
    // alone, and every write below is skipped so none of its arithmetic can reach the screen —
    // no `undefined` src, no `NaN / 0`, no `photo NaN` (DR5).
    const imgs = photos;
    let gi = 0;
    let gt: number | undefined;
    const show = (i: number) => {
      if (!imgs.length) return;
      gi = (i + imgs.length) % imgs.length;
      const im = $<HTMLImageElement>("gi");
      const g = $("gal");
      const li = $<HTMLImageElement>("li");
      window.clearTimeout(gt);
      if (im) im.classList.add("sw");
      g?.classList.remove("go");
      const set = () => {
        const src = imgs[gi];
        if (im) {
          im.src = src;
          im.alt = `${alt} photo ${gi + 1}`;
          im.onload = () => {
            im.classList.remove("sw");
            void (g as HTMLElement | null)?.offsetWidth;
            g?.classList.add("go");
          };
          // A driven photo that fails lands on the drawn box, like a load-time failure (DR6).
          im.onerror = () => {
            im.classList.remove("sw");
            im.src = PHOTO_PLACEHOLDER;
          };
        }
        if (li) li.src = src;
      };
      if (im?.src) gt = window.setTimeout(set, 220);
      else set();
      const cn = $("cn");
      if (cn) cn.innerHTML = `<i class="fa-regular fa-image"></i> ${gi + 1} / ${imgs.length}`;
      document.querySelectorAll<HTMLButtonElement>("#thumbs button").forEach((b, k) => b.classList.toggle("on", k === gi));
    };
    const step = (d: number) => show(gi + d);
    const thumbBtns = Array.from(document.querySelectorAll<HTMLButtonElement>("#thumbs button"));
    thumbBtns.forEach((b, i) => on(b, "click", () => show(i)));

    // ---- gallery nav + lightbox -------------------------------------------
    document.querySelectorAll<HTMLButtonElement>("#gal .gb.l").forEach((b) =>
      on(b, "click", (e) => {
        (e as MouseEvent).stopPropagation();
        step(-1);
      }),
    );
    document.querySelectorAll<HTMLButtonElement>("#gal .gb.r").forEach((b) =>
      on(b, "click", (e) => {
        (e as MouseEvent).stopPropagation();
        step(1);
      }),
    );
    const openLb = () => {
      if (!imgs.length) return;
      const li = $<HTMLImageElement>("li");
      if (li) li.src = imgs[gi];
      $("lb")?.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const closeLb = () => {
      $("lb")?.classList.remove("open");
      document.body.style.overflow = "";
    };
    on($("gal"), "click", openLb);
    on($("lb"), "click", (e) => {
      if ((e.target as HTMLElement).id === "lb") closeLb();
    });
    on(window, "keydown", (e) => {
      if (!$("lb")?.classList.contains("open")) return;
      const k = (e as KeyboardEvent).key;
      if (k === "Escape") closeLb();
      if (k === "ArrowRight") step(1);
      if (k === "ArrowLeft") step(-1);
    });
    let sx: number | null = null;
    on($("gal"), "touchstart", (e) => {
      sx = (e as TouchEvent).touches[0].clientX;
    }, { passive: true });
    on($("gal"), "touchend", (e) => {
      if (sx === null) return;
      const d = (e as TouchEvent).changedTouches[0].clientX - sx;
      if (Math.abs(d) > 50) step(d < 0 ? 1 : -1);
      sx = null;
    }, { passive: true });
    show(0);

    // ---- tabs with sliding bar, ARIA + a spoken answer --------------------
    const tb = Array.from(document.querySelectorAll<HTMLButtonElement>("#tabs button"));
    const TAB_SAY: Record<string, string> = { p1: SAY.tabP, p2: SAY.tabF, p3: SAY.tabD };
    const bar = (b?: HTMLButtonElement | null) => {
      const s = $("bar");
      if (!b || !s) return;
      s.style.left = `${b.offsetLeft}px`;
      s.style.width = `${b.offsetWidth}px`;
    };
    tb.forEach((b) =>
      on(b, "click", () => {
        tb.forEach((x) => {
          x.classList.toggle("on", x === b);
          x.setAttribute("aria-selected", x === b ? "true" : "false");
        });
        document.querySelectorAll(".pn").forEach((p) => p.classList.toggle("on", p.id === b.dataset.p));
        bar(b);
        speak(TAB_SAY[b.dataset.p ?? "p1"]);
      }),
    );
    on(window, "load", () => bar(tb.find((b) => b.classList.contains("on"))));
    on(window, "resize", () => bar(tb.find((b) => b.classList.contains("on"))));
    bar(tb[0]);

    // ---- related ----------------------------------------------------------
    const sc = (d: number) => {
      $("rt2")?.scrollBy({ left: d * 310, behavior: REDUCED ? "auto" : "smooth" });
    };
    const rnBtns = Array.from(document.querySelectorAll<HTMLButtonElement>(".rn button"));
    if (rnBtns[0]) on(rnBtns[0], "click", () => sc(-1));
    if (rnBtns[1]) on(rnBtns[1], "click", () => sc(1));

    // ---- share + toast ----------------------------------------------------
    const stoast = (t: string) => {
      const e = $("stoast");
      if (!e) return;
      e.textContent = t;
      e.classList.add("show");
      window.setTimeout(() => e.classList.remove("show"), 2400);
    };
    on(document.querySelector(".chips button"), "click", () => {
      const d = { title: name, url: location.href };
      if (navigator.share) {
        navigator.share(d).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard
          .writeText(location.href)
          .then(() => stoast(SAY.toastHide), () => stoast(SAY.toastFallback));
      } else {
        stoast(SAY.toastFallback);
      }
    });

    // ---- scroll reveals + mobile bar --------------------------------------
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".rv").forEach((e, i) => {
      (e as HTMLElement).style.setProperty("--d", String(i % 3));
      io.observe(e);
    });
    cleanups.push(() => io.disconnect());

    const mb = $("mbar");
    const pc = document.querySelector(".pc");
    if (mb && pc) {
      const io2 = new IntersectionObserver((es) => mb.classList.toggle("show", !es[0].isIntersecting), { threshold: 0 });
      io2.observe(pc);
      cleanups.push(() => io2.disconnect());
    }

    // ---- FAREWELL ---------------------------------------------------------
    const t0 = Date.now();
    let farewellShown = false;
    const tryFarewell = () => {
      if (farewellShown || Date.now() - t0 < 7000) return;
      farewellShown = true;
      openModal(
        SAY.farewellT,
        `<p class="mp">${SAY.farewellS(name)}</p><div class="mbtns"><a class="wab" target="_blank" href="${wa}"><i class="fa-brands fa-whatsapp"></i>${SAY.waB}</a><button type="button" class="sk" id="stayB">${SAY.stayB}</button></div>`,
      );
      document.getElementById("stayB")?.addEventListener("click", closeModal);
    };
    on(document, "mouseout", (e) => {
      const me = e as MouseEvent;
      if (!me.relatedTarget && me.clientY <= 0) tryFarewell();
    });
    (() => {
      let samples: Array<{ y: number; t: number }> = [];
      on(window, "touchstart", (e) => {
        samples = [{ y: (e as TouchEvent).touches[0].clientY, t: Date.now() }];
      }, { passive: true });
      on(window, "touchmove", (e) => {
        samples.push({ y: (e as TouchEvent).touches[0].clientY, t: Date.now() });
        if (samples.length > 4) samples.shift();
      }, { passive: true });
      on(window, "touchend", () => {
        if (samples.length < 2) return;
        const a = samples[0];
        const b = samples[samples.length - 1];
        const dt = b.t - a.t;
        if (dt > 0 && (b.y - a.y) / dt < -0.9 && b.y < 140 && window.scrollY < 80) tryFarewell();
      }, { passive: true });
    })();

    // ---- SOCIAL PROOF TOAST (once per session) ----------------------------
    if (!store.sget("toast", false)) {
      const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City"];
      const WHEN = ["20 min ago", "45 min ago", "1 hr ago", "this morning"];
      const fire = () => {
        if (ovl?.open) {
          window.setTimeout(fire, 12000);
          return;
        }
        store.sset("toast", true);
        const ptxt = $("ptxt");
        if (ptxt)
          ptxt.textContent = `Someone from ${CITIES[Math.floor(Math.random() * CITIES.length)]} asked about the ${name} — ${WHEN[Math.floor(Math.random() * WHEN.length)]}`;
        const pt = $("ptoast");
        if (pt) pt.hidden = false;
        window.setTimeout(() => {
          const p = $("ptoast");
          if (p) p.hidden = true;
        }, 7000);
      };
      const timer = window.setTimeout(fire, 9000);
      cleanups.push(() => window.clearTimeout(timer));
    }
    on($("ptx"), "click", () => {
      const p = $("ptoast");
      if (p) p.hidden = true;
    });

    return () => cleanups.forEach((fn) => fn());
  }, [photos, alt, wa, viewing, name, slug, status, was, note]);

  return null;
}
