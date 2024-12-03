-- Database backup created on December 03, 2024

-- Users table
INSERT INTO users (username, password, email, role, language) VALUES ('admin', '0fa33a9dd66171f0619e1ff8212ace34b29f5976e8f06d0992f083c439e73bb72dd79fe843610bbf8fa0256177361c2e2f8c2026dd96b5a04df84204c4c4540a.cb6fe2d0d0060104ef3beb04b11c08e1', 'admin@example.com', 'admin', 'es');

-- Events table
INSERT INTO events (title, description, date, location, organizer_id, likes) VALUES ('Bitcoin Meetup', 'Monthly Bitcoin meetup in Lima', '2024-12-10 02:23:34.799635', 'Lima, Peru', 3, 0);

-- Resources table
INSERT INTO resources (title, description, url, type, author_id, approved) VALUES ('Bitcoin Whitepaper', 'The original Bitcoin whitepaper by Satoshi Nakamoto', 'https://bitcoin.org/bitcoin.pdf', 'article', 3, true);

-- Businesses table
INSERT INTO businesses (name, description, address, city, phone, website, accepts_lightning, verified, submitted_by_id) VALUES ('Bitcoin Cafe', 'First Bitcoin-native cafe in Lima', 'Av. Larco 123', 'Lima', NULL, NULL, true, true, 3);

-- Posts table (if any exists)
INSERT INTO posts (title, content, category, author_id, created_at, updated_at) VALUES ('Test Post', 'This is a test post content', 'general', 3, '2024-12-03 02:23:47.799635', '2024-12-03 02:23:47.799635');
