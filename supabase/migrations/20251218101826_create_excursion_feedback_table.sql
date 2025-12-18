/*
  # Create Excursion Feedback Table

  1. New Tables
    - `excursion_feedback`
      - `id` (uuid, primary key) - Unique identifier
      - `excursion_id` (uuid, foreign key) - Links to excursions table
      - `user_id` (uuid, foreign key) - Links to auth.users
      - `rating` (integer) - 1-5 star rating
      - `feedback_text` (text, nullable) - Optional written feedback
      - `created_at` (timestamptz) - When feedback was submitted

  2. Security
    - Enable RLS on `excursion_feedback` table
    - Users can INSERT their own feedback
    - Users can SELECT their own feedback
    - No UPDATE or DELETE allowed (preserve feedback integrity)

  3. Indexes
    - Index on excursion_id for aggregating feedback
    - Index on user_id for user feedback history

  4. Constraints
    - Rating must be between 1 and 5
    - Unique constraint on (excursion_id, user_id) to prevent duplicate feedback
*/

CREATE TABLE IF NOT EXISTS excursion_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursion_id uuid NOT NULL REFERENCES excursions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_excursion_feedback UNIQUE (excursion_id, user_id)
);

ALTER TABLE excursion_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
  ON excursion_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON excursion_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_excursion_feedback_excursion_id ON excursion_feedback(excursion_id);
CREATE INDEX IF NOT EXISTS idx_excursion_feedback_user_id ON excursion_feedback(user_id);