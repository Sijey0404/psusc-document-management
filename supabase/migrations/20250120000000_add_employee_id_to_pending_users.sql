-- Add employee_id column to pending_users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pending_users' 
    AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE public.pending_users 
    ADD COLUMN employee_id TEXT;
  END IF;
END $$;

-- Drop constraint if it exists to avoid errors on re-run
ALTER TABLE public.pending_users
DROP CONSTRAINT IF EXISTS pending_users_employee_id_length;

-- Add constraint to ensure employee_id is exactly 8 characters when provided
ALTER TABLE public.pending_users
ADD CONSTRAINT pending_users_employee_id_length CHECK (
  employee_id IS NULL OR LENGTH(TRIM(employee_id)) = 8
);

-- Drop indexes if they exist to avoid errors on re-run
DROP INDEX IF EXISTS idx_pending_users_employee_id;
DROP INDEX IF EXISTS idx_pending_users_employee_id_unique;

-- Create index for employee_id lookups
CREATE INDEX idx_pending_users_employee_id ON public.pending_users(employee_id);

-- Add unique constraint to prevent duplicate employee IDs
CREATE UNIQUE INDEX idx_pending_users_employee_id_unique 
ON public.pending_users(employee_id) 
WHERE employee_id IS NOT NULL;

