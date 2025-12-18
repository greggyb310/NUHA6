/*
  # Add chat session count to user profiles

  1. Changes
    - Add `chat_session_count` column to `user_profiles` table
    - Tracks how many times a user has started a new chat session
    - Used to show onboarding hints for first few sessions

  2. Details
    - Default value is 0 for new users
    - Counter increments each time user opens the chat screen
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'chat_session_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN chat_session_count integer DEFAULT 0;
  END IF;
END $$;
