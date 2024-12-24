-- Drop existing constraints and indexes first
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique') THEN
        ALTER TABLE users DROP CONSTRAINT users_username_unique;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_format_check') THEN
        ALTER TABLE users DROP CONSTRAINT username_format_check;
    END IF;
END $$;

-- Drop existing index if it exists
DROP INDEX IF EXISTS users_username_lower_idx;

-- Create function to sanitize usernames
CREATE OR REPLACE FUNCTION sanitize_username(username text)
RETURNS text AS $$
DECLARE
    sanitized text;
BEGIN
    -- Remove invalid characters and replace with underscore
    sanitized := REGEXP_REPLACE(username, '[^a-zA-Z0-9_-]', '_', 'g');

    -- Ensure minimum length
    IF LENGTH(sanitized) < 3 THEN
        sanitized := 'user_' || sanitized;
    END IF;

    -- Truncate if too long
    sanitized := SUBSTRING(sanitized FROM 1 FOR 50);

    RETURN sanitized;
END;
$$ LANGUAGE plpgsql;

-- Update existing invalid usernames
UPDATE users 
SET username = sanitize_username(username)
WHERE username !~ '^[a-zA-Z0-9_-]{3,50}$';

-- Create the case-insensitive unique index
CREATE UNIQUE INDEX users_username_lower_idx ON users (LOWER(username));

-- Add the format constraint for new usernames
ALTER TABLE users ADD CONSTRAINT username_format_check 
    CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$');

-- Create or replace the trigger function for case-insensitive uniqueness
CREATE OR REPLACE FUNCTION check_username_unique() 
RETURNS trigger AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE LOWER(username) = LOWER(NEW.username) 
        AND id != COALESCE(NEW.id, -1)
    ) THEN
        RAISE EXCEPTION 'username_exists'
            USING DETAIL = 'A user with this username already exists (case-insensitive match)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS ensure_username_case_insensitive_unique ON users;
CREATE TRIGGER ensure_username_case_insensitive_unique
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_username_unique();

-- Drop the temporary function
DROP FUNCTION IF EXISTS sanitize_username(text);