'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Photo } from '@/components/Photo';
import { checkPhotoSize, megabytes, PHOTO_MAX_BYTES } from '@/lib/photo-rules';
import { Dialog } from '@/components/office/Dialog';
import { uploadCarPhoto } from '../../actions/photo';
import {
  addDraftImage,
  deleteDraftAction,
  makeDraftCover,
  removeDraftImage,
  saveDraft,
} from '../../actions/draft';

/* Drafts — the holding place, reviewed (truth 9). This is the interactive half; the page above reads
   the store and hands down only plain values.

   Every write goes through a Server Action that re-checks the session and judges the values itself,
   so nothing here is trusted. Drafts are **not** records: the board, the counts, the showroom and the
   section lists are untouched by anything on this screen until a save. */

export type StateOption = { id: string; label: string };

export type DraftCard = {
  id: string;
  kind: 'car' | 'enquiry';
  fields: { label: string; value: string }[];
  images: { assetId: string; url: string }[];
  /** The state the file named, as a name — or `null` when it named none. */
  stateLabel: string | null;
  /** That name matched to the registry, so the chooser opens on it; `null` if none or it is gone. */
  stateId: string | null;
  /** How long it has been waiting, already formatted (server-side, in UTC). */
  waiting: string;
  /** The form that edits this draft in place; absent while its kind has no editor yet. */
  editHref?: string;
};

export type DraftBatch = {
  batchId: string;
  sourceFilename: string;
  kind: 'car' | 'enquiry';
  cards: DraftCard[];
};

type Props = {
  batches: DraftBatch[];
  carStates: StateOption[];
  enquiryStates: StateOption[];
};

const KIND_WORDS: Record<'car' | 'enquiry', { one: string; many: string; icon: string }> = {
  car: { one: 'car', many: 'cars', icon: 'fa-car-side' },
  enquiry: { one: 'enquiry', many: 'enquiries', icon: 'fa-comments' },
};

