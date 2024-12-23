-- Database Data Backup
-- Generated on December 03, 2024

-- Users data
SELECT 'INSERT INTO users (username, email, role, language, created_at, updated_at) VALUES' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L)',
           username,
           email,
           role,
           language,
           created_at,
           updated_at),
    ',\n'
  ) || ';' AS insert_statement
FROM users;

-- Posts data
SELECT 'INSERT INTO posts (title, content, author_id, created_at, updated_at) VALUES' ||
  string_agg(
    format('(%L, %L, %L, %L, %L)',
           title,
           content,
           author_id,
           created_at,
           updated_at),
    ',\n'
  ) || ';' AS insert_statement
FROM posts;

-- Comments data
SELECT 'INSERT INTO comments (content, post_id, author_id, author_name, created_at) VALUES' ||
  string_agg(
    format('(%L, %L, %L, %L, %L)',
           content,
           post_id,
           author_id,
           author_name,
           created_at),
    ',\n'
  ) || ';' AS insert_statement
FROM comments;

-- Resources data
SELECT 'INSERT INTO resources (title, description, url, type, author_id, approved, created_at) VALUES' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L)',
           title,
           description,
           url,
           type,
           author_id,
           approved,
           created_at),
    ',\n'
  ) || ';' AS insert_statement
FROM resources;

-- Events data
SELECT 'INSERT INTO events (title, description, date, location, organizer_id, likes, created_at) VALUES' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L)',
           title,
           description,
           date,
           location,
           organizer_id,
           likes,
           created_at),
    ',\n'
  ) || ';' AS insert_statement
FROM events;

-- Businesses data
SELECT 'INSERT INTO businesses (name, description, address, city, phone, website, accepts_lightning, verified, submitted_by_id, created_at) VALUES' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
           name,
           description,
           address,
           city,
           phone,
           website,
           accepts_lightning,
           verified,
           submitted_by_id,
           created_at),
    ',\n'
  ) || ';' AS insert_statement
FROM businesses;
