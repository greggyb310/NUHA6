/*
  # Add Audio Metadata to Chat Messages

  1. Changes
    - Add `audio_url` (text, nullable) - Base64 data URI or storage URL for audio
    - Add `audio_duration_ms` (integer, nullable) - Audio length in milliseconds
    - Add `transcript` (text, nullable) - Text transcription from voice (for searchability)
    - Add `message_type` (text, default 'text') - Distinguishes 'text' vs 'voice' messages

  2. Purpose
    - Enable voice message storage alongside text messages
    - Preserve transcripts for accessibility and search
    - Track audio duration for UI playback indicators
    - Maintain backward compatibility with existing text-only messages

  3. Notes
    - Existing messages remain type='text' by default
    - Voice messages will have both transcript and audio_url
    - Audio stored as base64 data URI for simplicity (no separate storage needed)
*/

-- Add audio metadata columns to chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN audio_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'audio_duration_ms'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN audio_duration_ms integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'transcript'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN transcript text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'voice'));
  END IF;
END $$;

-- Add index for message type filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages(message_type);