export function Drafts({ batches, carStates, enquiryStates }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [toastShow, setToastShow] = useState(false);
  const tmr = useRef<number | undefined>(undefined);

  // The house toast: one message, shown, and taken away again. `dangerouslySetInnerHTML` carries the
  // bold a reference gets — the same shape the car form's toast uses.
  function showToast(html: string) {
    setToast(html);
    setToastShow(true);
    window.clearTimeout(tmr.current);
    tmr.current = window.setTimeout(() => setToastShow(false), 6000);
  }
  useEffect(() => () => window.clearTimeout(tmr.current), []);

  return (
    <>
      {batches.length === 0 ? (
        <div className="nowait">
          <i className="fa-solid fa-inbox" aria-hidden="true" />
          No drafts are waiting. A filled template or sales sheet is read into drafts the moment it
          is uploaded.
        </div>
      ) : (
        batches.map((b) => {
          const words = KIND_WORDS[b.kind];
          return (
            <section className="batch" key={b.batchId} aria-label={`${b.sourceFilename} drafts`}>
              <header className="bh">
                <i className={`fa-solid ${words.icon}`} aria-hidden="true" />
                <b>{b.sourceFilename}</b>
                <span className="bmeta">
                  <span className="badge">
                    <i className={`fa-solid ${words.icon}`} aria-hidden="true" />
                    {words.one}
                  </span>
                  <span>
                    {b.cards.length} {b.cards.length === 1 ? words.one : words.many} waiting
                  </span>
                </span>
              </header>
              <div className="dlist">
                {b.cards.map((card) => (
                  <DraftRow
                    key={card.id}
                    card={card}
                    states={card.kind === 'car' ? carStates : enquiryStates}
                    onToast={showToast}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      <p className="note">
        <i className="fa-solid fa-circle-info" aria-hidden="true" />
        <span>
          Nothing here is in the showroom yet. A draft spends no <b>TS-####</b> until it is saved,
          and the code is given at the moment of saving — so saving one leaves its brothers exactly
          as they are, and abandoning one costs nothing.
        </span>
      </p>

      <div className={'toast' + (toastShow ? ' show' : '')} role="status">
        <span dangerouslySetInnerHTML={{ __html: toast ?? '' }} />
      </div>
    </>
  );
}

function DraftRow({
  card,
  states,
  onToast,
}: {
  card: DraftCard;
  states: StateOption[];
  onToast: (html: string) => void;
}) {
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [stateId, setStateId] = useState(card.stateId ?? '');
  const [images, setImages] = useState(card.images);
  const [error, setError] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);

  const words = KIND_WORDS[card.kind];
  const stateGone = card.stateLabel !== null && card.stateId === null;

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set('draftId', card.id);
    fd.set('stateId', stateId);
    start(async () => {
      let res;
      try {
        res = await saveDraft(fd);
      } catch {
        setError('The store could not be reached — try that again');
        return;
      }
      if (res.ok) {
        // The code the store minted is the one the log names, so the confirmation says it too.
        const named = res.ref ? ` as ${res.ref}` : '';
        const where = card.kind === 'car' ? 'showroom' : 'board';
        onToast(
          `Saved the ${words.one}${named}. It is a record now, and the ${where} updates immediately.`
        );
        return;
      }
      setError(res.errors[0]?.message ?? `That ${words.one} could not be saved.`);
    });
  }

  function remove() {
    setError(null);
    const fd = new FormData();
    fd.set('draftId', card.id);
    start(async () => {
      let res;
      try {
        res = await deleteDraftAction(fd);
      } catch {
        setError('The store could not be reached — try that again');
        return;
      }
      if (res.ok) {
        setDelOpen(false);
        onToast('Draft deleted. Nothing was created from it.');
        return;
      }
      setError(res.errors[0]?.message ?? 'That draft could not be deleted.');
    });
  }

  // Truth 7's order: the bytes go first (uploaded the moment they are chosen), then the reference is
  // written to the draft's own row — so an added picture survives a reload exactly as the draft does.
  async function addFiles(files: FileList | File[]) {
    const chosen = Array.from(files);
    if (chosen.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of chosen) {
        const size = checkPhotoSize(file.size);
        if (!size.ok) {
          setError(size.reason);
          continue;
        }
        const fd = new FormData();
        fd.append('photo', file, file.name);
        const up = await uploadCarPhoto(fd);
        if (!up.ok) {
          setError(up.errors[0]?.message ?? 'That photo could not be added.');
          continue;
        }
        const add = new FormData();
        add.set('draftId', card.id);
        add.set('assetId', up.assetId);
        const res = await addDraftImage(add);
        if (!res.ok) {
          setError(res.errors[0]?.message ?? 'That photo could not be added.');
          continue;
        }
        setImages((prev) =>
          prev.some((p) => p.assetId === up.assetId)
            ? prev
            : [...prev, { assetId: up.assetId, url: up.url }]
        );
      }
    } catch {
      setError('The picture store could not be reached — try that again');
    } finally {
      setUploading(false);
    }
  }

  function dropImage(assetId: string) {
    setError(null);
    const fd = new FormData();
    fd.set('draftId', card.id);
    fd.set('assetId', assetId);
    start(async () => {
      try {
        const res = await removeDraftImage(fd);
        if (!res.ok) {
          setError(res.errors[0]?.message ?? 'That photo could not be removed.');
          return;
        }
        setImages((prev) => prev.filter((p) => p.assetId !== assetId));
      } catch {
        setError('The store could not be reached — try that again');
      }
    });
  }

  function makeCover(assetId: string) {
    setError(null);
    const fd = new FormData();
    fd.set('draftId', card.id);
    fd.set('assetId', assetId);
    start(async () => {
      try {
        const res = await makeDraftCover(fd);
        if (!res.ok) {
          setError(res.errors[0]?.message ?? 'That could not be made the cover.');
          return;
        }
        setImages((prev) => {
          const one = prev.find((p) => p.assetId === assetId);
          if (!one) return prev;
          return [one, ...prev.filter((p) => p.assetId !== assetId)];
        });
      } catch {
        setError('The store could not be reached — try that again');
      }
    });
  }

  return (
    <article className="dcard" aria-label={`${words.one} draft`}>
      <div className="dtop">
        <b>Waiting {words.one}</b>
        <span className="badge">
          <i className={`fa-solid ${words.icon}`} aria-hidden="true" />
          from file
        </span>
        <time>{card.waiting}</time>
      </div>

      <div className="dfields">
        {card.fields.map((f) => (
          <div className="df" key={f.label}>
            <b>{f.label}</b>
            {f.value ? <span>{f.value}</span> : <span className="none">not on the file</span>}
          </div>
        ))}
      </div>

      <div className="dstate">
        <label htmlFor={`st-${card.id}`}>
          {card.kind === 'car' ? 'Car state' : 'Enquiry state'}
        </label>
        <select
          id={`st-${card.id}`}
          className="in"
          value={stateId}
          onChange={(e) => setStateId(e.target.value)}
          disabled={pending}
        >
          {/* A car's own state must be one of the four primaries, so there is no empty choice to
              offer — it must be chosen. An enquiry may sit in no state, so "no state" is a real
              choice for it. */}
          {card.kind === 'car' ? null : <option value="">No state — sits in none</option>}
          {card.kind === 'car' && stateId === '' ? <option value="">Choose a state…</option> : null}
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {stateGone ? (
          <span className="miss">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            The file named “{card.stateLabel}”, which is gone — choose one.
          </span>
        ) : null}
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="drop">
          <input
            type="file"
            className="dropinput"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading || pending}
            onChange={(e) => {
              const files = e.target.files;
              if (files) void addFiles(files);
              e.target.value = '';
            }}
          />
          <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
          {uploading
            ? 'Uploading…'
            : `Add the pictures the file cannot carry — first one is the cover. Up to ${megabytes(PHOTO_MAX_BYTES)} each.`}
        </label>
        {images.length > 0 ? (
          <div className="thumbs">
            {images.map((p, i) => (
              <div className="th" key={p.assetId}>
                <Photo src={p.url} alt={`Photo ${i + 1}`} />
                {i === 0 ? <span className="cov">Cover</span> : null}
                <span className="mk">
                  {i > 0 ? (
                    <button
                      type="button"
                      title="Make cover"
                      aria-label="Make cover"
                      disabled={pending}
                      onClick={() => makeCover(p.assetId)}
                    >
                      <i className="fa-solid fa-star" aria-hidden="true" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rm"
                    title="Remove photo"
                    aria-label="Remove photo"
                    disabled={pending}
                    onClick={() => dropImage(p.assetId)}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="hint bad" role="alert">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      ) : null}

      <div className="dfoot">
        {card.editHref ? (
          <a className="btn gh" href={card.editHref}>
            <i className="fa-solid fa-pen" aria-hidden="true" />
            Edit
          </a>
        ) : null}
        <button type="button" className="btn" onClick={save} disabled={pending || uploading}>
          <i className="fa-solid fa-check" aria-hidden="true" />
          {pending ? 'Saving…' : `Save as a ${words.one}`}
        </button>
        <button
          type="button"
          className="btn gh"
          onClick={() => setDelOpen(true)}
          disabled={pending || uploading}
        >
          <i className="fa-solid fa-trash-can" aria-hidden="true" />
          Delete
        </button>
        <span className="sp" />
        <span className="hint">
          {card.kind === 'car'
            ? 'Saving mints the next TS-#### and computes the change-check.'
            : 'Saving records the enquiry; no TS-#### is spent on an enquiry.'}
        </span>
      </div>

      <Dialog open={delOpen} onClose={() => setDelOpen(false)} label="Delete this draft?">
        <div className="mdl">
          <button type="button" className="mx" aria-label="Close" onClick={() => setDelOpen(false)}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
          <h2>Delete this draft?</h2>
          <p className="ms">
            It was read from the uploaded file and has not become a record. Deleting it creates
            nothing and spends no code; the file it came from is left where the owner’s own cleanup
            finds it.
          </p>
          <div className="mrow">
            {/* The safe way out comes first; the draft is the one deletion that cannot be undone
                (owner's ruling 2026-10-17), so its action carries the permanent words. */}
            <button
              type="button"
              className="btn gh"
              onClick={() => setDelOpen(false)}
              disabled={pending}
            >
              Keep it
            </button>
            <button type="button" className="btn" onClick={remove} disabled={pending}>
              <i className="fa-solid fa-trash-can" aria-hidden="true" />
              {pending ? 'Removing…' : 'Remove for good'}
            </button>
          </div>
        </div>
      </Dialog>
    </article>
  );
}
