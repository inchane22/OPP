-- Drop existing index if it exists
DROP INDEX IF EXISTS users_username_lower_idx;

-- Create a new index for case-insensitive username lookups
CREATE UNIQUE INDEX users_username_lower_idx ON users (LOWER(username));

-- Update existing function for case-insensitive username check
CREATE OR REPLACE FUNCTION check_username_unique() 
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE LOWER(username) = LOWER(NEW.username) 
    AND id != COALESCE(NEW.id, -1)
  ) THEN
    RAISE EXCEPTION 'username_exists' USING 
      DETAIL = 'A user with this username already exists (case-insensitive match)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for case-insensitive uniqueness
DROP TRIGGER IF EXISTS ensure_username_case_insensitive_unique ON users;
CREATE TRIGGER ensure_username_case_insensitive_unique
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_username_unique();

-- Add a check constraint to ensure usernames are properly formatted
ALTER TABLE users ADD CONSTRAINT username_format_check 
  CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$');