/*
  # Create Nature Spots Table for Location Caching

  1. New Tables
    - `nature_spots`
      - `id` (uuid, primary key) - Unique identifier
      - `osm_id` (text, unique) - OpenStreetMap ID for deduplication
      - `name` (text) - Place name
      - `latitude` (numeric) - Latitude coordinate
      - `longitude` (numeric) - Longitude coordinate
      - `type` (text) - Place type (park, trail, beach, etc.)
      - `tags` (jsonb) - Additional metadata from OSM
      - `distance_cache` (numeric, nullable) - Cached distance from last query
      - `created_at` (timestamptz) - First discovered timestamp
      - `updated_at` (timestamptz) - Last verified timestamp

    - `user_favorite_spots`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key to auth.users) - User who favorited
      - `spot_id` (uuid, foreign key to nature_spots) - Favorited spot
      - `notes` (text, nullable) - User's personal notes about the spot
      - `created_at` (timestamptz) - When favorited

  2. Security
    - Enable RLS on both tables
    - nature_spots is publicly readable (nature data is public)
    - Only authenticated users can favorite spots
    - Users can only manage their own favorites

  3. Indexes
    - osm_id for fast lookups
    - Spatial index on coordinates for proximity searches
    - user_id on favorites for user's favorite list
*/

-- Create nature_spots table
CREATE TABLE IF NOT EXISTS nature_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id text UNIQUE NOT NULL,
  name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  type text NOT NULL,
  tags jsonb DEFAULT '{}',
  distance_cache numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_favorite_spots table
CREATE TABLE IF NOT EXISTS user_favorite_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  spot_id uuid REFERENCES nature_spots(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, spot_id)
);

-- Enable RLS
ALTER TABLE nature_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_spots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nature_spots (publicly readable)
CREATE POLICY "Anyone can view nature spots"
  ON nature_spots FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert nature spots"
  ON nature_spots FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update nature spots"
  ON nature_spots FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_favorite_spots
CREATE POLICY "Users can view own favorites"
  ON user_favorite_spots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON user_favorite_spots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
  ON user_favorite_spots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON user_favorite_spots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nature_spots_osm_id ON nature_spots(osm_id);
CREATE INDEX IF NOT EXISTS idx_nature_spots_coordinates ON nature_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_nature_spots_type ON nature_spots(type);
CREATE INDEX IF NOT EXISTS idx_user_favorite_spots_user_id ON user_favorite_spots(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_spots_spot_id ON user_favorite_spots(spot_id);
