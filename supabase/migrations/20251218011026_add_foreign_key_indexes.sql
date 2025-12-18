/*
  # Add Indexes on Foreign Keys

  1. Changes
    - Add index on ai_usage_logs.user_id (foreign key column)
    - Add index on user_favorite_spots.spot_id (foreign key column)

  2. Performance Impact
    - Significantly improves JOIN query performance
    - Speeds up foreign key constraint checks
    - Optimizes DELETE CASCADE operations
    - Essential for queries filtering by these foreign key relationships

  3. Security
    - Resolves unindexed foreign key warnings
    - Prevents performance degradation as data grows
    - Ensures efficient query execution for user data access

  4. Notes
    - Foreign key columns should always be indexed for optimal performance
    - These indexes support common query patterns (user-based filtering)
*/

-- Add index on ai_usage_logs.user_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id 
ON public.ai_usage_logs(user_id);

-- Add index on user_favorite_spots.spot_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_user_favorite_spots_spot_id 
ON public.user_favorite_spots(spot_id);
