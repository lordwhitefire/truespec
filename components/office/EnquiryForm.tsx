"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveDraftForm, type SaveDraftFormResult } from "@/app/office/actions/draft";
import { updateEnquiry, type UpdateEnquiryResult } from "@/app/office/actions/enquiry";
import type { EnquiryFormData } from "@/lib/enquiry-form";

/* The enquiry editor (owner ruling 2026-10-20, #3 and #4).

   One small form — name, phone, what they asked for, the note, and the state — used in two modes:

   * **draft** — a file's row waiting at Drafts. "Save as draft" never runs the record's rule, so an
     incomplete enquiry can wait; "Save enquiry" does, through the same `readEnquirySeed` the record
     has always used, and the draft becomes a row on the board.
   * **edit** — a saved enquiry. One button; the same rule; the change-check is the server's, and a
     retry that changes nothing says so rather than claiming a save.

   The route and the session gate are the page's; this component only holds the typing and the
   writes. Field messages land beside the input that caused them. */

export type EnquiryFormStateOption = { id: string; label: string };

/** A saved enquiry, as the edit form needs it. */
export type EnquiryEditData = {
  id: string;
  name: string;
  number: string;
  askedFor: string;
  note: string;
  stateId: string | null;
};

type EnquiryFormProps = { states: EnquiryFormStateOption[] } & (
  | { mode: "draft"; data: EnquiryFormData }
  | { mode: "edit"; data: EnquiryEditData }
);

type StoredResult =
  | { mode: "draft"; res: SaveDraftFormResult }
  | { mode: "edit"; res: UpdateEnquiryResult };

export function EnquiryForm(props: EnquiryFormProps) {
  const { mode, states } = props;
  const data = props.data;
  const draftData = mode === "draft" ? props.data : null;

  const [result, setResult] = useState<StoredResult | null>(null);
  const [pendingIntent, setPendingIntent] = useState<"draft" | "enquiry" | "edit" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const failure = result && !result.res.ok ? result.res : null;
  const fieldError = (field: string) =>
    failure?.errors.find((error) => error.field === field)?.message;

  const draftSaved =
    result?.mode === "draft" && result.res.ok && result.res.outcome === "draft" ? result.res : null;
  const editSaved = result?.mode === "edit" && result.res.ok ? result.res : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent: "draft" | "enquiry" | "edit" =
      mode === "draft" ? (submitter?.value === "draft" ? "draft" : "enquiry") : "edit";

    const fd = new FormData(event.currentTarget);
    setResult(null);
    setPendingIntent(intent);

    start(async () => {
      try {
        if (mode === "draft") {
          fd.set("draftId", props.data.draftId);
          fd.set("intent", intent);
          const res = await saveDraftForm(fd);
          setResult({ mode: "draft", res });
          if (!res.ok) return;
          if (res.outcome === "draft") return;
          // The draft has become the record; the board is where an enquiry lives.
          router.push("/office/enquiries");
          return;
        }

        fd.set("id", props.data.id);
        const res = await updateEnquiry(fd);
        setResult({ mode: "edit", res });
        if (!res.ok) return;
        router.refresh();
      } catch {
        const errors = [
          { field: "id", message: "The store could not be reached — try that again" },
        ];
        setResult(
          mode === "draft"
            ? { mode: "draft", res: { ok: false, errors } }
            : { mode: "edit", res: { ok: false, errors } },
        );
      } finally {
        setPendingIntent(null);
      }
    });
  }

  return (
    <>
      <div className="hrow">
        <div>
          <h1>{mode === "draft" ? "Edit enquiry draft" : "Edit enquiry"}</h1>
          <p className="sub2">
            {mode === "draft" ? (
              <>
                From {props.data.draftSource || "the uploaded sheet"} · waiting{" "}
                {props.data.waiting}. Every value can be edited; nothing is a record until you save
                the enquiry.
              </>
            ) : (
              <>The customer&apos;s details, as the office holds them. Saving writes one change.</>
            )}
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
                aria-invalid={fieldError("name") ? true : undefined}
              />
              {fieldError("name") ? (
                <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                  {fieldError("name")}
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
                aria-invalid={fieldError("number") ? true : undefined}
              />
              {fieldError("number") ? (
                <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                  {fieldError("number")}
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
                aria-invalid={fieldError("asked_for") ? true : undefined}
              />
              {fieldError("asked_for") ? (
                <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                  {fieldError("asked_for")}
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
                aria-invalid={fieldError("note") ? true : undefined}
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
            {draftData && draftData.stateLabel !== null && draftData.stateId === null ? (
              <span className="hint" style={{ color: "var(--warn)" }}>
                The file named “{draftData.stateLabel}”, which is gone — choose a state, or leave it
                in none.
              </span>
            ) : null}
          </div>
        </section>

        <div className="saverow">
          {mode === "draft" ? (
            <>
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
                {failure
                  ? "Some fields need attention — see the messages beside them."
                  : "Save as draft keeps it waiting; Save enquiry puts it on the board."}
              </span>
            </>
          ) : (
            <>
              <button className="btn" type="submit" disabled={pending}>
                <i className="fa-solid fa-check" />{" "}
                {pendingIntent === "edit" ? "Saving…" : "Save changes"}
              </button>
              <a className="btn gh" href="/office/enquiries">
                Cancel
              </a>
              <span className="hint2">
                {failure
                  ? "Some fields need attention — see the messages beside them."
                  : "Saving writes the change to the enquiry."}
              </span>
            </>
          )}
        </div>

        {failure ? (
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
              {failure.errors.map((error) => (
                <li key={error.field}>{error.message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draftSaved ? (
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

        {editSaved ? (
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
            {editSaved.changed ? (
              <>Saved. The board carries the change.</>
            ) : (
              // The store answered that nothing moved; the screen says so rather than claiming a
              // save (the same rule the car form follows).
              <>Nothing changed.</>
            )}
          </div>
        ) : null}
      </form>
    </>
  );
}
