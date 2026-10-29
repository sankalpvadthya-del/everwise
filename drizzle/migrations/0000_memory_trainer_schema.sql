CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  academic_level text,
  subjects text[] NOT NULL DEFAULT '{}',
  learning_goals text,
  daily_study_goal integer NOT NULL DEFAULT 30 CHECK (daily_study_goal BETWEEN 5 AND 600),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  subject text NOT NULL DEFAULT 'General',
  description text,
  source_text text CHECK (source_text IS NULL OR char_length(source_text) <= 60000),
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation jsonb,
  exam_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.topics(user_id);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('mcq','short_answer','definition','conceptual','application','fill_blank')),
  difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  expected_answer text NOT NULL,
  options jsonb,
  explanation text,
  concept_tag text,
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.questions(topic_id);

CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  session_type text NOT NULL DEFAULT 'recall' CHECK (session_type IN ('recall','revision','targeted','diagnostic')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  question_ids uuid[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_seconds integer,
  total_questions integer NOT NULL DEFAULT 0,
  score numeric,
  maximum_score numeric
);
CREATE INDEX ON public.study_sessions(user_id, started_at DESC);

CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  session_id uuid NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  submitted_answer text,
  evaluation_status text NOT NULL CHECK (evaluation_status IN ('correct','partial','incorrect','skipped','unable')),
  awarded_points numeric NOT NULL DEFAULT 0 CHECK (awarded_points IN (0,0.5,1)),
  confidence_level text CHECK (confidence_level IN ('guessing','somewhat','very')),
  evaluation_feedback text,
  answered_at timestamptz NOT NULL DEFAULT now(),
  response_duration_seconds integer,
  UNIQUE (session_id, question_id)
);
CREATE INDEX ON public.answers(user_id);

CREATE TABLE public.revision_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  planned_for date NOT NULL,
  planned_duration_minutes integer NOT NULL DEFAULT 15 CHECK (planned_duration_minutes BETWEEN 5 AND 240),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','snoozed','skipped')),
  reason text,
  is_manual boolean NOT NULL DEFAULT false,
  session_id uuid REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.revision_tasks(user_id, planned_for);

CREATE TABLE public.memory_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  elapsed_time_since_study integer NOT NULL DEFAULT 0,
  recall_score numeric NOT NULL CHECK (recall_score BETWEEN 0 AND 100),
  confidence_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  observation_type text NOT NULL DEFAULT 'recall'
);
CREATE INDEX ON public.memory_observations(user_id, topic_id, observed_at);

CREATE TABLE public.weak_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  concept_tag text NOT NULL,
  diagnostic_category text NOT NULL DEFAULT 'recurring_error',
  evidence_summary text,
  occurrence_count integer NOT NULL DEFAULT 1,
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','improving','resolved')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id, concept_tag)
);

CREATE TABLE public.revision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  revision_task_id uuid REFERENCES public.revision_tasks(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  outcome_summary text
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['topics','questions','study_sessions','answers','revision_tasks','memory_observations','weak_spots','revision_history'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own rows" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;