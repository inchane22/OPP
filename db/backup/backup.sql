--
-- PostgreSQL database dump
--

-- Dumped from database version 16.6
-- Dumped by pg_dump version 16.5

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.businesses (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    phone text,
    website text,
    accepts_lightning boolean DEFAULT false NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    submitted_by_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8)
);


ALTER TABLE public.businesses OWNER TO neondb_owner;

--
-- Name: businesses_id_seq1; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.businesses_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.businesses_id_seq1 OWNER TO neondb_owner;

--
-- Name: businesses_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.businesses_id_seq1 OWNED BY public.businesses.id;


--
-- Name: carousel_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.carousel_items (
    id integer NOT NULL,
    title text NOT NULL,
    embed_url text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by_id integer,
    description text
);


ALTER TABLE public.carousel_items OWNER TO neondb_owner;

--
-- Name: carousel_items_backup_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.carousel_items_backup_history (
    id integer NOT NULL,
    carousel_item_id integer,
    title text NOT NULL,
    embed_url text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by_id integer,
    backup_date timestamp without time zone DEFAULT now() NOT NULL,
    item_id integer
);


ALTER TABLE public.carousel_items_backup_history OWNER TO neondb_owner;

--
-- Name: carousel_items_backup_history_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.carousel_items_backup_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carousel_items_backup_history_id_seq OWNER TO neondb_owner;

--
-- Name: carousel_items_backup_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.carousel_items_backup_history_id_seq OWNED BY public.carousel_items_backup_history.id;


--
-- Name: carousel_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.carousel_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carousel_items_id_seq OWNER TO neondb_owner;

--
-- Name: carousel_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.carousel_items_id_seq OWNED BY public.carousel_items.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    content text NOT NULL,
    author_id integer,
    author_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO neondb_owner;

--
-- Name: comments_id_seq1; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.comments_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq1 OWNER TO neondb_owner;

