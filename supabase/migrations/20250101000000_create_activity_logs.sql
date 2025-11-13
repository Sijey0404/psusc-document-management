-- Create activity_logs table to track user activities
-- Note: This migration matches the schema created in Supabase
-- The table references auth.users, not profiles
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  details TEXT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs USING btree (action) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs USING btree (entity_type) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own logs
CREATE POLICY "Users can view their own logs"
ON public.activity_logs
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all logs
CREATE POLICY "Admins can view all logs"
ON public.activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = true
  )
);

-- RLS Policy: Authenticated users can insert logs
CREATE POLICY "Authenticated users can insert logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

