-- Database backup created on December 22, 2024
-- Simple backup of schema and data

-- Schema and data backup
\c postgres

-- Drop existing tables if they exist
DROP TABLE IF EXISTS carousel_items_backup_history CASCADE;
DROP TABLE IF EXISTS carousel_items CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recreate tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    language TEXT NOT NULL DEFAULT 'es',
    avatar TEXT,
    bio TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    author_id INTEGER REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) NOT NULL,
    author_id INTEGER REFERENCES users(id),
    author_name TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id) NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    location TEXT NOT NULL,
    organizer_id INTEGER REFERENCES users(id) NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    accepts_lightning BOOLEAN NOT NULL DEFAULT false,
    verified BOOLEAN NOT NULL DEFAULT false,
    submitted_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8)
);

CREATE TABLE carousel_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    embed_url TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by_id INTEGER REFERENCES users(id)
);