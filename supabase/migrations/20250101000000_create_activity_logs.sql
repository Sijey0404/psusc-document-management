-- Create activity_logs table to track user activities
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);

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

-- RLS Policy: System can insert logs (via service role or authenticated users)
CREATE POLICY "Authenticated users can insert logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to automatically log activities
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action VARCHAR(255),
  p_entity_type VARCHAR(100),
  p_entity_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_description,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

