-- Add employee_id column to pending_users table
ALTER TABLE public.pending_users 
ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- Add constraint to ensure employee_id is exactly 8 characters when provided
ALTER TABLE public.pending_users
ADD CONSTRAINT pending_users_employee_id_length CHECK (
  employee_id IS NULL OR LENGTH(TRIM(employee_id)) = 8
);

-- Create index for employee_id lookups
CREATE INDEX IF NOT EXISTS idx_pending_users_employee_id ON public.pending_users(employee_id);

-- Add unique constraint to prevent duplicate employee IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_users_employee_id_unique 
ON public.pending_users(employee_id) 
WHERE employee_id IS NOT NULL;

