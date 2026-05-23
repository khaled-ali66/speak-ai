-- ============================================
-- SpeakSmart AI - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- User stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,           -- Clerk user ID
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  speaking_hours NUMERIC(6,2) DEFAULT 0,
  vocabulary_count INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,                  -- Clerk user ID
  scenario TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);

-- ─── ROW LEVEL SECURITY ────────────────────────────────
-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Since Clerk handles auth (not Supabase Auth), we use anon key + service role.
-- For a production app, use Supabase JWT integration with Clerk.
-- For now, allow all operations with the anon key:

CREATE POLICY "Allow all for user_stats" ON user_stats
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for chat_sessions" ON chat_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- ─── LEADERBOARD VIEW ──────────────────────────────────
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    user_id,
    xp,
    level,
    ROW_NUMBER() OVER (ORDER BY xp DESC) AS rank
  FROM user_stats
  ORDER BY xp DESC
  LIMIT 100;
