-- 0022 — the draft table: the holding place an uploaded file lands in.
--
-- TASK-004 task.md truth 9 (design D16, owner ruling 2026-10-14: an upload "is saved in neo as
-- draft, not real data"). Forward-only.
--
-- D16 in one line: **one new table** (D13 promised exactly one), and a draft holds the record's
-- editable fields — a car's fourteen, or an enquiry's five — plus the file it came from and the
-- images the owner puts on by hand. Nothing enters `car` or `enquiry` until he saves it, so the
-- boards, the counts, the section lists and the showroom need no filter to keep a draft out: they
-- never see one.
--
-- What this table deliberately does NOT carry, and why each absence is the point:
--
--   * no `ref`, no `TS-####` — the code is given once and never reused, so it is given at the
--     **save**, never at the upload. A draft that took a code and was abandoned would burn that
--     number for good; this one consumes nothing and disturbs no sequence (truth 9).
--   * no `content_hash` and no `hash_version` — the change-check is a fact about a *record*,
--     computed from the values that are stored. A draft has not been stored as anything yet.
--   * no `state_id` — a draft **sits in no state and occupies none**, so a waiting draft can never
--     block a state's deletion. It holds the state its file named as `state_label`: a **name**,
--     applied at the save, and if that state is gone by then the owner is asked to choose
--     (truth 9, D15, task.md line 316).
--   * no images table — the images live on the draft's own row, because D13 promised one new table
--     and a draft is not a record (D16). `image_asset_ids` is an **ordered** list: index 0 is the
--     cover. It arrives empty, because a template carries values and not pictures.
--   * no `deleted_at` — a draft waits for the owner, and no job, rule or clock removes it, so there
--     is nothing to tombstone (truth 9).
--
-- Two things the columns are chosen to make impossible rather than merely to discourage:
--
--   * `kind` is one of the two kinds of record a file can produce, and nothing else;
--   * `state_label` **cannot hold a state id**. The column's own words are "a name, never a state
--     id", so the store enforces the "never" (`draft_state_label_is_a_name`) rather than trusting
--     whoever writes the row to remember. A state id is a uuid; a state's name is not.
--
-- The draft is written *before* the record and read back by the review page, so `batch_id` — the
-- one thing shared by every draft from one file — is the one thing worth an index: the upload
-- writes a batch and the review reads it as a batch. Nothing else here is queried by.

CREATE TABLE draft (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  kind            text NOT NULL CHECK (kind IN ('car', 'enquiry')),

  -- Every draft read from one file shares this, so a batch is written together and saved one at a
  -- time. Not a foreign key: D13 and D16 settle on exactly one new table.
  batch_id        uuid NOT NULL,

  -- The file the draft came from. The name is the owner's own; the reference is the image store's.
  -- Both live only in the database, and neither is ever an address in a public payload
  -- (specs/media: "a reference SHALL never appear in any public payload").
  source_filename text NOT NULL,
  source_asset_id text NOT NULL,

  -- The record's editable fields, exactly what the file carried and nothing inferred, defaulted or
  -- invented (truth 9). No default: what a file carries is the writer's to say, not the store's.
  values          jsonb NOT NULL,

  -- Ordered; index 0 is the cover. Empty at upload, by design: the owner adds images by hand.
  image_asset_ids text[] NOT NULL DEFAULT '{}',

  -- The state the file named, as the owner knows it ("On Order"). Nullable: a file may name none.
  state_label     text,

  is_demo         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT draft_state_label_is_a_name
    CHECK (state_label IS NULL OR state_label !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-')
);

CREATE INDEX draft_batch_id_idx ON draft (batch_id);

ALTER TABLE draft ENABLE ROW LEVEL SECURITY;
