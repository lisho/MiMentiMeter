-- ============================================================================
-- MIGRATION: Fix Multiple Responses Feature (CORRECTED)
-- ============================================================================
-- 1. Removes unique constraint
-- 2. Fixes RLS for INSERT (Anonymous submission)
-- 3. Fixes RLS for SELECT (Participants can count their own responses)
-- ============================================================================

-- STEP 1: Remove unique constraint
DO $$
DECLARE
    curr_constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO curr_constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'responses'
      AND tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public';
    
    IF curr_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.responses DROP CONSTRAINT %I', curr_constraint_name);
        RAISE NOTICE '✓ Dropped unique constraint: %', curr_constraint_name;
    ELSE
        RAISE NOTICE '✓ No unique constraint found';
    END IF;
END $$;

-- STEP 2: Fix RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Participants can insert their responses" ON responses;
DROP POLICY IF EXISTS "Anyone can insert responses" ON responses;
DROP POLICY IF EXISTS "Allow anonymous response submission" ON responses;
DROP POLICY IF EXISTS "Participants can view their own responses" ON responses;
DROP POLICY IF EXISTS "Allow reading responses" ON responses;
DROP POLICY IF EXISTS "Presenters can view responses for their sessions" ON responses;

-- 2a. Allow anyone to INSERT (Anonymous participants)
CREATE POLICY "Allow anonymous response submission" ON responses
  FOR INSERT WITH CHECK (true);

-- 2b. Allow anyone to SELECT (Necessario para que el participante pueda contar sus respuestas
-- y para que el presentador vea los resultados en Realtime sin fricciones)
CREATE POLICY "Allow reading responses" ON responses
  FOR SELECT USING (true);

-- STEP 3: Verification Block
DO $$
DECLARE
    has_unique_constraint boolean;
    has_insert_policy boolean;
    has_select_policy boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'responses' AND tc.constraint_type = 'UNIQUE'
    ) INTO has_unique_constraint;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'responses' AND policyname = 'Allow anonymous response submission'
    ) INTO has_insert_policy;

    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'responses' AND policyname = 'Allow reading responses'
    ) INTO has_select_policy;
    
    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    IF NOT has_unique_constraint THEN RAISE NOTICE '✓ UNIQUE constraint: REMOVED'; ELSE RAISE WARNING '✗ UNIQUE constraint: STILL EXISTS'; END IF;
    IF has_insert_policy THEN RAISE NOTICE '✓ INSERT policy: ACTIVE'; ELSE RAISE WARNING '✗ INSERT policy: MISSING'; END IF;
    IF has_select_policy THEN RAISE NOTICE '✓ SELECT policy: ACTIVE'; ELSE RAISE WARNING '✗ SELECT policy: MISSING'; END IF;
    RAISE NOTICE '==============================';
    
    IF NOT has_unique_constraint AND has_insert_policy AND has_select_policy THEN
        RAISE NOTICE '✓✓✓ MIGRATION COMPLETED SUCCESSFULLY ✓✓✓';
    ELSE
        RAISE WARNING '⚠ Migration completed with issues. Please check policies manually.';
    END IF;
END $$;
