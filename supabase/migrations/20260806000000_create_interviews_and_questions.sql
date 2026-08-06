-- SQL Migration Script for JobTrack: Create interviews and questions tables
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create interviews table
CREATE TABLE IF NOT EXISTS public.interviews (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id TEXT,
  company TEXT NOT NULL,
  job_title TEXT,
  round_type TEXT NOT NULL,
  interview_date TEXT,
  interviewer_name TEXT,
  location_or_url TEXT,
  notes TEXT,
  outcome TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interviews" ON public.interviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own interviews" ON public.interviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own interviews" ON public.interviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own interviews" ON public.interviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS interviews_user_id_idx ON public.interviews (user_id);

-- 2. Create standalone questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_id TEXT,
  question TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'theoretical',
  language TEXT NOT NULL,
  sub_language TEXT,
  difficulty TEXT,
  company TEXT,
  job_title TEXT,
  round_type TEXT,
  asked_count INT DEFAULT 1,
  answer TEXT,
  code_snippet TEXT,
  notes TEXT,
  options JSONB,
  correct_option_index INT,
  date_added TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own questions" ON public.questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own questions" ON public.questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own questions" ON public.questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS questions_user_id_idx ON public.questions (user_id);
