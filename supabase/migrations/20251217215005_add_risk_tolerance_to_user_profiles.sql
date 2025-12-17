/*
  # Add risk tolerance to user profiles

  1. Changes
    - Add `risk_tolerance` column to `user_profiles` table
      - text, nullable
      - Allowed values: "low", "medium", "high"
      - Indicates user's comfort level with challenging or adventurous activities
  
  2. Security
    - Maintains existing RLS policies
    - Field is optional for flexibility
*/

-- Add risk_tolerance column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'risk_tolerance'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN risk_tolerance text;
  END IF;
END $$;