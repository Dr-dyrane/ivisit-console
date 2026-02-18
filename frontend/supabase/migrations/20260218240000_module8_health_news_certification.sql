-- MODULE 8 CERTIFICATION: HEALTH NEWS
-- Goal: Ensure schema compliance, de-recursive RLS, and seed final data.

BEGIN;

-- 1. Schema Alignment
CREATE TABLE IF NOT EXISTS public.health_news (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  title text NOT NULL,
  source text NOT NULL,
  time text NOT NULL,
  icon text NOT NULL,
  url text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  published boolean NULL DEFAULT true,
  category text NULL DEFAULT 'general'::text,
  CONSTRAINT health_news_pkey PRIMARY KEY (id)
);

-- Ensure all columns exist (if table already existed)
ALTER TABLE public.health_news ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;
ALTER TABLE public.health_news ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 2. Indices
CREATE INDEX IF NOT EXISTS health_news_created_at_idx ON public.health_news USING btree (created_at);

-- 3. De-Recursive RLS
ALTER TABLE public.health_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for health_news" ON public.health_news;
DROP POLICY IF EXISTS "Anyone can read health news" ON public.health_news;
DROP POLICY IF EXISTS "Admins manage health news" ON public.health_news;

-- Anyone can read published news
CREATE POLICY "Anyone can read published health news"
ON public.health_news
FOR SELECT
TO authenticated, anon
USING (published = true);

-- Admins can do everything
CREATE POLICY "Admins manage health news"
ON public.health_news
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

-- 4. Seed Final Data (User Provided)
DELETE FROM public.health_news; -- Clean start for certification

INSERT INTO public.health_news (id, title, source, time, icon, url, created_at, updated_at, published, category)
VALUES 
('31102787-bf07-493f-90bd-a513c5a88d32','Pediatric Vaccination Drive','Public Health','4d ago','shield-checkmark-outline','https://example.com/vaccination','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('45a05579-48d6-4057-9520-eb0b521e0765','Flu Season Peak: Stay Protected','Health Alert','1d ago','alert-circle-outline','https://example.com/flu-season','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('63d740d0-37dc-4282-bbd3-24ee4eb112bd','Telemedicine Services Expanded','Healthcare News','1w ago','videocam-outline','https://example.com/telemedicine','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('85bc8b3f-41a4-460e-8a1b-815ce52a5c81','Blood Donation Drive This Weekend','Community News','2w ago','water-outline','https://example.com/blood-donation','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('8bc2cba4-944d-4e52-ba3e-c6e68b573cb0','Breakthrough in Cancer Treatment','Medical Research','2d ago','flask-outline','https://example.com/cancer-research','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('9b095815-dd1e-4291-b420-3efa43c2206f','New ICU Wing at Reddington','Hospital Update','2h ago','business-outline','https://example.com/icu-wing','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('ad433e45-7f2e-4ccd-b8f2-74b60ee056e0','New Mental Health Hotline Launched','Community News','3d ago','call-outline','https://example.com/mental-health','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('ce27ee31-e787-43d0-986a-f3c2784495fc','Heart Health Awareness Month','Health Campaign','5d ago','heart-outline','https://example.com/heart-health','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('db279733-2da7-4bb7-90e1-10f683881f28','Free Dental Checkups this Saturday','Public Health','5h ago','medical-outline','https://example.com/dental-checkup','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general'),
('e33932ee-6769-4c94-b24b-84ebc70f931b','New Hospital Opening in Ikeja','Hospital Update','1w ago','business-outline','https://example.com/new-hospital','2026-02-14 00:06:44.896387+00','2026-02-14 00:06:44.896387+00',true,'general');

COMMIT;

NOTIFY pgrst, 'reload schema';
