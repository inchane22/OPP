-- Complete Database Backup
-- Generated on December 03, 2024

-- Schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    language TEXT NOT NULL DEFAULT 'es',
    avatar TEXT,
    bio TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    author_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    post_id INTEGER NOT NULL,
    author_id INTEGER,
    author_name TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    location TEXT NOT NULL,
    organizer_id INTEGER NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    accepts_lightning BOOLEAN NOT NULL DEFAULT false,
    verified BOOLEAN NOT NULL DEFAULT false,
    submitted_by_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carousel_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    embed_url TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_by_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Data Export
INSERT INTO users (id, username, email, role, language, password, created_at) VALUES
(4, 'inchane', '', 'user', 'es', 'ea55a28587febdc608f1b9d2bb971c15d5114f605d83eb924c58e34094099da76c467486c60abc8d4bdc3e8ddd8e0beceb2f8301068e5b182d74428b514c275f.1307d1753c0ca96d792c450e5eec26da', '2024-12-03T02:28:29.088693'),
(3, 'admin', 'admin@example.com', 'admin', 'en', '0fa33a9dd66171f0619e1ff8212ace34b29f5976e8f06d0992f083c439e73bb72dd79fe843610bbf8fa0256177361c2e2f8c2026dd96b5a04df84204c4c4540a.cb6fe2d0d0060104ef3beb04b11c08e1', '2024-12-03T02:20:14.705881');

INSERT INTO posts (id, title, content, category, author_id, created_at, updated_at) VALUES
(8, 'Test Post', 'This is a test post content', 'general', 3, '2024-12-03T02:21:36.300112', '2024-12-03T02:21:36.300112');

INSERT INTO comments (id, content, post_id, author_id, author_name, created_at) VALUES
(1, 'test 123', 8, NULL, 'Anonymous', '2024-12-03T03:10:02.589919');

INSERT INTO resources (id, title, description, url, type, author_id, approved, created_at) VALUES
(4, 'Bitcoin Whitepaper', 'The original Bitcoin whitepaper by Satoshi Nakamoto', 'https://bitcoin.org/bitcoin.pdf', 'article', 3, true, '2024-12-03T02:22:52.655214');

INSERT INTO events (id, title, description, date, location, organizer_id, likes, created_at) VALUES
(7, 'Bitcoin Meetup', 'Monthly Bitcoin meetup in Lima', '2024-12-10T02:22:52.655214', 'Lima, Peru', 3, 2, '2024-12-03T02:22:52.655214');

INSERT INTO businesses (id, name, description, address, city, phone, website, accepts_lightning, verified, submitted_by_id, created_at) VALUES
(3, 'Bitcoin Cafe', 'First Bitcoin-native cafe in Lima', 'Av. Larco 123', 'Lima', NULL, NULL, true, true, 3, '2024-12-03T02:22:52.655214');
