-- Create cover_letters table
CREATE TABLE IF NOT EXISTS public.cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

-- Policies for cover_letters
CREATE POLICY "Users can select own cover letters"
  ON public.cover_letters
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cover letters"
  ON public.cover_letters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cover letters"
  ON public.cover_letters
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cover letters"
  ON public.cover_letters
  FOR DELETE
  USING (auth.uid() = user_id);

-- Bind updated_at trigger
CREATE TRIGGER set_cover_letters_updated_at
  BEFORE UPDATE ON public.cover_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add premium columns to profiles table if they do not exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
