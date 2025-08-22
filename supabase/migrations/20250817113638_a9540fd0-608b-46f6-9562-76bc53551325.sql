-- Add archived column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Update RLS policies to handle archived users
CREATE POLICY "Admins can view archived profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (get_user_role(auth.uid()) = true)
);

-- Create index for better performance when filtering by archived status
CREATE INDEX idx_profiles_archived ON public.profiles(archived);