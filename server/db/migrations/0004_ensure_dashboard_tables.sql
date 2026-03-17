-- Migration 0004: Ensure dashboard tables exist on databases that predate dashboard schema.

DO $$ BEGIN
  CREATE TYPE public.dashboard_task_status AS ENUM ('todo', 'progress', 'done', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.dashboard_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  date text NOT NULL,
  status public.dashboard_task_status NOT NULL DEFAULT 'todo',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dashboard_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  date text NOT NULL,
  icon text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dashboard_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dashboard_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  timestamp text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dashboard_tasks_user_status_idx
  ON public.dashboard_tasks (user_id, status);
CREATE INDEX IF NOT EXISTS dashboard_tasks_user_position_idx
  ON public.dashboard_tasks (user_id, position);
CREATE INDEX IF NOT EXISTS dashboard_deliverables_user_date_idx
  ON public.dashboard_deliverables (user_id, date);
CREATE INDEX IF NOT EXISTS dashboard_notes_user_created_idx
  ON public.dashboard_notes (user_id, created_at);
CREATE INDEX IF NOT EXISTS dashboard_action_log_user_created_idx
  ON public.dashboard_action_log (user_id, created_at);
CREATE INDEX IF NOT EXISTS dashboard_action_log_expires_idx
  ON public.dashboard_action_log (expires_at)
  WHERE expires_at IS NOT NULL;
