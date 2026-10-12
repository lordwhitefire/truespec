"use client";

import { useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

/* Login / first-run / reset — a faithful port of login.html.
   The reference is a static page with an imperative script, so this renders the
   same markup and runs the same script once, in an effect, against the DOM. That
   keeps behaviour identical to the reference: a click, or a direct DOM write,
   acts the same on both sides (a React-state model of the panels would fight any
   direct write). The theme toggle is the reference's own fixed top-right `#thm`
   (the shared ThemeToggle component). The `.demo` UI-review switcher is
   reference-only and deleted; `show` is the product's own panel switch and is
   exposed on window exactly as the reference's classic script exposes it.
   `#li-forgot` has no handler in the reference, so it stays dead here. */

export function Login() {
  useEffect(() => {
    const byId = (id: string) => document.getElementById(id);
    const ac = new AbortController();
    const opt: AddEventListenerOptions = { signal: ac.signal };

    const P: Record<string, HTMLElement | null> = {
      login: byId("p-login"),
      setup: byId("p-setup"),
      forgot: byId("p-forgot"),
    };

    function show(k: string) {
      Object.values(P).forEach((p) => {
        if (p) p.hidden = true;
      });
      const el = P[k];
      if (el) el.hidden = false;
      const f = el?.querySelector("input");
      if (f) f.focus();
    }
    (window as unknown as { show: typeof show }).show = show;

    // Panel switching: demo switcher buttons (deleted) + inline links.
    const goto = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const g = t?.closest("[data-goto]") as HTMLElement | null;
      if (!g) return;
      e.preventDefault();
      const k = g.dataset.goto || "login";
      if (k === "locked") {
        show("login");
        byId("lock")?.classList.add("on");
      } else show(k);
    };
    document.addEventListener("click", goto, opt);

    // Password eyes.
    document.querySelectorAll(".eye").forEach((b) => {
      b.addEventListener(
        "click",
        () => {
          const btn = b as HTMLElement;
          const i = byId(btn.dataset.eye || "") as HTMLInputElement | null;
          if (!i) return;
          const on = i.type === "password";
          i.type = on ? "text" : "password";
          btn.innerHTML = `<i class="fa-regular fa-eye${on ? "-slash" : ""}"></i>`;
          btn.setAttribute("aria-label", on ? "Hide password" : "Show password");
        },
        opt,
      );
    });

    // Setup: strength meter + match check (UI only).
    const suPass = byId("su-pass") as HTMLInputElement | null;
    const meter = byId("meter");
    const mtxt = byId("mtxt");
    suPass?.addEventListener(
      "input",
      () => {
        const v = suPass.value;
        let s = 0;
        if (v.length >= 10) s++;
        if (v.length >= 14 && /[A-Z]/.test(v) && /[0-9]/.test(v)) s++;
        if (v.length >= 18 || (/[^A-Za-z0-9]/.test(v) && v.length >= 12)) s++;
        if (meter) meter.className = "meter" + (s ? " m" + s : "");
        if (mtxt)
          mtxt.textContent = v
            ? s === 0
              ? "Too short — at least 10 characters."
              : s === 1
                ? "Okay. A longer phrase would be stronger."
                : s === 2
                  ? "Good password."
                  : "Strong password."
            : "At least 10 characters. A long phrase beats a short scramble.";
      },
      opt,
    );
    byId("su-pass2")?.addEventListener(
      "input",
      (e) => {
        const v = (e.target as HTMLInputElement).value;
        byId("su-err")?.classList.toggle("on", !!v && v !== suPass?.value);
      },
      opt,
    );
    byId("su-go")?.addEventListener("click", () => show("login"), opt);

    // Login: fake check + lockout visual.
    let tries = 0;
    byId("li-go")?.addEventListener(
      "click",
      () => {
        const p = byId("li-pass") as HTMLInputElement | null;
        if (!p) return;
        if (p.value === "demo-only") {
          // demo password: success = would redirect to the dashboard
          window.location.href = "/office";
          return;
        }
        tries++;
        byId("li-err")?.classList.add("on");
        p.classList.add("bad");
        p.focus();
        p.select();
        if (tries >= 3) byId("lock")?.classList.add("on");
      },
      opt,
    );
    byId("li-pass")?.addEventListener(
      "input",
      (e) => {
        const t = e.target as HTMLInputElement;
        t.classList.remove("bad");
        byId("li-err")?.classList.remove("on");
      },
      opt,
    );

    // Forgot: show the sent confirmation (UI only).
    byId("fr-go")?.addEventListener(
      "click",
      () => {
        const f = byId("fr-form");
        if (f) f.hidden = true;
        byId("sent")?.classList.add("on");
      },
      opt,
    );

    return () => {
      ac.abort();
      delete (window as unknown as { show?: unknown }).show;
    };
  }, []);

  return (
    <>
      <ThemeToggle />

      <main className="wrap">
        <div className="card">
          <div className="brand">
            <i className="fa-solid fa-gauge-high" />
            TrueSpec <span style={{ color: "var(--gold)" }}>Office</span>
          </div>
          <p className="sub">{"The owner's side of the showroom. Nothing here is public."}</p>

          {/* ============ STATE 1: FIRST-TIME SETUP ============ */}
          <section className="panel" id="p-setup" hidden>
            <h1>First-time setup</h1>
            <p className="ps">
              Create the one owner account. This screen locks itself forever afterwards — there is
              no sign-up on TrueSpec.
            </p>
            <div className="f">
              <label htmlFor="su-name">Your name</label>
              <input className="in" id="su-name" type="text" defaultValue="Umar" autoComplete="name" />
              <p className="hint">{'Shown on activity entries ("Updated by Umar").'}</p>
            </div>
            <div className="f">
              <label htmlFor="su-email">Email</label>
              <input className="in" id="su-email" type="email" defaultValue="umar@truespec.ng" autoComplete="email" />
            </div>
            <div className="f">
              <label htmlFor="su-pass">Password</label>
              <div className="pwrap">
                <input className="in" id="su-pass" type="password" autoComplete="new-password" />
                <button className="eye" type="button" data-eye="su-pass" aria-label="Show password">
                  <i className="fa-regular fa-eye" />
                </button>
              </div>
              <div className="meter" id="meter" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <p className="mtxt" id="mtxt">
                At least 10 characters. A long phrase beats a short scramble.
              </p>
            </div>
            <div className="f">
              <label htmlFor="su-pass2">Confirm password</label>
              <input className="in" id="su-pass2" type="password" autoComplete="new-password" />
              <p className="err" id="su-err">
                <i className="fa-solid fa-circle-exclamation" />
                {"Passwords don't match yet."}
              </p>
            </div>
            <button className="go" id="su-go" type="button">
              <i className="fa-solid fa-lock" />
              Create account &amp; lock this screen
            </button>
            <p className="hint" style={{ marginTop: 12, textAlign: "center" }}>
              One account. No sign-up page will ever exist.
            </p>
          </section>

          {/* ============ STATE 2: SIGN IN ============ */}
          <section className="panel" id="p-login">
            <h1>Sign in</h1>
            <p className="ps">One account. No sign-up — ever.</p>
            <div className="alert" id="lock" role="alert">
              <i className="fa-solid fa-triangle-exclamation" />
              <div>
                <b>Too many attempts.</b> Locked for 60 seconds before the next try.
              </div>
            </div>
            <div className="f">
              <label htmlFor="li-email">Email</label>
              <input className="in" id="li-email" type="email" defaultValue="umar@truespec.ng" autoComplete="username" />
            </div>
            <div className="f">
              <label htmlFor="li-pass">Password</label>
              <div className="pwrap">
                <input className="in" id="li-pass" type="password" defaultValue="demo-only" autoComplete="current-password" />
                <button className="eye" type="button" data-eye="li-pass" aria-label="Show password">
                  <i className="fa-regular fa-eye" />
                </button>
              </div>
              <p className="err" id="li-err">
                <i className="fa-solid fa-circle-exclamation" />
                Wrong email or password.
              </p>
            </div>
            <div className="row">
              <label className="ck">
                <input type="checkbox" id="li-rem" defaultChecked />
                Keep me signed in
              </label>
              <a href="#" id="li-forgot">
                Forgot password?
              </a>
            </div>
            <button className="go" id="li-go" type="button">
              <i className="fa-solid fa-lock-open" />
              Sign in
            </button>
          </section>

          {/* ============ STATE 3: FORGOT PASSWORD ============ */}
          <section className="panel" id="p-forgot" hidden>
            <h1>Reset link</h1>
            <p className="ps">Works only for the one existing account.</p>
            <div className="sent" id="sent">
              <div className="ok">
                <i className="fa-solid fa-check" />
              </div>
              <p>{"If that email is the owner's, a reset link is on its way. It expires in 15 minutes."}</p>
              <button className="go" type="button" data-goto="login">
                Back to sign in
              </button>
            </div>
            <div id="fr-form">
              <div className="f">
                <label htmlFor="fr-email">Email</label>
                <input className="in" id="fr-email" type="email" defaultValue="umar@truespec.ng" />
                <p className="hint">{'For the demo: any email shows the "sent" confirmation.'}</p>
              </div>
              <button className="go" id="fr-go" type="button">
                Send reset link
              </button>
              <p className="hint" style={{ marginTop: 12, textAlign: "center" }}>
                <a href="#" data-goto="login">
                  Back to sign in
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>

      <div className="boot">
        <span className="lg2">TrueSpec Automotive</span> · Imported from the USA ·{" "}
        <a href="/">Public showroom</a>
      </div>
    </>
  );
}
