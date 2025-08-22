-- Fix critical security vulnerability in password_reset_otps table
-- The current policy allows public read access to all OTP codes and emails

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can verify their own OTP" ON password_reset_otps;

-- Create a secure policy that only allows the service role to access OTP records
-- Since OTP verification is handled entirely by edge functions using service role,
-- regular users should not have direct access to this sensitive table
CREATE POLICY "Service role only access for OTP operations"
ON password_reset_otps
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Ensure RLS is enabled (should already be enabled but let's be explicit)
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;