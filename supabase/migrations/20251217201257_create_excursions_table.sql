/*
  # Create excursions table

  1. New Tables
    - `excursions`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key to auth.users) - Excursion owner
      - `title` (text) - Excursion name
      - `description` (text, nullable) - Detailed description of route and benefits
      - `route_data` (jsonb) - GeoJSON or structured waypoint data with steps and location
      - `duration_minutes` (integer, nullable) - Expected duration in minutes
      - `distance_km` (numeric, nullable) - Total distance in kilometers
      - `difficulty` (text, nullable) - Difficulty level (easy, moderate, challenging)
      - `created_at` (timestamptz) - When route was generated
      - `completed_at` (timestamptz, nullable) - When user completed the excursion

  2. Security
    - Enable RLS on `excursions` table
    - Add policies for authenticated users to:
      - SELECT their own excursions
      - INSERT their own excursions
      - UPDATE their own excursions
      - DELETE their own excursions
*/

CREATE TABLE IF NOT EXISTS excursions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  route_data jsonb NOT NULL,
  duration_minutes integer,
  distance_km numeric,
  difficulty text,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_excursions_user_id ON excursions(user_id);

-- Enable Row Level Security
ALTER TABLE excursions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own excursions
CREATE POLICY "Users can view own excursions"
  ON excursions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own excursions
CREATE POLICY "Users can create own excursions"
  ON excursions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own excursions
CREATE POLICY "Users can update own excursions"
  ON excursions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own excursions
CREATE POLICY "Users can delete own excursions"
  ON excursions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);