--
-- PostgreSQL database dump
--

-- Dumped from database version 16.6
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, avatar, bio, language, role, created_at) FROM stdin;
4	inchane	ea55a28587febdc608f1b9d2bb971c15d5114f605d83eb924c58e34094099da76c467486c60abc8d4bdc3e8ddd8e0beceb2f8301068e5b182d74428b514c275f.1307d1753c0ca96d792c450e5eec26da		\N	\N	es	user	2024-12-03 02:28:29.088693
3	admin	0fa33a9dd66171f0619e1ff8212ace34b29f5976e8f06d0992f083c439e73bb72dd79fe843610bbf8fa0256177361c2e2f8c2026dd96b5a04df84204c4c4540a.cb6fe2d0d0060104ef3beb04b11c08e1	admin@example.com	\N	\N	en	admin	2024-12-03 02:20:14.705881
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.businesses (id, name, description, address, city, phone, website, accepts_lightning, verified, submitted_by_id, created_at) FROM stdin;
3	Bitcoin Cafe	First Bitcoin-native cafe in Lima	Av. Larco 123	Lima	\N	\N	t	t	3	2024-12-03 02:22:52.655214
\.


--
-- Data for Name: carousel_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.carousel_items (id, title, embed_url, active, created_at, updated_at, created_by_id, description) FROM stdin;
6	Inside the Poor Town in Peru that's all in on Bitcoin	https://youtu.be/C1_MJ1loP-U?si=e7ytxQ2w88Xfrrd0	t	2024-12-03 16:55:37.219438	2024-12-03 16:55:37.219438	3	\N
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.posts (id, title, content, category, author_id, created_at, updated_at) FROM stdin;
8	Test Post	This is a test post content	general	3	2024-12-03 02:21:36.300112	2024-12-03 02:21:36.300112
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.comments (id, post_id, content, author_id, author_name, created_at) FROM stdin;
1	8	test 123	\N	Anonymous	2024-12-03 03:10:02.589919
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.events (id, title, description, date, location, organizer_id, likes, created_at) FROM stdin;
7	Bitcoin Meetup	Monthly Bitcoin meetup in Lima	2024-12-10 02:22:52.655214	Lima, Peru	3	2	2024-12-03 02:22:52.655214
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.resources (id, title, description, url, type, author_id, approved, created_at) FROM stdin;
4	Bitcoin Whitepaper	The original Bitcoin whitepaper by Satoshi Nakamoto	https://bitcoin.org/bitcoin.pdf	article	3	t	2024-12-03 02:22:52.655214
6	Bitcoin Standard	El libro definitivo sobre por qué Bitcoin es la única moneda dura verdadera	https://saifedean.com/thebitcoinstandard/	book	3	t	2024-12-03 20:15:39.529599
7	Mastering Bitcoin	Guía técnica completa para entender Bitcoin a nivel protocolo	https://github.com/bitcoinbook/bitcoinbook	book	3	t	2024-12-03 20:15:39.529599
8	The Bullish Case for Bitcoin	Análisis profundo del caso alcista de Bitcoin por Vijay Boyapati	https://vijayboyapati.medium.com/the-bullish-case-for-bitcoin-6ecc8bdecc1	article	3	t	2024-12-03 20:15:39.529599
9	Layered Money	Comprende Bitcoin a través de la historia del dinero por Nik Bhatia	https://www.layeredmoney.com/	book	3	t	2024-12-03 20:15:39.529599
10	Check Your Financial Privilege	Por qué Bitcoin importa para la libertad financiera global	https://bitcoinmagazine.com/culture/check-your-financial-privilege	article	3	t	2024-12-03 20:15:39.529599
\.


--
-- Name: businesses_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.businesses_id_seq1', 3, true);


--
-- Name: carousel_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.carousel_items_id_seq', 6, true);


--
-- Name: comments_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.comments_id_seq1', 1, true);


--
-- Name: events_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.events_id_seq1', 7, true);


--
-- Name: posts_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.posts_id_seq1', 8, true);


--
-- Name: resources_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.resources_id_seq1', 10, true);


--
-- Name: users_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq1', 4, true);


--
-- PostgreSQL database dump complete
--

