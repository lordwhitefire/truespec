"use client";

import { useState, useTransition } from "react";

/* "Create from file" — the office's way in for a filled car template or the sales desk's enquiry
   sheet (task.md §Q2: it sits on the inventory and enquiry screens; the drafts it makes are reviewed
   at `/office/drafts`).

   The upload is **not** a write of a record: the file's rows become **drafts**, in their own holding
   place, and nothing enters `car` or `enquiry` (truth 9). So this control's whole job is to send the
   file and say what came back — how many are waiting, and every row the reader refused, named. A
   refused row is reported, never dropped.

   The kind is decided by the **reader**, not by which screen the owner is standing on: a filled car
   template is read as cars, a sales sheet as enquiries, and the API tries one then the other
   (`app/api/upload/route.ts`). One control therefore serves both screens. */

type Refusal = { page: number; reason: string };

type UploadBody = {
  ok?: boolean;
  kind?: string;
  cars?: number;
  enquiries?: number;
  refusals?: Refusal[];
  reason?: string;
};

type Created = { kind: "car" | "enquiry"; count: number; refusals: Refusal[] };
type Failed = { reason: string; refusals: Refusal[] };

export function CreateFromFile({ hint }: { hint?: string }) {
  const [pending, start] = useTransition();
  const [created, setCreated] = useState<Created | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);

  function choose(file: File) {
    setCreated(null);
    setFailed(null);
    const fd = new FormData();
    fd.append("file", file, file.name);
    start(async () => {
      let res: Response;
      try {
        res = await fetch("/api/upload", { method: "POST", body: fd });
      } catch {
        setFailed({ reason: "The upload could not be sent — check the connection and try again.", refusals: [] });
        return;
      }
      const body = (await res.json().catch(() => null)) as UploadBody | null;
      if (res.ok && body?.ok) {
        setCreated({
          kind: body.kind === "enquiry" ? "enquiry" : "car",
          count: body.cars ?? body.enquiries ?? 0,
          refusals: body.refusals ?? [],
        });
        return;
      }
      setFailed({
        reason: body?.reason ?? "That file could not be read.",
        refusals: body?.refusals ?? [],
      });
    });
  }

  const many = (n: number, kind: "car" | "enquiry") =>
    `${n} ${kind === "car" ? "car" : "enquiry"}${n === 1 ? "" : kind === "car" ? "s" : "ies"} waiting`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <label
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          background: "none",
          border: "1px solid var(--line)",
          color: "var(--ink)",
          fontWeight: 600,
          fontSize: 14,
          padding: "0 18px",
          height: 44,
          borderRadius: 6,
          cursor: pending ? "progress" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          disabled={pending}
          aria-label="Create drafts from a file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) choose(file);
            // Cleared so choosing the same file again still uploads it.
            e.target.value = "";
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "inherit",
          }}
        />
        <i
          className={`fa-solid ${pending ? "fa-spinner fa-spin" : "fa-file-arrow-up"}`}
          aria-hidden="true"
          style={{ color: "var(--gold)" }}
        />
        {pending ? "Reading…" : "Create from file"}
      </label>

      {hint ? (
        <span style={{ fontSize: 12, color: "var(--mute)", maxWidth: 320 }}>{hint}</span>
      ) : null}

      {created ? (
        <div
          role="status"
          style={{
            background: "var(--lt)",
            border: "1px solid var(--line)",
            borderLeft: "4px solid var(--ok)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12.5,
          }}
        >
          <b>{many(created.count, created.kind)}.</b> Nothing is in the showroom yet — review and save
          them at{" "}
          <a href="/office/drafts" style={{ color: "var(--gold)", fontWeight: 700 }}>
            Drafts
          </a>
          .
          {created.refusals.length > 0 ? <Refusals refusals={created.refusals} /> : null}
        </div>
      ) : null}

      {failed ? (
        <div
          role="alert"
          style={{
            background: "var(--lt)",
            border: "1px solid var(--line)",
            borderLeft: "4px solid var(--bad)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12.5,
            maxWidth: 380,
          }}
        >
          {failed.reason}
          {failed.refusals.length > 0 ? <Refusals refusals={failed.refusals} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** A refused row, named by its page — reported to the owner, never quietly dropped. */
function Refusals({ refusals }: { refusals: Refusal[] }) {
  return (
    <ul style={{ margin: "6px 0 0 16px", color: "var(--mute)" }}>
      {refusals.map((r, i) => (
        <li key={i}>
          {r.page > 0 ? <>Page {r.page}: </> : null}
          {r.reason}
        </li>
      ))}
    </ul>
  );
}
