-- Cognitive assessment and teacher-authored recall metadata.
-- All columns are nullable so existing users, assignments and pending attempts
-- preserve their exact behavior.
ALTER TABLE users
  ADD COLUMN age_years integer CHECK (age_years BETWEEN 4 AND 120);

ALTER TABLE assignment_steps
  ADD COLUMN private_settings jsonb;

ALTER TABLE attempts
  ADD COLUMN private_settings jsonb,
  ADD COLUMN available_at timestamptz;

CREATE INDEX attempts_student_available
  ON attempts(student_id, available_at)
  WHERE submitted_at IS NULL AND available_at IS NOT NULL;
