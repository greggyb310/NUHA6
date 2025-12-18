/*
  # Fix Phase Constraint - Add 'excursion_planning' Phase

  1. Problem
    - The phase CHECK constraint was missing 'excursion_planning' value
    - This caused phase transitions to fail silently when users requested excursions
    - Result: AI remained in health_coach mode instead of switching to excursion planning

  2. Changes
    - Drop the existing CHECK constraint on chat_sessions.phase column
    - Add new CHECK constraint with all 5 valid phases:
      - 'initial_chat' (default)
      - 'excursion_planning' (NEW - was missing)
      - 'excursion_creation'
      - 'excursion_guiding'
      - 'post_excursion_followup'

  3. Impact
    - Fixes chatbot not responding to excursion requests properly
    - Enables proper phase-aware AI responses
*/

-- Drop existing constraint and add corrected one
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'chat_sessions'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%phase%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE chat_sessions DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE chat_sessions 
  ADD CONSTRAINT chat_sessions_phase_check 
  CHECK (phase IN ('initial_chat', 'excursion_planning', 'excursion_creation', 'excursion_guiding', 'post_excursion_followup'));
END $$;