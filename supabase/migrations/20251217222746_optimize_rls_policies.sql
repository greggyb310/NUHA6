/*
  # Optimize RLS Policies for Performance

  1. Changes
    - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
    - This prevents the function from being re-evaluated for each row
    - Significantly improves query performance at scale

  2. Tables Updated
    - ai_usage_logs
    - chat_sessions
    - chat_messages
    - user_profiles
    - user_favorite_spots
    - excursions

  3. Security
    - All RLS policies maintain the same security guarantees
    - Only performance optimization, no behavior changes
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_logs' AND policyname = 'Users can read own usage logs'
  ) THEN
    DROP POLICY "Users can read own usage logs" ON ai_usage_logs;
    CREATE POLICY "Users can read own usage logs"
      ON ai_usage_logs
      FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can view own sessions'
  ) THEN
    DROP POLICY "Users can view own sessions" ON chat_sessions;
    CREATE POLICY "Users can view own sessions"
      ON chat_sessions
      FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can create own sessions'
  ) THEN
    DROP POLICY "Users can create own sessions" ON chat_sessions;
    CREATE POLICY "Users can create own sessions"
      ON chat_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can update own sessions'
  ) THEN
    DROP POLICY "Users can update own sessions" ON chat_sessions;
    CREATE POLICY "Users can update own sessions"
      ON chat_sessions
      FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can delete own sessions'
  ) THEN
    DROP POLICY "Users can delete own sessions" ON chat_sessions;
    CREATE POLICY "Users can delete own sessions"
      ON chat_sessions
      FOR DELETE
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can view messages in own sessions'
  ) THEN
    DROP POLICY "Users can view messages in own sessions" ON chat_messages;
    CREATE POLICY "Users can view messages in own sessions"
      ON chat_messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM chat_sessions
          WHERE chat_sessions.id = chat_messages.session_id
          AND chat_sessions.user_id = (select auth.uid())
        )
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can create messages in own sessions'
  ) THEN
    DROP POLICY "Users can create messages in own sessions" ON chat_messages;
    CREATE POLICY "Users can create messages in own sessions"
      ON chat_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM chat_sessions
          WHERE chat_sessions.id = chat_messages.session_id
          AND chat_sessions.user_id = (select auth.uid())
        )
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can delete messages in own sessions'
  ) THEN
    DROP POLICY "Users can delete messages in own sessions" ON chat_messages;
    CREATE POLICY "Users can delete messages in own sessions"
      ON chat_messages
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM chat_sessions
          WHERE chat_sessions.id = chat_messages.session_id
          AND chat_sessions.user_id = (select auth.uid())
        )
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile'
  ) THEN
    DROP POLICY "Users can view own profile" ON user_profiles;
    CREATE POLICY "Users can view own profile"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    DROP POLICY "Users can insert own profile" ON user_profiles;
    CREATE POLICY "Users can insert own profile"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    DROP POLICY "Users can update own profile" ON user_profiles;
    CREATE POLICY "Users can update own profile"
      ON user_profiles
      FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_favorite_spots' AND policyname = 'Users can view own favorites'
  ) THEN
    DROP POLICY "Users can view own favorites" ON user_favorite_spots;
    CREATE POLICY "Users can view own favorites"
      ON user_favorite_spots
      FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_favorite_spots' AND policyname = 'Users can create own favorites'
  ) THEN
    DROP POLICY "Users can create own favorites" ON user_favorite_spots;
    CREATE POLICY "Users can create own favorites"
      ON user_favorite_spots
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_favorite_spots' AND policyname = 'Users can update own favorites'
  ) THEN
    DROP POLICY "Users can update own favorites" ON user_favorite_spots;
    CREATE POLICY "Users can update own favorites"
      ON user_favorite_spots
      FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_favorite_spots' AND policyname = 'Users can delete own favorites'
  ) THEN
    DROP POLICY "Users can delete own favorites" ON user_favorite_spots;
    CREATE POLICY "Users can delete own favorites"
      ON user_favorite_spots
      FOR DELETE
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'excursions' AND policyname = 'Users can view own excursions'
  ) THEN
    DROP POLICY "Users can view own excursions" ON excursions;
    CREATE POLICY "Users can view own excursions"
      ON excursions
      FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'excursions' AND policyname = 'Users can create own excursions'
  ) THEN
    DROP POLICY "Users can create own excursions" ON excursions;
    CREATE POLICY "Users can create own excursions"
      ON excursions
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'excursions' AND policyname = 'Users can update own excursions'
  ) THEN
    DROP POLICY "Users can update own excursions" ON excursions;
    CREATE POLICY "Users can update own excursions"
      ON excursions
      FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'excursions' AND policyname = 'Users can delete own excursions'
  ) THEN
    DROP POLICY "Users can delete own excursions" ON excursions;
    CREATE POLICY "Users can delete own excursions"
      ON excursions
      FOR DELETE
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;
END $$;