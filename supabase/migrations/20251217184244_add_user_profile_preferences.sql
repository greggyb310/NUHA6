/*
  # Add user profile preference fields

  1. Changes
    - Add `age` column to `user_profiles` table
      - integer, nullable
    - Add `fitness_level` column to `user_profiles` table
      - text, nullable (e.g., "beginner", "intermediate", "advanced")
    - Add `mobility_level` column to `user_profiles` table
      - text, nullable (e.g., "limited", "moderate", "full")
    - Add `activity_preferences` column to `user_profiles` table
      - text array, nullable (walking, hiking, trail running, road biking, mountain biking, swimming, boating)
    - Add `therapy_preferences` column to `user_profiles` table
      - text array, nullable (meditation, breath work, sensory immersion, forest bathing, nature journaling, reconnect to awe)
  
  2. Security
    - Maintains existing RLS policies
    - All fields are optional for flexibility
*/

-- Add age column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'age'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN age integer;
  END IF;
END $$;

-- Add fitness_level column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'fitness_level'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN fitness_level text;
  END IF;
END $$;

-- Add mobility_level column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'mobility_level'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN mobility_level text;
  END IF;
END $$;

-- Add activity_preferences column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'activity_preferences'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN activity_preferences text[];
  END IF;
END $$;

-- Add therapy_preferences column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'therapy_preferences'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN therapy_preferences text[];
  END IF;
END $$;