/*
  # Add Indexes for Foreign Key Columns

  This migration adds indexes on foreign key columns to optimize query performance and foreign key constraint checks.

  ## Changes
  
  1. Add index on `ai_usage_logs.user_id`
     - Foreign key to `auth.users.id`
     - Improves performance for user-based queries and JOIN operations
     - Essential for foreign key constraint checking performance
     
  2. Add index on `user_favorite_spots.spot_id`
     - Foreign key to `nature_spots.id`
     - Improves performance for spot-based queries and JOIN operations
     - Essential for foreign key constraint checking performance

  ## Performance Impact
  
  - Significantly improves JOIN performance on these tables
  - Reduces time for foreign key constraint validation
  - Essential for queries filtering or joining by these foreign keys
  - Minimal storage overhead with substantial performance gain
  
  ## Important Notes
  
  - These indexes are critical for optimal database performance
  - Foreign key columns should ALWAYS have indexes in production
  - Prevents performance degradation as tables grow
*/

-- Add index for ai_usage_logs foreign key
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id 
ON ai_usage_logs(user_id);

-- Add index for user_favorite_spots foreign key
CREATE INDEX IF NOT EXISTS idx_user_favorite_spots_spot_id 
ON user_favorite_spots(spot_id);