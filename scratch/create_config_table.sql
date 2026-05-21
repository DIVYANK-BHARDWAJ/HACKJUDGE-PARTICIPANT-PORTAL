-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/npgydwqyjqwcixsxydse/sql)
-- This creates the shared config table used by the admin portal to store hackathon settings
-- that all participants and the leaderboard can read.

CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed with the initial hackathon end time
-- Change this to whatever the actual end time is (ISO 8601, UTC)
INSERT INTO config (key, value)
VALUES ('end_time', '2026-05-21T12:30:00Z')
ON CONFLICT (key) DO NOTHING;

INSERT INTO config (key, value)
VALUES ('is_frozen', 'false')
ON CONFLICT (key) DO NOTHING;

-- Allow anonymous reads (needed for the leaderboard Vite app which has no server)
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON config
  FOR SELECT USING (true);

-- Only allow writes from the service role (Next.js server uses anon key,
-- but our API route validates the admin password before writing)
CREATE POLICY "Allow anon write" ON config
  FOR ALL USING (true);
