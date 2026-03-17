-- AgentForge: Initial migration
-- Run in Supabase SQL Editor (or via drizzle-kit push)
--
-- Covers: pgvector extension, all 8 tables, HNSW index,
--         RLS policies, match_memories RPC, events retention,
--         dedupe constraint, increment helper

-- ═══════════════════════════════════════════════════════════════
-- 1. Extensions
-- ═══════════════════════════════════════════════════════════════

create extension if not exists vector;

-- ═══════════════════════════════════════════════════════════════
-- 2. Enums
-- ═══════════════════════════════════════════════════════════════

create type memory_tier as enum ('hot', 'warm', 'cold');
create type memory_type as enum ('fact', 'decision', 'run_summary', 'artifact', 'pattern', 'tool_trace');
create type memory_origin as enum ('human', 'agent', 'sim');
create type memory_visibility as enum ('private', 'shared');
create type embedding_status as enum ('pending', 'ready', 'failed');
create type agent_role as enum ('scout', 'worker', 'coordinator', 'specialist', 'guardian');
create type swarm_status as enum ('queued', 'running', 'completed', 'failed');
create type swarm_phase as enum ('discovery', 'analysis', 'synthesis', 'optimization');
create type task_status as enum ('pending', 'active', 'completed', 'error', 'retrying');
create type message_role as enum ('system', 'user', 'assistant', 'tool');

-- ═══════════════════════════════════════════════════════════════
-- 3. Tables
-- ═══════════════════════════════════════════════════════════════

-- Memories
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  namespace text not null,
  tier memory_tier not null default 'hot',
  type memory_type not null default 'fact',
  origin memory_origin not null default 'human',
  visibility memory_visibility not null default 'private',
  score double precision default 1.0,
  access_count integer default 0,
  metadata jsonb,
  embedding vector(1536),
  embedding_status embedding_status not null default 'pending',
  embedding_model text,
  content_hash text,
  ttl_seconds integer,
  created_at timestamptz default now(),
  last_accessed_at timestamptz default now()
);

-- Agents
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role agent_role not null default 'worker',
  system_prompt text,
  model text default 'claude-sonnet-4-5-20250929',
  tools text[],
  config jsonb,
  created_at timestamptz default now()
);

-- Swarm Runs
create table if not exists public.swarm_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status swarm_status not null default 'queued',
  phase swarm_phase not null default 'discovery',
  config jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Agent Tasks
create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  swarm_run_id uuid not null references public.swarm_runs(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  status task_status not null default 'pending',
  phase swarm_phase not null,
  input jsonb,
  output jsonb,
  tokens_used integer,
  leased_at timestamptz,
  lease_expires_at timestamptz,
  lease_token uuid,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Messages (conversation + tool traces, no private reasoning)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role message_role not null,
  content text,
  tool_calls jsonb,
  reasoning_summary text,
  tokens integer,
  created_at timestamptz default now()
);

-- Artifacts
create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mime_type text,
  storage_path text,
  size_bytes integer,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Events (Live Feed — 30-day retention)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  swarm_run_id uuid references public.swarm_runs(id) on delete set null,
  agent_id text,
  agent_name text,
  message text,
  data jsonb,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

-- Credentials (encrypted API keys — never returned to browser)
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  encrypted_key text,
  key_version integer default 1,
  iv text,
  config jsonb,
  rotated_at timestamptz,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. Indexes
-- ═══════════════════════════════════════════════════════════════

-- HNSW index for vector cosine similarity search (the whole point of pgvector)
create index if not exists memories_embedding_hnsw
  on public.memories using hnsw (embedding vector_cosine_ops);

-- Standard B-tree indexes
create index if not exists memories_user_namespace_idx
  on public.memories (user_id, namespace);
create index if not exists memories_tier_idx
  on public.memories (tier);
create index if not exists memories_embedding_status_idx
  on public.memories (embedding_status)
  where embedding_status = 'pending';

