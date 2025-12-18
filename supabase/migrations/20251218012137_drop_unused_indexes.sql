/*
  # Drop Unused Indexes

  This migration removes database indexes that are not being used, improving database performance by reducing storage overhead and write operation costs.

  ## Changes
  
  1. Drop unused index `idx_ai_usage_logs_user_id` from `ai_usage_logs` table
     - This index was created for user_id lookups but is not being utilized by queries
     
  2. Drop unused index `idx_user_favorite_spots_spot_id` from `user_favorite_spots` table
     - This index was created for spot_id lookups but is not being utilized by queries

  ## Security & Performance Impact
  
  - Reduces storage overhead
  - Improves INSERT/UPDATE performance on these tables
  - No impact on query performance (indexes were not being used)
  - If these indexes become needed in the future, they can be recreated
*/

-- Drop unused index on ai_usage_logs table
DROP INDEX IF EXISTS idx_ai_usage_logs_user_id;

-- Drop unused index on user_favorite_spots table
DROP INDEX IF EXISTS idx_user_favorite_spots_spot_id;