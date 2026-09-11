-- N-back keeps its source-compatible per-channel score and adaptive transition.
-- Existing rows remain byte-for-byte unchanged; NULL means no N-back metrics.
ALTER TABLE results ADD COLUMN metrics jsonb;
