-- Independent mnemonic tools and per-item spaced recall. Existing game rows are unchanged.
CREATE TABLE hanna_resources (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('palace','peg','major','material')),
  title text NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  data jsonb NOT NULL,
  ready boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hanna_resources_owner ON hanna_resources(user_id, updated_at DESC) WHERE NOT archived;

CREATE TABLE hanna_review_cards (
  id uuid PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES users(id),
  source_result_id uuid NOT NULL REFERENCES results(id),
  source_item_id text NOT NULL,
  source_activity text NOT NULL,
  snapshot jsonb NOT NULL,
  learned_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  due_at timestamptz NOT NULL,
  interval_ms bigint NOT NULL DEFAULT 600000 CHECK (interval_ms > 0),
  review_count integer NOT NULL DEFAULT 0,
  reserved_attempt_id uuid REFERENCES attempts(id),
  UNIQUE (source_result_id, source_item_id)
);
CREATE INDEX hanna_review_due ON hanna_review_cards(student_id, due_at);
CREATE TABLE hanna_review_history (
  card_id uuid NOT NULL REFERENCES hanna_review_cards(id),
  result_id uuid NOT NULL REFERENCES results(id),
  correct boolean NOT NULL,
  rt_ms integer,
  hint_level integer NOT NULL CHECK (hint_level BETWEEN 0 AND 4),
  retention_ms bigint NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, result_id)
);
CREATE TABLE hanna_milestones (
  student_id uuid NOT NULL REFERENCES users(id),
  milestone_id text NOT NULL,
  result_id uuid REFERENCES results(id),
  achieved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, milestone_id)
);
