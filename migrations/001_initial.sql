CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  username varchar(64) NOT NULL,
  username_key varchar(64) NOT NULL UNIQUE,
  display_name varchar(120) NOT NULL,
  role varchar(16) NOT NULL CHECK (role IN ('teacher', 'student')),
  active boolean NOT NULL DEFAULT true,
  owner boolean NOT NULL DEFAULT false,
  password_hash text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT owner OR role = 'teacher')
);

CREATE UNIQUE INDEX IF NOT EXISTS users_single_owner ON users (owner) WHERE owner;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token varchar(128) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS activation_tokens (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activation_tokens_user_id ON activation_tokens(user_id);

CREATE TABLE IF NOT EXISTS student_groups (
  id uuid PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_groups_teacher_id ON student_groups(teacher_id);

CREATE TABLE IF NOT EXISTS group_students (
  group_id uuid NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(group_id, student_id)
);
CREATE INDEX IF NOT EXISTS group_students_student_id ON group_students(student_id);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(120) NOT NULL,
  instructions text,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignments_teacher_id ON assignments(teacher_id);

CREATE TABLE IF NOT EXISTS assignment_students (
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(assignment_id, student_id)
);
CREATE INDEX IF NOT EXISTS assignment_students_student_id ON assignment_students(student_id);

CREATE TABLE IF NOT EXISTS assignment_steps (
  id uuid PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  game_id varchar(64) NOT NULL,
  settings jsonb NOT NULL,
  repetitions integer NOT NULL CHECK (repetitions BETWEEN 1 AND 10),
  UNIQUE(assignment_id, position)
);
CREATE INDEX IF NOT EXISTS assignment_steps_assignment_id ON assignment_steps(assignment_id);

CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id varchar(64) NOT NULL,
  settings jsonb NOT NULL,
  seed bigint NOT NULL CHECK (seed >= 0 AND seed <= 4294967295),
  assignment_step_id uuid REFERENCES assignment_steps(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
CREATE INDEX IF NOT EXISTS attempts_student_id ON attempts(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS attempts_one_pending_step
  ON attempts(student_id, assignment_step_id)
  WHERE assignment_step_id IS NOT NULL AND submitted_at IS NULL;

CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY,
  attempt_id uuid NOT NULL UNIQUE REFERENCES attempts(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES assignments(id) ON DELETE SET NULL,
  assignment_step_id uuid REFERENCES assignment_steps(id) ON DELETE SET NULL,
  game_id varchar(64) NOT NULL,
  settings jsonb NOT NULL,
  answer jsonb NOT NULL,
  answer_hash char(64) NOT NULL,
  correct integer NOT NULL CHECK (correct >= 0),
  total integer NOT NULL CHECK (total > 0 AND correct <= total),
  percent integer NOT NULL CHECK (percent BETWEEN 0 AND 100),
  summary text NOT NULL,
  details jsonb NOT NULL,
  duration integer NOT NULL CHECK (duration >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS results_student_id_created ON results(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS results_assignment_id ON results(assignment_id);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope varchar(64) NOT NULL,
  key varchar(200) NOT NULL,
  request_hash char(64) NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(teacher_id, scope, key)
);
