/*
  # Create inspiration content tables
  
  1. New Tables
    - `inspiration_photos`
      - `id` (uuid, primary key) - Unique identifier
      - `image_url` (text) - Direct URL to photo (Pexels or other)
      - `photographer` (text, nullable) - Photo credit
      - `alt_text` (text, nullable) - Accessibility description
      - `active` (boolean, default true) - Whether to show in rotation
      - `created_at` (timestamptz) - Record creation
    
    - `inspiration_quotes`
      - `id` (uuid, primary key) - Unique identifier
      - `quote_text` (text) - The inspirational quote
      - `author` (text, nullable) - Quote attribution
      - `active` (boolean, default true) - Whether to show in rotation
      - `created_at` (timestamptz) - Record creation
  
  2. Security
    - Enable RLS on both tables
    - Add public read-only policies (anyone can view)
    - Only authenticated users can manage content
  
  3. Notes
    - Photos should use direct Pexels URLs for easy management
    - Quotes are curated nature/wellness themed
    - Easy to add more content via database inserts
*/

-- Create inspiration_photos table
CREATE TABLE IF NOT EXISTS inspiration_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  photographer text,
  alt_text text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create inspiration_quotes table
CREATE TABLE IF NOT EXISTS inspiration_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_text text NOT NULL,
  author text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inspiration_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_quotes ENABLE ROW LEVEL SECURITY;

-- Public read access for active content
CREATE POLICY "Anyone can view active photos"
  ON inspiration_photos
  FOR SELECT
  USING (active = true);

CREATE POLICY "Anyone can view active quotes"
  ON inspiration_quotes
  FOR SELECT
  USING (active = true);

-- Authenticated users can manage content
CREATE POLICY "Authenticated users can insert photos"
  ON inspiration_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update photos"
  ON inspiration_photos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert quotes"
  ON inspiration_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotes"
  ON inspiration_quotes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inspiration_photos_active ON inspiration_photos(active);
CREATE INDEX IF NOT EXISTS idx_inspiration_quotes_active ON inspiration_quotes(active);

-- Seed initial nature photos (Pexels URLs)
INSERT INTO inspiration_photos (image_url, photographer, alt_text) VALUES
  ('https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Pixabay', 'Misty forest path with tall trees'),
  ('https://images.pexels.com/photos/1266810/pexels-photo-1266810.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Simon Berger', 'Mountain lake reflection at sunset'),
  ('https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Johannes Plenio', 'Peaceful meadow with wildflowers'),
  ('https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=1200', 'eberhard grossgasteiger', 'Mountain peaks at golden hour'),
  ('https://images.pexels.com/photos/1694621/pexels-photo-1694621.jpeg?auto=compress&cs=tinysrgb&w=1200', 'eberhard grossgasteiger', 'Serene forest stream with mossy rocks');

-- Seed initial nature quotes
INSERT INTO inspiration_quotes (quote_text, author) VALUES
  ('In every walk with nature, one receives far more than he seeks.', 'John Muir'),
  ('Look deep into nature, and then you will understand everything better.', 'Albert Einstein'),
  ('Nature does not hurry, yet everything is accomplished.', 'Lao Tzu'),
  ('The earth has music for those who listen.', 'William Shakespeare'),
  ('Adopt the pace of nature: her secret is patience.', 'Ralph Waldo Emerson'),
  ('Nature is not a place to visit. It is home.', 'Gary Snyder'),
  ('In nature, nothing is perfect and everything is perfect.', 'Alice Walker'),
  ('The clearest way into the Universe is through a forest wilderness.', 'John Muir');