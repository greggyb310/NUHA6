/*
  # Add Apple Health tracking support

  1. New Table
    - `health_data_sync`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `metric_type` (text) - Type of health metric (steps, distance, calories, heart_rate, mindful_minutes, workout)
      - `value` (numeric) - Metric value
      - `unit` (text) - Unit of measurement (steps, meters, kcal, bpm, minutes)
      - `recorded_at` (timestamptz) - When the metric was recorded
      - `synced_at` (timestamptz) - When it was synced to our database
      - `source` (text, default 'apple_health') - Data source
      - `metadata` (jsonb, nullable) - Additional data (workout type, route data, etc.)
      - `created_at` (timestamptz, default now())

  2. Changes to user_profiles
    - Add `apple_health_enabled` (boolean, default false)
    - Add `apple_health_connected_at` (timestamptz, nullable)
    - Add `last_health_sync_at` (timestamptz, nullable)

  3. Security
    - Enable RLS on `health_data_sync` table
    - Add policies for users to read/write their own health data only
    
  4. Indexes
    - Index on `user_id` and `recorded_at` for efficient queries
    - Index on `metric_type` for filtering by type
*/

CREATE TABLE IF NOT EXISTS health_data_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  recorded_at timestamptz NOT NULL,
  synced_at timestamptz DEFAULT now(),
  source text DEFAULT 'apple_health',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE health_data_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own health data"
  ON health_data_sync FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health data"
  ON health_data_sync FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health data"
  ON health_data_sync FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health data"
  ON health_data_sync FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_data_sync_user_recorded 
  ON health_data_sync(user_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_data_sync_metric_type 
  ON health_data_sync(metric_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'apple_health_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN apple_health_enabled boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'apple_health_connected_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN apple_health_connected_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_health_sync_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_health_sync_at timestamptz;
  END IF;
END $$;