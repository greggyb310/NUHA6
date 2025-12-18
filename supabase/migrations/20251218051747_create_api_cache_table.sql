/*
  # Create API Cache Table for Performance

  1. New Tables
    - `api_cache`
      - `cache_key` (text, primary key) - Unique cache key (e.g., "weather:37.77:-122.42")
      - `value` (jsonb) - Cached response data
      - `expires_at` (timestamptz) - Expiration timestamp
      - `created_at` (timestamptz) - Cache entry creation time

  2. Security
    - Enable RLS on api_cache table
    - Allow authenticated users to read cache
    - Only service role can write/delete cache (via Edge Functions)

  3. Performance
    - Primary key on cache_key for fast lookups
    - Index on expires_at for efficient cleanup
    - Automatic cleanup of expired entries via scheduled job (future enhancement)

  4. Usage
    - Weather API: TTL 10-15 minutes, key pattern: "weather:{lat}:{lng}"
    - Nearby places: TTL 6 hours, key pattern: "places:{lat}:{lng}:{radius}"
*/

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache"
  ON api_cache FOR SELECT
  TO authenticated, anon
  USING (expires_at > now());

CREATE POLICY "Service role can insert cache"
  ON api_cache FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update cache"
  ON api_cache FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete cache"
  ON api_cache FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache(expires_at);
