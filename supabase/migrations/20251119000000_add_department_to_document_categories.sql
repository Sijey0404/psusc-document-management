-- Add department_id column to document_categories to scope folders per department
ALTER TABLE public.document_categories
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS document_categories_department_id_idx
  ON public.document_categories(department_id);

