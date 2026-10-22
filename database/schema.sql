BEGIN;

CREATE TABLE teachers (
  id uuid PRIMARY KEY,
  auth_subject text NOT NULL UNIQUE,
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE materials (
  id uuid PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  title text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('PDF', 'PPTX', 'MARKDOWN')),
  original_filename text,
  extracted_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, teacher_id)
);

CREATE TABLE quizzes (
  id uuid PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  material_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'READY', 'ARCHIVED')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (material_id, teacher_id) REFERENCES materials(id, teacher_id),
  UNIQUE (id, teacher_id),
  CHECK (status <> 'READY' OR reviewed_at IS NOT NULL)
);

CREATE TABLE questions (
  id uuid PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES quizzes(id),
  position integer NOT NULL CHECK (position >= 0),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE quiz_sessions (
  id uuid PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  quiz_id uuid NOT NULL,
  quiz_revision integer NOT NULL CHECK (quiz_revision > 0),
  total_rounds integer NOT NULL CHECK (total_rounds >= 1),
  answer_duration_ms integer NOT NULL DEFAULT 10000 CHECK (answer_duration_ms IN (10000, 60000, 120000, 180000, 300000)),
  status text NOT NULL DEFAULT 'SETUP' CHECK (status IN ('SETUP', 'RUNNING', 'ROUND_RESULTS', 'COMPLETED')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  FOREIGN KEY (quiz_id, teacher_id) REFERENCES quizzes(id, teacher_id),
  CHECK (status = 'SETUP' OR started_at IS NOT NULL),
  CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE TABLE participants (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES quiz_sessions(id),
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  registration_order integer NOT NULL CHECK (registration_order >= 0),
  queue_position integer NOT NULL CHECK (queue_position >= 0),
  UNIQUE (id, session_id),
  UNIQUE (session_id, registration_order),
  UNIQUE (session_id, queue_position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE session_questions (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES quiz_sessions(id),
  source_question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  UNIQUE (id, session_id)
);

CREATE TABLE session_rounds (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES quiz_sessions(id),
  number integer NOT NULL CHECK (number >= 1),
  mode text NOT NULL CHECK (mode IN ('REGULAR', 'FINAL')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED')),
  UNIQUE (id, session_id),
  UNIQUE (session_id, number)
);

CREATE TABLE turns (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES quiz_sessions(id),
  round_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  session_question_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED')),
  attempt_id uuid,
  started_at timestamptz,
  FOREIGN KEY (round_id, session_id) REFERENCES session_rounds(id, session_id),
  FOREIGN KEY (participant_id, session_id) REFERENCES participants(id, session_id),
  FOREIGN KEY (session_question_id, session_id) REFERENCES session_questions(id, session_id),
  UNIQUE (round_id, participant_id),
  CHECK (status = 'PENDING' OR (attempt_id IS NOT NULL AND started_at IS NOT NULL))
);

CREATE UNIQUE INDEX one_active_turn_per_session ON turns(session_id) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX one_running_round_per_session ON session_rounds(session_id) WHERE status = 'RUNNING';
CREATE UNIQUE INDEX one_final_round_per_session ON session_rounds(session_id) WHERE mode = 'FINAL';
CREATE INDEX turns_participant ON turns(participant_id);
CREATE INDEX turns_question ON turns(session_question_id);
CREATE INDEX sessions_teacher ON quiz_sessions(teacher_id, created_at DESC);

CREATE TABLE answers (
  turn_id uuid PRIMARY KEY REFERENCES turns(id),
  selected_answer text CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  points smallint NOT NULL CHECK (points IN (0, 1)),
  ended_by text NOT NULL CHECK (ended_by IN ('MAIN_TIMER', 'LOCK_TIMER')),
  elapsed_ms integer NOT NULL CHECK (elapsed_ms >= 0),
  answered_at timestamptz NOT NULL DEFAULT now(),
  CHECK (selected_answer IS NOT NULL OR points = 0),
  CHECK (ended_by <> 'LOCK_TIMER' OR selected_answer IS NOT NULL)
);

COMMIT;
