-- 0004 — enquiries and the imported PDF (data-model plan §2, §8.4)

-- F1: the file is kept and linked, deletable by the owner (soft delete).
CREATE TABLE enquiry_pdf (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path        text NOT NULL,
  filename    text NOT NULL,
  rows_total  int NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- The only place a customer's name and number live (office-only PII).
CREATE TABLE enquiry (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  number           text NOT NULL,
  car_ref          text,                 -- joins by ref, outlives the car
  note             text,
  enquiry_state_id uuid REFERENCES enquiry_state (id) ON DELETE RESTRICT,
  pdf_import_id    uuid REFERENCES enquiry_pdf (id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
