/*
  # Drop Unused Indexes

  1. Changes
    - Drop unused indexes that are consuming space without providing query benefits
    - Improves write performance by reducing index maintenance overhead
    - Reduces database storage requirements

  2. Indexes Removed
    - AI Usage Logs: idx_ai_usage_logs_user_id, idx_ai_usage_logs_created_at, idx_ai_usage_logs_provider
    - Chat Messages: idx_chat_messages_created_at, idx_chat_messages_message_type
    - Affiliate Products: idx_affiliate_products_category, idx_affiliate_products_featured, idx_affiliate_products_sort_order
    - Nature Spots: idx_nature_spots_osm_id, idx_nature_spots_coordinates, idx_nature_spots_type
    - User Favorite Spots: idx_user_favorite_spots_user_id, idx_user_favorite_spots_spot_id
    - User Profiles: user_profiles_email_idx

  3. Performance Impact
    - Faster INSERT, UPDATE, and DELETE operations on affected tables
    - Reduced storage footprint
    - No negative impact on query performance (indexes were not being used)

  4. Notes
    - Indexes can be recreated if future query patterns require them
    - Using IF EXISTS to ensure safe execution if indexes are already dropped
*/

-- Drop AI Usage Logs indexes
DROP INDEX IF EXISTS idx_ai_usage_logs_user_id;
DROP INDEX IF EXISTS idx_ai_usage_logs_created_at;
DROP INDEX IF EXISTS idx_ai_usage_logs_provider;

-- Drop Chat Messages indexes
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_message_type;

-- Drop Affiliate Products indexes
DROP INDEX IF EXISTS idx_affiliate_products_category;
DROP INDEX IF EXISTS idx_affiliate_products_featured;
DROP INDEX IF EXISTS idx_affiliate_products_sort_order;

-- Drop Nature Spots indexes
DROP INDEX IF EXISTS idx_nature_spots_osm_id;
DROP INDEX IF EXISTS idx_nature_spots_coordinates;
DROP INDEX IF EXISTS idx_nature_spots_type;

-- Drop User Favorite Spots indexes
DROP INDEX IF EXISTS idx_user_favorite_spots_user_id;
DROP INDEX IF EXISTS idx_user_favorite_spots_spot_id;

-- Drop User Profiles index
DROP INDEX IF EXISTS user_profiles_email_idx;
