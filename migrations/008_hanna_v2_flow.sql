-- Additive V2 evidence. Published V1 attempts/results retain their original rules.
CREATE TABLE hanna_attempt_gates (
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  gate_id text NOT NULL,
  prefix_hash text NOT NULL,
  available_at timestamptz NOT NULL,
  checkpoint_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id,gate_id)
);
CREATE TABLE hanna_training_mastery (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope_key text NOT NULL,
  item_id text NOT NULL,
  evidence jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,scope_key,item_id)
);
