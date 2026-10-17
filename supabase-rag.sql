-- ============================================
-- Curriculum RAG - run in Supabase SQL Editor (after supabase-schema.sql)
-- ============================================
create extension if not exists vector;

create table if not exists curriculum_chunks (
  id bigserial primary key,
  curriculum text not null,          -- folder name, e.g. "curriculum-1"
  source text not null,              -- file name
  page int,                          -- page number (PDF) or null
  content text not null,
  embedding vector(768) not null
);

create index if not exists idx_cc_curriculum on curriculum_chunks(curriculum);
create index if not exists idx_cc_embedding on curriculum_chunks
  using hnsw (embedding vector_cosine_ops);

alter table curriculum_chunks enable row level security;
-- Anyone with the anon key can READ. Writes only via service-role key (ingest script bypasses RLS).
drop policy if exists "read curriculum" on curriculum_chunks;
create policy "read curriculum" on curriculum_chunks for select using (true);

create or replace function list_curricula()
returns table (curriculum text, chunks bigint)
language sql stable as $$
  select curriculum, count(*) from curriculum_chunks group by curriculum order by curriculum;
$$;

create or replace function match_curriculum_chunks(
  query_embedding vector(768),
  p_curriculum text,
  match_count int default 6
)
returns table (id bigint, source text, page int, content text, similarity float)
language sql stable as $$
  select id, source, page, content, 1 - (embedding <=> query_embedding) as similarity
  from curriculum_chunks
  where curriculum = p_curriculum
  order by embedding <=> query_embedding
  limit match_count;
$$;
