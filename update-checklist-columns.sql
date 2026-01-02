-- Update checklist table to use timestamp instead of date for from_date and due_date
-- This allows storing both date and time

ALTER TABLE public.checklists 
  ALTER COLUMN from_date TYPE timestamp without time zone;

ALTER TABLE public.checklists 
  ALTER COLUMN due_date TYPE timestamp without time zone;

-- Update the indexes (they should work fine with timestamp type too)
-- No need to recreate indexes, they will automatically work with the new type
