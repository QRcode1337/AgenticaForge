-- Migration 0002: Add messages.user_id + agent_tasks.lease_token
-- Safe for existing databases with data.
--
-- Run after 0001_init.sql if the DB was deployed before these columns existed.

-- ═══════════════════════════════════════════════════════════════
-- 1. messages.user_id — needed for clean RLS without joins
-- ═══════════════════════════════════════════════════════════════

-- Add nullable first
alter table public.messages
  add column if not exists user_id uuid;

-- Backfill from agent_tasks → swarm_runs ownership chain
update public.messages m
set user_id = sr.user_id
from public.agent_tasks t
join public.swarm_runs sr on sr.id = t.swarm_run_id
where m.task_id = t.id
  and m.user_id is null;

-- Now enforce NOT NULL (will fail if any rows couldn't be backfilled —
-- that's intentional, investigate those orphans)
alter table public.messages
  alter column user_id set not null;

-- Add FK + index
alter table public.messages
  add constraint messages_user_id_fk
  foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists messages_user_id_idx
  on public.messages (user_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. agent_tasks.lease_token — prevents lease hijacking
-- ═══════════════════════════════════════════════════════════════

alter table public.agent_tasks
  add column if not exists lease_token uuid;

-- Make attempts/max_attempts NOT NULL with safe defaults
update public.agent_tasks set attempts = 0 where attempts is null;
update public.agent_tasks set max_attempts = 3 where max_attempts is null;

alter table public.agent_tasks
  alter column attempts set not null,
  alter column attempts set default 0;

alter table public.agent_tasks
  alter column max_attempts set not null,
  alter column max_attempts set default 3;

-- ═══════════════════════════════════════════════════════════════
-- 3. events.expires_at default (for new rows going forward)
-- ═══════════════════════════════════════════════════════════════

alter table public.events
  alter column expires_at set default (now() + interval '30 days');

-- Backfill existing rows that have no expiry
update public.events
set expires_at = created_at + interval '30 days'
where expires_at is null;

-- ═══════════════════════════════════════════════════════════════
-- 4. Update claim_next_task RPC (lease_token + NULL safety)
-- ═══════════════════════════════════════════════════════════════

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

  token := gen_random_uuid();

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
