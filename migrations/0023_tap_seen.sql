-- The office's tap "seen" watermark (owner ruling, 2026-10-16): the newest tap the office has looked
-- at. The badge's figure is "taps newer than this" — it clears when the taps list is viewed and climbs
-- again as new taps land, so the notice behaves like a notification rather than an all-time count.
--
-- One row, ever: the office is single-owner, so `id` is a fixed `true` and a plain upsert always hits
-- the same row (`CHECK (id)` keeps it single). It holds no personal data — a timestamp, and nothing
-- else. `seen_through` is NULL until the office first looks, which reads as "everything is new".
CREATE TABLE tap_seen (
  id           boolean PRIMARY KEY DEFAULT true,
  seen_through timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tap_seen_one_row CHECK (id)
);
