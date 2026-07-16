-- 27_command_center_enable.sql
-- Make the Command Center a per-workspace feature ANY workspace owner can turn on,
-- instead of a hardcoded single workspace. Adds an enable flag + reusable RPCs that
-- an ADMIN of a workspace can call to switch it on/off. Enabling seeds that
-- workspace's default platforms. No emails or slugs hardcoded anywhere.

alter table public.businesses
  add column if not exists command_center_enabled boolean not null default false;

-- Enable for a workspace: sets the flag and seeds the default platforms.
-- SECURITY DEFINER so it can write regardless of table policies, but it first
-- checks the caller is an ADMIN of that specific workspace.
create or replace function public.enable_command_center(p_business_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'
  ) then
    raise exception 'Only an ADMIN of this workspace can enable the Command Center';
  end if;

  update public.businesses
    set command_center_enabled = true
    where id = p_business_id;

  insert into public.platform_health (business_id, platform, kind)
  values
    (p_business_id, 'Behance',  'both'),
    (p_business_id, 'Dribbble', 'both'),
    (p_business_id, 'Upwork',   'inbound'),
    (p_business_id, 'Contra',   'both'),
    (p_business_id, 'Fiverr',   'inbound'),
    (p_business_id, 'Twitter',  'content'),
    (p_business_id, 'LinkedIn', 'content')
  on conflict (business_id, platform) do nothing;
end;
$$;

create or replace function public.disable_command_center(p_business_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'
  ) then
    raise exception 'Only an ADMIN of this workspace can change the Command Center';
  end if;

  update public.businesses
    set command_center_enabled = false
    where id = p_business_id;
end;
$$;

grant execute on function public.enable_command_center(uuid)  to authenticated;
grant execute on function public.disable_command_center(uuid) to authenticated;
