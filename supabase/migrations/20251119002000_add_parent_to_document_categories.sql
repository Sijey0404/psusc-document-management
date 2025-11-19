-- Allow nested folders by referencing parent categories
ALTER TABLE public.document_categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.document_categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS document_categories_parent_id_idx
  ON public.document_categories(parent_id);

