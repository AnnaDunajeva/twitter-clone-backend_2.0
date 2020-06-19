CREATE TABLE public.background (
    id integer NOT NULL,
    image bytea NOT NULL
);


ALTER TABLE public.background OWNER TO postgres;

--
-- Name: background_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.background_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.background_id_seq OWNER TO postgres;

--
-- Name: background_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.background_id_seq OWNED BY public.background.id;


--
-- Name: default_profile_image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.default_profile_image (
    id integer NOT NULL,
    image bytea NOT NULL
);


ALTER TABLE public.default_profile_image OWNER TO postgres;

--
-- Name: default_profile_image_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.default_profile_image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.default_profile_image_id_seq OWNER TO postgres;

--
-- Name: default_profile_image_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.default_profile_image_id_seq OWNED BY public.default_profile_image.id;


--
-- Name: followings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.followings (
    "userId" character varying NOT NULL,
    "followingId" character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.followings OWNER TO postgres;

--
-- Name: likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.likes (
    "tweetId" integer NOT NULL,
    "userId" character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.likes OWNER TO postgres;

--
-- Name: reset_password_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reset_password_tokens (
    "tokenId" character varying NOT NULL,
    email character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.reset_password_tokens OWNER TO postgres;

--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tokens (
    "tokenId" character varying NOT NULL,
    "userId" character varying NOT NULL
);


ALTER TABLE public.tokens OWNER TO postgres;

--
-- Name: tweets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tweets (
    "tweetId" integer NOT NULL,
    "userId" character varying NOT NULL,
    text character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "parentId" integer,
    media bytea,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.tweets OWNER TO postgres;

--
-- Name: tweets_tweetId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."tweets_tweetId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."tweets_tweetId_seq" OWNER TO postgres;

--
-- Name: tweets_tweetId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."tweets_tweetId_seq" OWNED BY public.tweets."tweetId";


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    "userId" character varying NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    password character varying,
    email character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    description character varying,
    location character varying,
    "backgroundColor" character varying,
    "backgroundImage" bytea,
    avatar bytea,
    "deletedAt" timestamp with time zone,
    "verifiedAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "googleAuth" boolean
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: verification_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification_tokens (
    "tokenId" character varying NOT NULL,
    "userId" character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    email character varying
);


ALTER TABLE public.verification_tokens OWNER TO postgres;

--
-- Name: background id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.background ALTER COLUMN id SET DEFAULT nextval('public.background_id_seq'::regclass);


--
-- Name: default_profile_image id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.default_profile_image ALTER COLUMN id SET DEFAULT nextval('public.default_profile_image_id_seq'::regclass);


--
-- Name: tweets tweetId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tweets ALTER COLUMN "tweetId" SET DEFAULT nextval('public."tweets_tweetId_seq"'::regclass);


--
-- Name: tweets PK_07404e917c1f47575b0b54f435b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tweets
    ADD CONSTRAINT "PK_07404e917c1f47575b0b54f435b" PRIMARY KEY ("tweetId");


--
-- Name: likes PK_2afdac173b8919d70a4224c4504; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT "PK_2afdac173b8919d70a4224c4504" PRIMARY KEY ("tweetId", "userId");


--
-- Name: reset_password_tokens PK_2ef3f33b0c7549bfa70a9824904; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reset_password_tokens
    ADD CONSTRAINT "PK_2ef3f33b0c7549bfa70a9824904" PRIMARY KEY ("tokenId");


--
-- Name: background PK_7271b4d2e4bd0f68b3fdb5c090a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.background
    ADD CONSTRAINT "PK_7271b4d2e4bd0f68b3fdb5c090a" PRIMARY KEY (id);


--
-- Name: users PK_8bf09ba754322ab9c22a215c919; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_8bf09ba754322ab9c22a215c919" PRIMARY KEY ("userId");


--
-- Name: followings PK_9dc7dc6cf3a088414acc8fe4e18; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followings
    ADD CONSTRAINT "PK_9dc7dc6cf3a088414acc8fe4e18" PRIMARY KEY ("userId", "followingId");


--
-- Name: default_profile_image PK_c65394308e1624ee7c8dba51d41; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.default_profile_image
    ADD CONSTRAINT "PK_c65394308e1624ee7c8dba51d41" PRIMARY KEY (id);


--
-- Name: verification_tokens PK_d76d7b42cb10bce934467b2d8af; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_tokens
    ADD CONSTRAINT "PK_d76d7b42cb10bce934467b2d8af" PRIMARY KEY ("tokenId");


--
-- Name: tokens PK_f4940ff249082f72f9877d3b24e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT "PK_f4940ff249082f72f9877d3b24e" PRIMARY KEY ("tokenId");


--
-- Name: verification_tokens REL_8eb720a87e85b20fdfc69c3826; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_tokens
    ADD CONSTRAINT "REL_8eb720a87e85b20fdfc69c3826" UNIQUE ("userId");


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: tweets FK_36fd2ff575f772551bcc078eebb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tweets
    ADD CONSTRAINT "FK_36fd2ff575f772551bcc078eebb" FOREIGN KEY ("parentId") REFERENCES public.tweets("tweetId");


--
-- Name: followings FK_4a129387f2f2e59457c1a5e0944; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followings
    ADD CONSTRAINT "FK_4a129387f2f2e59457c1a5e0944" FOREIGN KEY ("followingId") REFERENCES public.users("userId");


--
-- Name: followings FK_5494649673073f5f5330410c1b1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followings
    ADD CONSTRAINT "FK_5494649673073f5f5330410c1b1" FOREIGN KEY ("userId") REFERENCES public.users("userId");


--
-- Name: verification_tokens FK_8eb720a87e85b20fdfc69c38269; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_tokens
    ADD CONSTRAINT "FK_8eb720a87e85b20fdfc69c38269" FOREIGN KEY ("userId") REFERENCES public.users("userId");


--
-- Name: likes FK_c11000826858057d4e6306a43ad; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT "FK_c11000826858057d4e6306a43ad" FOREIGN KEY ("tweetId") REFERENCES public.tweets("tweetId");


--
-- Name: likes FK_cfd8e81fac09d7339a32e57d904; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT "FK_cfd8e81fac09d7339a32e57d904" FOREIGN KEY ("userId") REFERENCES public.users("userId");


--
-- Name: tokens FK_d417e5d35f2434afc4bd48cb4d2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT "FK_d417e5d35f2434afc4bd48cb4d2" FOREIGN KEY ("userId") REFERENCES public.users("userId");


--
-- PostgreSQL database dump complete
--

