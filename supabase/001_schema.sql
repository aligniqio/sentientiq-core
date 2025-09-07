-- Extensions
create extension if not exists pgcrypto;
create extension if not exists vector;         -- for pgvector
create extension if not exists pg_trgm;        -- fallback text similarity

-- ========= Core tables =========
create table if not exists public.users (
  id            text primary key,              -- Clerk user id
  email         text unique,
  plan          text not null default 'free',
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

create table if not exists public.debates (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.users(id) on delete cascade,
  title         text,
  personas      text[] not null default '{}',
  status        text not null default 'running',  -- running|done|error
  tokens_used   integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.turns (
  id            uuid primary key default gen_random_uuid(),
  debate_id     uuid not null references public.debates(id) on delete cascade,
  persona       text not null,
  content       text not null,
  provider      text,                           -- 'openai'|'anthropic'|'groq'|...
  step          text,                           -- 'planner'|'primary'|'refiner'|...
  created_at    timestamptz not null default now()
);

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.users(id) on delete cascade,
  url           text,
  content       text,                            -- raw/plaintext for RAG
  embedding     vector(1536),                    -- store embeddings when available
  meta          jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.recommendations (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.users(id) on delete cascade,
  priority      int not null default 2,          -- 1=high,2=med,3=low
  title         text not null,
  rationale     text,
  source        text not null,                   -- 'daily_refresh'|'debate'|...
  state         text not null default 'new',     -- 'new'|'accepted'|'done'
  evidence      jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.actions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null references public.users(id) on delete cascade,
  recommendation_id  uuid references public.recommendations(id) on delete set null,
  status             text not null default 'proposed', -- 'proposed'|'running'|'done'
  metric_key         text,
  target             numeric,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  user_id       text,
  type          text not null,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

-- ========= Indexes =========
create index if not exists rec_state_priority_idx on public.recommendations(state, priority);
create index if not exists doc_user_created_idx   on public.documents(user_id, created_at desc);
create index if not exists doc_url_idx            on public.documents(url);
create index if not exists actions_user_idx       on public.actions(user_id);
create index if not exists turns_debate_idx       on public.turns(debate_id, created_at);

-- pgvector IVF index (enable once you have >~50k rows)
-- Adjust LISTS based on data scale; this is a sane default starter.
create index if not exists documents_embed_ivf on public.documents
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 30-day recent events partial index (for quick dashboards)
create index if not exists events_recent_type_idx on public.events(type)
  where created_at > now() - interval '30 days';

-- ========= Pragmatic RPC for retrieval =========
-- Option A (text similarity fallback) – works before embeddings exist.
create or replace function public.match_documents(query_text text, match_count int)
returns table(id uuid, content text, url text, score real)
language sql stable as $$
  select d.id, d.content, d.url,
         greatest(similarity(coalesce(d.content,''), query_text), 0)::real as score
  from public.documents d
  where d.content is not null
  order by score desc, d.created_at desc
  limit greatest(match_count, 1)
$$;

-- Option B (vector similarity) – switch to this once embeddings are populated.
-- keep this commented until you have embeddings filled.
/*
create or replace function public.match_documents_vec(query_embedding vector(1536), match_count int)
returns table(id uuid, content text, url text, score real)
language sql stable as $$
  select d.id, d.content, d.url,
         (1 - (d.embedding <=> query_embedding))::real as score  -- cosine similarity if vectors normalized
  from public.documents d
  where d.embedding is not null
  order by d.embedding <=> query_embedding asc
  limit greatest(match_count, 1)
$$;
*/

-- ========= RLS =========
alter table public.users            enable row level security;
alter table public.debates          enable row level security;
alter table public.turns            enable row level security;
alter table public.documents        enable row level security;
alter table public.recommendations  enable row level security;
alter table public.actions          enable row level security;
alter table public.events           enable row level security;

-- NOTE: We assume your client JWT includes Clerk 'sub' claim.
-- auth.jwt() returns the claims JSON in Supabase Postgres.
-- Service role bypasses policies automatically.

-- Users: user can see/update self row
create policy users_self_select on public.users
  for select using (auth.jwt() ->> 'sub' = id);
create policy users_self_update on public.users
  for update using (auth.jwt() ->> 'sub' = id)
  with check (auth.jwt() ->> 'sub' = id);
create policy users_insert_by_service on public.users
  for insert with check (true);  -- service role only (client cannot insert due to anon key)

-- Generic per-user data isolation
do $$
declare t text;
begin
  foreach t in array array['debates','turns','documents','recommendations','actions','events']
  loop
    execute format($pol$
      create policy %I_user_select on public.%I
        for select using (coalesce(user_id, auth.jwt() ->> 'sub') = auth.jwt() ->> 'sub');
      create policy %I_user_ins on public.%I
        for insert with check (user_id = auth.jwt() ->> 'sub');
      create policy %I_user_upd on public.%I
        for update using (user_id = auth.jwt() ->> 'sub')
        with check (user_id = auth.jwt() ->> 'sub');
    $pol$, t||'_sel', t, t||'_ins', t, t||'_upd', t);
  end loop;
end $$;
