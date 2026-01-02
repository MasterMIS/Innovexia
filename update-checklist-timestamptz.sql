-- Update checklist table columns to use timestamptz for proper timezone handling
-- Run this in Supabase SQL Editor

-- Convert from_date from date to timestamptz
ALTER TABLE public.checklists 
  ALTER COLUMN from_date TYPE timestamptz 
  USING from_date AT TIME ZONE 'Asia/Kolkata';

-- Convert due_date from date to timestamptz
ALTER TABLE public.checklists 
  ALTER COLUMN due_date TYPE timestamptz 
  USING due_date AT TIME ZONE 'Asia/Kolkata';

-- Convert created_at to timestamptz
ALTER TABLE public.checklists 
  ALTER COLUMN created_at TYPE timestamptz 
  USING created_at AT TIME ZONE 'Asia/Kolkata';

-- Convert updated_at to timestamptz
ALTER TABLE public.checklists 
  ALTER COLUMN updated_at TYPE timestamptz 
  USING updated_at AT TIME ZONE 'Asia/Kolkata';

-- Update default values to use NOW() which returns timestamptz
ALTER TABLE public.checklists 
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE public.checklists 
  ALTER COLUMN updated_at SET DEFAULT NOW();
