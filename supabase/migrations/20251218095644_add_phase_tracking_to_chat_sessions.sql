/*
  # Add Phase Tracking to Chat Sessions

  1. Schema Changes
    - Add `phase` column to chat_sessions
      - Values: 'initial_chat', 'excursion_creation', 'excursion_guiding', 'post_excursion_followup'
      - Default: 'initial_chat'
    - Add `conversation_metadata` JSONB column
      - Stores extracted info: duration, location preference, activities, etc.
    - Add `excursion_id` column (nullable)
      - Links session to active excursion during guiding phase

  2. Purpose
    - Enable phase-aware AI responses
    - Track what information has been collected
    - Maintain context across conversation stages
    - Support proper handoffs between phases
*/

-- Add phase tracking column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'phase'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN phase text NOT NULL DEFAULT 'initial_chat'
      CHECK (phase IN ('initial_chat', 'excursion_creation', 'excursion_guiding', 'post_excursion_followup'));
  END IF;
END $$;

-- Add conversation metadata column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'conversation_metadata'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN conversation_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add excursion link column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'excursion_id'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN excursion_id uuid REFERENCES excursions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for excursion lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_excursion_id ON chat_sessions(excursion_id);

-- Create index for phase lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_phase ON chat_sessions(phase);