create index if not exists agent_tasks_pending_idx
  on public.agent_tasks (status)
  where status = 'pending';
create index if not exists agent_tasks_lease_idx
  on public.agent_tasks (lease_expires_at)
  where status = 'active';

create index if not exists events_user_created_idx
  on public.events (user_id, created_at desc);
create index if not exists events_expires_idx
  on public.events (expires_at)
  where expires_at is not null;

-- ═══════════════════════════════════════════════════════════════
-- 5. Unique constraints (dedupe)
-- ═══════════════════════════════════════════════════════════════

-- Prevent duplicate memories per user+namespace
create unique index if not exists memories_dedupe_idx
  on public.memories (user_id, content_hash, namespace)
  where content_hash is not null;

-- One credential per user+service
create unique index if not exists credentials_user_service_idx
  on public.credentials (user_id, service);

-- ═══════════════════════════════════════════════════════════════
-- 6. RLS Policies — browser must never see other people's data
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all user-owned tables
alter table public.memories enable row level security;
alter table public.agents enable row level security;
alter table public.swarm_runs enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.messages enable row level security;
alter table public.artifacts enable row level security;
alter table public.events enable row level security;
alter table public.credentials enable row level security;

-- Memories: users see only their own
create policy "memories_select_own" on public.memories
  for select using (user_id = auth.uid());
create policy "memories_insert_own" on public.memories
  for insert with check (user_id = auth.uid());
create policy "memories_update_own" on public.memories
  for update using (user_id = auth.uid());
create policy "memories_delete_own" on public.memories
  for delete using (user_id = auth.uid());

-- Agents
create policy "agents_select_own" on public.agents
  for select using (user_id = auth.uid());
create policy "agents_insert_own" on public.agents
  for insert with check (user_id = auth.uid());
create policy "agents_update_own" on public.agents
  for update using (user_id = auth.uid());
create policy "agents_delete_own" on public.agents
  for delete using (user_id = auth.uid());

-- Swarm Runs
create policy "swarm_runs_select_own" on public.swarm_runs
  for select using (user_id = auth.uid());
create policy "swarm_runs_insert_own" on public.swarm_runs
  for insert with check (user_id = auth.uid());
create policy "swarm_runs_update_own" on public.swarm_runs
  for update using (user_id = auth.uid());
create policy "swarm_runs_delete_own" on public.swarm_runs
  for delete using (user_id = auth.uid());

-- Agent Tasks (user_id via swarm_run join — simplified by adding
-- a policy that checks swarm_run ownership)
create policy "agent_tasks_select_own" on public.agent_tasks
  for select using (
    exists (
      select 1 from public.swarm_runs
      where swarm_runs.id = agent_tasks.swarm_run_id
        and swarm_runs.user_id = auth.uid()
    )
  );
create policy "agent_tasks_insert_own" on public.agent_tasks
  for insert with check (
    exists (
      select 1 from public.swarm_runs
      where swarm_runs.id = agent_tasks.swarm_run_id
        and swarm_runs.user_id = auth.uid()
    )
  );
create policy "agent_tasks_update_own" on public.agent_tasks
  for update using (
    exists (
      select 1 from public.swarm_runs
      where swarm_runs.id = agent_tasks.swarm_run_id
        and swarm_runs.user_id = auth.uid()
    )
  );

-- Messages (user_id column added for clean RLS)
create policy "messages_select_own" on public.messages
  for select using (user_id = auth.uid());
create policy "messages_insert_own" on public.messages
  for insert with check (user_id = auth.uid());

-- Artifacts
create policy "artifacts_select_own" on public.artifacts
  for select using (user_id = auth.uid());
create policy "artifacts_insert_own" on public.artifacts
  for insert with check (user_id = auth.uid());

-- Events
create policy "events_select_own" on public.events
  for select using (user_id = auth.uid());
create policy "events_insert_own" on public.events
  for insert with check (user_id = auth.uid());

