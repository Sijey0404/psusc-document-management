-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.password_reset_otps 
  WHERE expires_at < now();
END;
$$;