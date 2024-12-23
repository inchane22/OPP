-- Create a case-insensitive index for usernames
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE users ALTER COLUMN username TYPE citext;

-- Create a unique index for case-insensitive usernames
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username::text));

-- Add a trigger to ensure username consistency
CREATE OR REPLACE FUNCTION normalize_username()
RETURNS TRIGGER AS $$
BEGIN
  NEW.username = lower(NEW.username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_username_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION normalize_username();
