-- Database Data Backup
-- Generated on December 22, 2024

-- Users data (excluding sensitive information)
INSERT INTO users (username, email, role, language, created_at) VALUES
('admin', 'admin@example.com', 'admin', 'es', '2024-12-03 02:20:14.705881'),
('inchane', NULL, 'user', 'es', '2024-12-03 02:28:29.088693'),
('1', 'jicamet@gmail.com', 'user', 'es', '2024-12-04 10:55:42.171379');

-- Resources data
INSERT INTO resources (title, description, url, type, author_id, approved, created_at) VALUES
('Bitcoin Whitepaper', 'The original Bitcoin whitepaper by Satoshi Nakamoto', 'https://bitcoin.org/bitcoin.pdf', 'article', 3, true, '2024-12-03 02:22:52.655214'),
('Bitcoin Standard', 'El libro definitivo sobre por qué Bitcoin es la única moneda dura verdadera', 'https://saifedean.com/thebitcoinstandard/', 'book', 3, true, '2024-12-03 20:15:39.529599'),
('Mastering Bitcoin', 'Guía técnica completa para entender Bitcoin a nivel protocolo', 'https://github.com/bitcoinbook/bitcoinbook', 'book', 3, true, '2024-12-03 20:15:39.529599'),
('The Bullish Case for Bitcoin', 'Análisis profundo del caso alcista de Bitcoin por Vijay Boyapati', 'https://vijayboyapati.medium.com/the-bullish-case-for-bitcoin-6ecc8bdecc1', 'article', 3, true, '2024-12-03 20:15:39.529599'),
('Layered Money', 'Comprende Bitcoin a través de la historia del dinero por Nik Bhatia', 'https://www.layeredmoney.com/', 'book', 3, true, '2024-12-03 20:15:39.529599'),
('Check Your Financial Privilege', 'Por qué Bitcoin importa para la libertad financiera global', 'https://bitcoinmagazine.com/culture/check-your-financial-privilege', 'article', 3, true, '2024-12-03 20:15:39.529599');

-- Events data
INSERT INTO events (title, description, date, location, organizer_id, likes, created_at) VALUES
('OPP Meetup Cierre de Año 2024', 'Bitcoin meetup mensual en Lima', '2024-12-23 00:00:00', 'Puku Puku Café Larco', 3, 4, '2024-12-03 02:22:52.655214'),
('OPP Meetup Apertura de Año 2025', 'Bitcoin meetup mensual en Lima', '2025-01-20 00:00:00', 'Puku Puku Café Larco', 3, 1, '2024-12-20 14:27:58.184158');

-- Businesses data
INSERT INTO businesses (name, description, address, city, phone, website, accepts_lightning, verified, submitted_by_id, created_at, latitude, longitude) VALUES
('Dermalan Clinic', 'Centro médico especializado en dermatología general, estética y láser en Lima.', 'Av. Guardia Civil 388, Lima 15036', 'Lima', '977 584 624', 'https://dermalanclinic.com/', true, true, 3, '2024-12-11 02:26:50.72749', -12.09477501, -77.01026098),
('Intro Café Bar', 'Intro por Ignacio Barrios', 'Av. José Larco 835, Miraflores 15074', 'Lima', '908 932 169', 'https://linktr.ee/introcafebarmiraflores', true, true, 3, '2024-12-03 02:22:52.655214', -12.12776084, -77.02965640);

-- Posts data
INSERT INTO posts (title, content, category, author_id, created_at, updated_at) VALUES
('Bienvenidos', '🍊💊🇵🇪', 'general', 4, '2024-12-08 17:29:42.350699', '2024-12-08 17:29:42.350699');

-- Carousel items data
INSERT INTO carousel_items (title, embed_url, active, created_at, updated_at, created_by_id, description) VALUES
('Inside the Poor Town in Peru that''s all in on Bitcoin', 'https://youtu.be/C1_MJ1loP-U?si=e7ytxQ2w88Xfrrd0', true, '2024-12-03 16:55:37.219438', '2024-12-03 16:55:37.219438', 3, NULL),
('Trump y la Reserva Federal de Bitcoin, por Juan Ignacio Camet', 'https://x.com/larepublica_pe/status/1856677169730138121', true, '2024-12-03 20:50:50.556', '2024-12-03 20:50:50.556', 3, NULL),
('Presentar MOTIV PERU - Valentin Popescu - AB23 Día 1 - Bitfinex Stage', 'https://youtu.be/bJsw0iMUin8?si=Z0ONULn84stDn3oU', true, '2024-12-03 21:18:04.984678', '2024-12-03 21:18:04.984678', 3, NULL),
('This Poor Remote Village in Peru Uses The Future Of Money', 'https://www.youtube.com/embed/-uCyFQPpdGI?origin=https%3A%2F%2F7ce9f4b8-8550-46c8-9cab-63712d3cd3a7-00-3lg2nzoqqlg3k.picard.replit.dev&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&referrerpolicy=strict-origin-when-cross-origin&allow=accelerometer%3B+autoplay%3B+clipboard-write%3B+encrypted-media%3B+gyroscope%3B+picture-in-picture&allowfullscreen=1&controls=1', true, '2024-12-08 19:18:37.107339', '2024-12-08 19:18:37.107339', 3, NULL),
('euro', 'https://x.com/jicamet/status/1869472253395759589', true, '2024-12-19 05:20:49.69839', '2024-12-19 05:20:49.69839', NULL, NULL);