-- Add case-insensitive username handling without data loss
BEGIN;

-- Drop existing unique constraint and index if they exist
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_unique;
DROP INDEX IF EXISTS users_username_lower_idx;

-- Create case-insensitive index for usernames
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));

-- Add trigger function for new username normalization
CREATE OR REPLACE FUNCTION check_username_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if username already exists (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE lower(username) = lower(NEW.username) 
    AND id != COALESCE(NEW.id, -1)
  ) THEN
    RAISE EXCEPTION 'Username already exists: %', NEW.username;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS username_conflict_check ON users;
CREATE TRIGGER username_conflict_check
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_username_conflict();

COMMIT;