--
-- Name: comments_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.comments_id_seq1 OWNED BY public.comments.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.events (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    date timestamp without time zone NOT NULL,
    location text NOT NULL,
    organizer_id integer NOT NULL,
    likes integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.events OWNER TO neondb_owner;

--
-- Name: events_id_seq1; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.events_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq1 OWNER TO neondb_owner;

--
-- Name: events_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.events_id_seq1 OWNED BY public.events.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    author_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.posts OWNER TO neondb_owner;

--
-- Name: posts_id_seq1; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.posts_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq1 OWNER TO neondb_owner;

--
-- Name: posts_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.posts_id_seq1 OWNED BY public.posts.id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    url text NOT NULL,
    type text NOT NULL,
    author_id integer NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.resources OWNER TO neondb_owner;

--
-- Name: resources_id_seq1; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.resources_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq1 OWNER TO neondb_owner;

--
-- Name: resources_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.resources_id_seq1 OWNED BY public.resources.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text,
    avatar text,
    bio text,
    language text DEFAULT 'es'::text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq1; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq1 OWNER TO neondb_owner;

--
-- Name: users_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq1 OWNED BY public.users.id;


--
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq1'::regclass);


--
-- Name: carousel_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.carousel_items ALTER COLUMN id SET DEFAULT nextval('public.carousel_items_id_seq'::regclass);


--
-- Name: carousel_items_backup_history id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.carousel_items_backup_history ALTER COLUMN id SET DEFAULT nextval('public.carousel_items_backup_history_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq1'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq1'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq1'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq1'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq1'::regclass);


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.businesses (id, name, description, address, city, phone, website, accepts_lightning, verified, submitted_by_id, created_at, category, latitude, longitude) FROM stdin;
5	 Dermalan Clinic	Centro médico especializado en dermatología general, estética y láser en Lima.	Av. Guardia Civil 388, Lima 15036	Lima	977 584 624	https://dermalanclinic.com/	t	t	3	2024-12-11 02:26:50.72749	other	-12.09477501	-77.01026098
3	Intro Café Bar	Intro por Ignacio Barrios	Av. José Larco 835, Miraflores 15074	Lima	908 932 169	https://linktr.ee/introcafebarmiraflores	t	t	3	2024-12-03 02:22:52.655214	other	-12.12776084	-77.02965640
\.


--
-- Data for Name: carousel_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.carousel_items (id, title, embed_url, active, created_at, updated_at, created_by_id, description) FROM stdin;
10	Inside the Poor Town in Peru that's all in on Bitcoin	https://youtu.be/C1_MJ1loP-U?si=e7ytxQ2w88Xfrrd0	t	2024-12-03 16:55:37.219438	2024-12-03 16:55:37.219438	3	\N
11	Trump y la Reserva Federal de Bitcoin, por Juan Ignacio Camet	https://x.com/larepublica_pe/status/1856677169730138121	t	2024-12-03 20:50:50.556	2024-12-03 20:50:50.556	3	\N
12	Presentar MOTIV PERU - Valentin Popescu - AB23 Día 1 - Bitfinex Stage	https://youtu.be/bJsw0iMUin8?si=Z0ONULn84stDn3oU	t	2024-12-03 21:18:04.984678	2024-12-03 21:18:04.984678	3	\N
18	This Poor Remote Village in Peru Uses The Future Of Money	https://www.youtube.com/embed/-uCyFQPpdGI?origin=https%3A%2F%2F7ce9f4b8-8550-46c8-9cab-63712d3cd3a7-00-3lg2nzoqqlg3k.picard.replit.dev&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&referrerpolicy=strict-origin-when-cross-origin&allow=accelerometer%3B+autoplay%3B+clipboard-write%3B+encrypted-media%3B+gyroscope%3B+picture-in-picture&allowfullscreen=1&controls=1	t	2024-12-08 19:18:37.107339	2024-12-08 19:18:37.107339	3	
19	You Don't Know THIS Side Of Peru: Bitcoin, poverty and Motiv	https://www.youtube.com/embed/_P8FuBqWGHU?origin=https%3A%2F%2F7ce9f4b8-8550-46c8-9cab-63712d3cd3a7-00-3lg2nzoqqlg3k.picard.replit.dev&enablejsapi=1&rel=0&modestbranding=1&controls=1&autoplay=0&playsinline=1&mute=0&iv_load_policy=3	t	2024-12-08 19:20:24.373512	2024-12-08 19:20:24.373512	3	
20	euro	https://x.com/jicamet/status/1869472253395759589	t	2024-12-19 05:20:49.69839	2024-12-19 05:20:49.69839	\N	\N
\.


--
-- Data for Name: carousel_items_backup_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.carousel_items_backup_history (id, carousel_item_id, title, embed_url, description, active, created_at, updated_at, created_by_id, backup_date, item_id) FROM stdin;
6	\N	Inside the Poor Town in Peru that's all in on Bitcoin	https://youtu.be/C1_MJ1loP-U?si=e7ytxQ2w88Xfrrd0	\N	t	2024-12-03 16:55:37.219438	2024-12-03 16:55:37.219438	3	2024-12-05 04:39:25.909965	\N
7	\N	Trump y la Reserva Federal de Bitcoin, por Juan Ignacio Camet	https://x.com/larepublica_pe/status/1856677169730138121	\N	t	2024-12-03 20:50:50.556	2024-12-03 20:50:50.556	3	2024-12-05 04:39:25.909965	\N
9	\N	Presentar MOTIV PERU - Valentin Popescu - AB23 Día 1 - Bitfinex Stage	https://youtu.be/bJsw0iMUin8?si=Z0ONULn84stDn3oU	\N	t	2024-12-03 21:18:04.984678	2024-12-03 21:18:04.984678	3	2024-12-05 04:39:25.909965	\N
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.comments (id, post_id, content, author_id, author_name, created_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.events (id, title, description, date, location, organizer_id, likes, created_at) FROM stdin;
7	OPP Meetup Cierre de Año 2024	Bitcoin meetup mensual en Lima	2024-12-23 00:00:00	Puku Puku Café Larco	3	4	2024-12-03 02:22:52.655214
8	OPP Meetup Apertura de Año 2025	Bitcoin meetup mensual en Lima	2025-01-20 00:00:00	Puku Puku Café Larco	3	1	2024-12-20 14:27:58.184158
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.posts (id, title, content, category, author_id, created_at, updated_at) FROM stdin;
56	Bienvenidos	🍊💊🇵🇪	general	4	2024-12-08 17:29:42.350699	2024-12-08 17:29:42.350699
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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, avatar, bio, language, role, created_at) FROM stdin;
4	inchane	ea55a28587febdc608f1b9d2bb971c15d5114f605d83eb924c58e34094099da76c467486c60abc8d4bdc3e8ddd8e0beceb2f8301068e5b182d74428b514c275f.1307d1753c0ca96d792c450e5eec26da		\N	\N	es	user	2024-12-03 02:28:29.088693
6	1	38830c47a33eca5ed37ef5cf8a50e2c909b641543d5808085f13ec178a8255f1d3e6aad186c4d6564bf03b5e6de236b55341e1f1192ca869bcc69a0a651948aa.9a026069349e2779058086c6082d45b6	jicamet@gmail.com	\N	\N	es	user	2024-12-04 10:55:42.171379
3	admin	0fa33a9dd66171f0619e1ff8212ace34b29f5976e8f06d0992f083c439e73bb72dd79fe843610bbf8fa0256177361c2e2f8c2026dd96b5a04df84204c4c4540a.cb6fe2d0d0060104ef3beb04b11c08e1	admin@example.com	\N	\N	es	admin	2024-12-03 02:20:14.705881
\.


--
-- Name: businesses_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.businesses_id_seq1', 5, true);


--
-- Name: carousel_items_backup_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.carousel_items_backup_history_id_seq', 9, true);


--
-- Name: carousel_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.carousel_items_id_seq', 20, true);


--
-- Name: comments_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.comments_id_seq1', 12, true);


--
-- Name: events_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.events_id_seq1', 8, true);


--
-- Name: posts_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.posts_id_seq1', 56, true);


--
-- Name: resources_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.resources_id_seq1', 10, true);


--
-- Name: users_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq1', 6, true);


--
-- Name: businesses businesses_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey1 PRIMARY KEY (id);


--
-- Name: carousel_items_backup_history carousel_items_backup_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.carousel_items_backup_history
    ADD CONSTRAINT carousel_items_backup_history_pkey PRIMARY KEY (id);


--
-- Name: carousel_items carousel_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.carousel_items
    ADD CONSTRAINT carousel_items_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey1 PRIMARY KEY (id);


--
-- Name: events events_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey1 PRIMARY KEY (id);


--
-- Name: posts posts_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey1 PRIMARY KEY (id);


--
-- Name: resources resources_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey1 PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey1 PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: businesses businesses_submitted_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_submitted_by_id_users_id_fk FOREIGN KEY (submitted_by_id) REFERENCES public.users(id);


--
-- Name: carousel_items_backup_history carousel_items_backup_history_carousel_item_id_carousel_items_i; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.carousel_items_backup_history
    ADD CONSTRAINT carousel_items_backup_history_carousel_item_id_carousel_items_i FOREIGN KEY (carousel_item_id) REFERENCES public.carousel_items(id);


--
-- Name: carousel_items_backup_history carousel_items_backup_history_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.carousel_items_backup_history
    ADD CONSTRAINT carousel_items_backup_history_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: carousel_items carousel_items_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.carousel_items
    ADD CONSTRAINT carousel_items_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: comments comments_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: comments comments_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: events events_organizer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_organizer_id_users_id_fk FOREIGN KEY (organizer_id) REFERENCES public.users(id);


--
-- Name: posts posts_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: resources resources_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

