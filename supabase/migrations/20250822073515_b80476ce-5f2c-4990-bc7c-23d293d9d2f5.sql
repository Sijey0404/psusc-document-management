-- Create table to store OTP codes temporarily
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to verify their own OTP
CREATE POLICY "Users can verify their own OTP" 
ON public.password_reset_otps 
FOR SELECT 
USING (true);

-- Create index for cleanup
CREATE INDEX idx_password_reset_otps_expires_at ON public.password_reset_otps(expires_at);

-- Function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_otps 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;