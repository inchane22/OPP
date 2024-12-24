-- Add case-insensitive username index
CREATE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));

-- Add database function for case-insensitive username check
CREATE OR REPLACE FUNCTION check_username_unique() 
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE LOWER(username) = LOWER(NEW.username) 
    AND id != COALESCE(NEW.id, -1)
  ) THEN
    RAISE EXCEPTION 'username_exists';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to enforce case-insensitive uniqueness
DROP TRIGGER IF EXISTS ensure_username_case_insensitive_unique ON users;
CREATE TRIGGER ensure_username_case_insensitive_unique
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_username_unique();
