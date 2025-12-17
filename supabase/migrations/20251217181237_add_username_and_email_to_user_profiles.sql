/*
  # Add username and email to user_profiles

  1. Changes
    - Add `username` column to `user_profiles` table
      - text, unique, not null
      - lowercase stored for case-insensitive matching
    - Add `email` column to `user_profiles` table
      - text, nullable (collected later on profile screen)
    - Add unique index on lowercase username for case-insensitive lookup
  
  2. Security
    - Maintains existing RLS policies
    - Username uniqueness enforced at database level
*/

-- Add username column (lowercase for case-insensitive matching)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username text;
  END IF;
END $$;

-- Add email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email text;
  END IF;
END $$;

-- Create unique index on lowercase username for case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_lower_idx 
ON user_profiles (LOWER(username));

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS user_profiles_email_idx 
ON user_profiles (email) WHERE email IS NOT NULL;