-- Migration: Fix RLS policy for responses table to allow participant inserts
-- This ensures participants can submit responses without authentication

-- Drop existing INSERT policies on responses
DROP POLICY IF EXISTS "Participants can insert their responses" ON responses;
DROP POLICY IF EXISTS "Anyone can insert responses" ON responses;

-- Create a permissive INSERT policy that allows anyone to insert responses
-- This is necessary because participants are not authenticated Supabase users
-- They only have a participant_id stored in sessionStorage
CREATE POLICY "Allow anonymous response submission" ON responses
  FOR INSERT
  WITH CHECK (true);

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'responses' 
    AND policyname = 'Allow anonymous response submission'
  ) THEN
    RAISE NOTICE 'Policy "Allow anonymous response submission" created successfully';
  ELSE
    RAISE WARNING 'Policy creation may have failed';
  END IF;
END $$;
