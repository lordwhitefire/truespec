"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveDraftForm, type SaveDraftFormResult } from "@/app/office/actions/draft";
import type { EnquiryFormData } from "@/lib/enquiry-form";

/* The enquiry draft's editor (owner ruling 2026-10-20, #3).

   One small form — name, phone, what they asked for, the note, and the state. A draft may be
   incomplete, so "Save as draft" never runs the record's rule; "Save as enquiry" does, through the
   same `readEnquirySeed` the existing save uses, and the messages land at their fields.

   The route and the session gate are the page's; this component only holds the typing and the two
   writes. */

export type EnquiryFormStateOption = { id: string; label: string };

function fieldError(result: SaveDraftFormResult | null, field: string): string | undefined {
  return result && !result.ok ? result.errors.find((error) => error.field === field)?.message : undefined;
}

export function EnquiryForm({
  data,
  states,
}: {
  data: EnquiryFormData;
  states: EnquiryFormStateOption[];
}) {
  const [result, setResult] = useState<SaveDraftFormResult | null>(null);
  const [pendingIntent, setPendingIntent] = useState<"draft" | "enquiry" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const stateGone = data.stateLabel !== null && data.stateId === null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent: "draft" | "enquiry" = submitter?.value === "draft" ? "draft" : "enquiry";

    const fd = new FormData(event.currentTarget);
    fd.set("draftId", data.draftId);
    fd.set("intent", intent);
    setResult(null);
    setPendingIntent(intent);

    start(async () => {
      try {
        const res = await saveDraftForm(fd);
        setResult(res);
        if (!res.ok) return;
        if (res.outcome === "draft") return;
        // The draft has become the record; the board is where an enquiry lives.
        router.push("/office/enquiries");
      } catch {
        setResult({
          ok: false,
          errors: [{ field: "draftId", message: "The store could not be reached — try that again" }],
        });
      } finally {
        setPendingIntent(null);
      }
    });
  }

  return (
    <>
      <div className="hrow">
        <div>
          <h1>Edit enquiry draft</h1>
          <p className="sub2">
            From {data.draftSource || "the uploaded sheet"} · waiting {data.waiting}. Every value can
            be edited; nothing is a record until you save the enquiry.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <section className="sec">
          <h2>
            <span className="n">1</span>The customer
          </h2>
          <div className="fgrid">
            <div className="f">
              <label htmlFor="e-name">Name</label>
              <input
                className="in"
                id="e-name"
                name="name"
                type="text"
                defaultValue={data.name}
                aria-invalid={fieldError(result, "name") ? true : undefined}
              />
              {fieldError(result, "name") ? (
                <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                  {fieldError(result, "name")}
                </span>
              ) : null}
            </div>
            <div className="f">
              <label htmlFor="e-number">Phone number</label>
              <input
                className="in"
                id="e-number"
                name="number"
                type="tel"
                defaultValue={data.number}
                aria-invalid={fieldError(result, "number") ? true : undefined}
              />
              {fieldError(result, "number") ? (
                <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                  {fieldError(result, "number")}
                </span>
              ) : null}
            </div>
            <div className="f full">
              <label htmlFor="e-asked">Asked for</label>
              <input
                className="in"
                id="e-asked"
                name="asked_for"
                type="text"
                defaultValue={data.askedFor}
                aria-invalid={fieldError(result, "asked_for") ? true : undefined}
              />
              {fieldError(result, "asked_for") ? (
                <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                  {fieldError(result, "asked_for")}
                </span>
              ) : null}
            </div>
            <div className="f full">
              <label htmlFor="e-note">Note</label>
              <textarea
                className="in"
                id="e-note"
                name="note"
                defaultValue={data.note}
                aria-invalid={fieldError(result, "note") ? true : undefined}
              ></textarea>
              <span className="hint">Office-only — the note is never shown to buyers.</span>
            </div>
          </div>
        </section>

        <section className="sec">
          <h2>
            <span className="n">2</span>State
          </h2>
          <div className="f">
            <label htmlFor="e-state">Where this enquiry is</label>
            <select className="in" id="e-state" name="stateId" defaultValue={data.stateId ?? ""}>
              {/* An enquiry may sit in no state, so the empty choice is real, not a placeholder. */}
              <option value="">No state — sits in none</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.label}
                </option>
              ))}
            </select>
            {stateGone ? (
              <span className="hint" style={{ color: "var(--warn)" }}>
                The file named “{data.stateLabel}”, which is gone — choose a state, or leave it in
                none.
              </span>
            ) : null}
          </div>
        </section>

        <div className="saverow">
          <button className="btn gh" type="submit" name="intent" value="draft" disabled={pending}>
            <i className="fa-solid fa-floppy-disk" />{" "}
            {pendingIntent === "draft" ? "Saving…" : "Save as draft"}
          </button>
          <button className="btn" type="submit" name="intent" value="enquiry" disabled={pending}>
            <i className="fa-solid fa-check" />{" "}
            {pendingIntent === "enquiry" ? "Saving…" : "Save enquiry"}
          </button>
          <a className="btn gh" href="/office/drafts">
            Cancel
          </a>
          <span className="hint2">
            {result && !result.ok
              ? "Some fields need attention — see the messages beside them."
              : "Save as draft keeps it waiting; Save enquiry puts it on the board."}
          </span>
        </div>

        {result && !result.ok ? (
          <div
            role="alert"
            style={{
              marginTop: 12,
              border: "1px solid var(--bad)",
              borderRadius: 10,
              padding: "10px 12px",
              color: "var(--bad)",
              fontSize: 13,
            }}
          >
            <b>Could not save.</b>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {result.errors.map((error) => (
                <li key={error.field}>{error.message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {result?.ok && result.outcome === "draft" ? (
          <div
            role="status"
            style={{
              marginTop: 12,
              border: "1px solid var(--ok)",
              borderRadius: 10,
              padding: "10px 12px",
              color: "var(--ok)",
              fontSize: 13,
            }}
          >
            Draft saved. It is still waiting; nothing was created.
          </div>
        ) : null}
      </form>
    </>
  );
}
