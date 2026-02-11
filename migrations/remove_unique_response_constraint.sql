-- Migration: Remove unique constraint on responses table
-- This allows participants to submit multiple responses per activity
-- based on the max_responses_per_participant setting

-- Find and drop the unique constraint on (activity_id, participant_id)
-- The constraint name may vary, so we use a dynamic approach

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'responses'
      AND tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.responses DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No unique constraint found on responses table';
    END IF;
END $$;
