-- 0006 — indexes and RLS posture (data-model plan §2 D5, §6, §8.7)

CREATE INDEX car_state_id_idx        ON car (state_id);
CREATE INDEX car_not_deleted_idx     ON car (id) WHERE deleted_at IS NULL;
CREATE INDEX cost_line_car_id_idx    ON cost_line (car_id);
CREATE INDEX car_photo_car_id_idx    ON car_photo (car_id);
CREATE INDEX tap_at_desc_idx         ON tap (at DESC);
CREATE INDEX activity_event_at_idx   ON activity_event (at DESC);
CREATE INDEX enquiry_state_id_idx    ON enquiry (enquiry_state_id);
CREATE INDEX auth_attempt_ip_at_idx  ON auth_attempt (ip, at);
CREATE INDEX session_user_id_idx     ON session (user_id);

-- RLS is explicitly NOT the boundary (D2/D5): the allow-list serializer is.
-- Left at its restrictive default for any non-owner role; the app connects as the
-- table owner (server-side only), which bypasses RLS by design. No policies added.
ALTER TABLE office_user    ENABLE ROW LEVEL SECURITY;
ALTER TABLE session        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_attempt   ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE car            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_line      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale           ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_photo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_pdf    ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tap            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting        ENABLE ROW LEVEL SECURITY;
