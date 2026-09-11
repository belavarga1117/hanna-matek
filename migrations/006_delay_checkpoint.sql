-- Bind picture-place delay timing to a completed immediate-recall checkpoint.
ALTER TABLE attempts
  ADD COLUMN delay_checkpoint_at timestamptz,
  ADD COLUMN delay_checkpoint_hash char(64);