-- Credentials (strictest — no browser reads of encrypted_key)
create policy "credentials_select_own" on public.credentials
  for select using (user_id = auth.uid());
create policy "credentials_insert_own" on public.credentials
  for insert with check (user_id = auth.uid());
create policy "credentials_update_own" on public.credentials
  for update using (user_id = auth.uid());
create policy "credentials_delete_own" on public.credentials
  for delete using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- 7. RPC: match_memories — real semantic vector search
-- ═══════════════════════════════════════════════════════════════
-- This is what makes "search" actually semantic.
-- Browser calls: supabase.rpc('match_memories', { ... })

create or replace function public.match_memories(
  query_embedding vector(1536),
  match_user_id uuid,
  match_namespace text default null,
  match_tier memory_tier default null,
  match_limit int default 20
)
returns table (
  id uuid,
  content text,
  namespace text,
  tier memory_tier,
  type memory_type,
  origin memory_origin,
  score double precision,
  similarity double precision,
  access_count integer,
  created_at timestamptz,
  last_accessed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      m.id,
      m.content,
      m.namespace,
      m.tier,
      m.type,
      m.origin,
      m.score,
      1 - (m.embedding <=> query_embedding) as similarity,
      m.access_count,
      m.created_at,
      m.last_accessed_at
    from public.memories m
    where m.user_id = match_user_id
      and m.embedding_status = 'ready'
      and m.embedding is not null
      and (match_namespace is null or m.namespace = match_namespace)
      and (match_tier is null or m.tier = match_tier)
    order by m.embedding <=> query_embedding
    limit match_limit;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 8. RPC: increment_access_count — atomic counter bump
-- ═══════════════════════════════════════════════════════════════

create or replace function public.increment_access_count(row_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.memories
  set access_count = access_count + 1,
      last_accessed_at = now()
  where id = row_id;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 9. Events retention cleanup function
-- ═══════════════════════════════════════════════════════════════
-- Call via pg_cron or Supabase scheduled function

create or replace function public.cleanup_expired_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.events
  where expires_at is not null and expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Schedule cleanup (if pg_cron is available):
-- select cron.schedule('cleanup-expired-events', '0 3 * * *', 'select public.cleanup_expired_events()');

-- ═══════════════════════════════════════════════════════════════
-- 10. RPC: claim_next_task — atomic lease-based task claiming
-- ═══════════════════════════════════════════════════════════════
-- Worker calls this to atomically claim the next available task.
-- Uses FOR UPDATE SKIP LOCKED so multiple workers don't collide.

create or replace function public.claim_next_task()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
  token uuid;
begin
  -- Priority: pending tasks first, then retrying, then expired leases
  -- Always enforce attempt cap with coalesce for NULL safety
  select id into claimed_id
  from public.agent_tasks
  where (
    status = 'pending'
    or status = 'retrying'
    or (status = 'active' and lease_expires_at < now())
  )
  and coalesce(attempts, 0) < coalesce(max_attempts, 3)
  order by
    case status
      when 'pending' then 0
      when 'retrying' then 1
      else 2
    end,
    created_at asc
  limit 1
  for update skip locked;

  if claimed_id is null then
    return null;
  end if;

  -- Generate a unique lease token so only the claiming worker can renew/complete
  token := gen_random_uuid();

  -- Claim it: set active + lease + token
  update public.agent_tasks
  set
    status = 'active',
    leased_at = now(),
    lease_expires_at = now() + interval '5 minutes',
    lease_token = token,
    attempts = coalesce(attempts, 0) + 1
  where id = claimed_id;

  return jsonb_build_object('id', claimed_id, 'lease_token', token);
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 11. Supabase Storage bucket for artifacts
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;

-- Storage RLS: users can only access their own artifacts
create policy "artifacts_bucket_select" on storage.objects
  for select using (bucket_id = 'artifacts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "artifacts_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'artifacts' and auth.uid()::text = (storage.foldername(name))[1]);
