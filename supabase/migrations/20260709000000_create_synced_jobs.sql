CREATE TABLE public.synced_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    linkedin_job_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    link TEXT NOT NULL,
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    match_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_linkedin_job UNIQUE (user_id, linkedin_job_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.synced_jobs ENABLE ROW LEVEL SECURITY;

-- Select Policy
CREATE POLICY "Users can view their own synced jobs"
ON public.synced_jobs
FOR SELECT
USING (auth.uid() = user_id);

-- Insert Policy
CREATE POLICY "Users can insert their own synced jobs"
ON public.synced_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Delete Policy
CREATE POLICY "Users can delete their own synced jobs"
ON public.synced_jobs
FOR DELETE
USING (auth.uid() = user_id);
