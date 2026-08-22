-- CIVICOS production schema alignment
-- Run this once in Supabase SQL Editor.

-- Keep the frontend and database status vocabulary identical.
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_check
  CHECK (status IN ('pending', 'open', 'verified', 'in_progress', 'resolved', 'rejected'));

ALTER TABLE public.reports
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.reports
  ALTER COLUMN moderation_status SET DEFAULT 'approved';

-- Existing reports should be visible in the current public MVP.
UPDATE public.reports
SET moderation_status = 'approved'
WHERE moderation_status = 'pending';

-- Public reads only see approved reports.
DROP POLICY IF EXISTS "Public can read reports" ON public.reports;
CREATE POLICY "Public can read reports"
ON public.reports
FOR SELECT
TO anon, authenticated
USING (moderation_status = 'approved');

-- Anonymous CIVICOS reporting is intentionally public for this MVP.
DROP POLICY IF EXISTS "Public can submit reports" ON public.reports;
CREATE POLICY "Public can submit reports"
ON public.reports
FOR INSERT
TO anon, authenticated
WITH CHECK (moderation_status = 'approved');

-- Ensure vote reads/inserts remain available to the public workflow.
DROP POLICY IF EXISTS "Public can read votes" ON public.report_votes;
CREATE POLICY "Public can read votes"
ON public.report_votes
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can submit votes" ON public.report_votes;
CREATE POLICY "Public can submit votes"
ON public.report_votes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
