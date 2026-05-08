-- Add meeting_link to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meeting_link TEXT;
