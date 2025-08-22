-- Create account recovery requests table to track recovery attempts
CREATE TABLE IF NOT EXISTS public.account_recovery_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    otp_code text NOT NULL,
    status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'USED')),
    requested_at timestamp with time zone DEFAULT now(),
    handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    handled_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.account_recovery_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for account recovery requests
CREATE POLICY "Admins can view all recovery requests" 
ON public.account_recovery_requests 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = true
    )
);

CREATE POLICY "Admins can update recovery requests" 
ON public.account_recovery_requests 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = true
    )
);

CREATE POLICY "System can insert recovery requests" 
ON public.account_recovery_requests 
FOR INSERT 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_account_recovery_requests_updated_at
    BEFORE UPDATE ON public.account_recovery_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_set_updated_at();