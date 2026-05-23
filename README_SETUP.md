# SpeakSmart AI - Setup Guide

## Quick Start

1. Copy env file:    cp .env.example .env
2. Fill in .env with your keys (see below)
3. Run Supabase SQL: paste supabase-schema.sql in Supabase SQL Editor
4. npm install && npm run dev

## Keys Needed
- VITE_CLERK_PUBLISHABLE_KEY → clerk.com → Create App → API Keys
- VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY → supabase.com → Project Settings → API
- VITE_ANTHROPIC_API_KEY → console.anthropic.com → API Keys
