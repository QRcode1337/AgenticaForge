-- Migration 0003: Ensure atomic claim_next_task RPC exists for worker executor.

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
