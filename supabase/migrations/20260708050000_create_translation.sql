-- Drop table if exists to prevent "relation already exists" errors when running queries multiple times
DROP TABLE IF EXISTS public.translation_logs CASCADE;

-- Create translation_logs table
CREATE TABLE public.translation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.translation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can select own translation logs"
  ON public.translation_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own translation logs"
  ON public.translation_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own translation logs"
  ON public.translation_logs
  FOR DELETE
  USING (auth.uid() = user_id);
