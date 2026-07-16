-- aise_space.sql  (run once, after migrations)
-- Creates the private "Aise" workspace owned by aise@gruve.events.
-- The on_business_created trigger auto-adds the owner as an ADMIN member, so this
-- space is isolated by RLS from everyone who is NOT a member — i.e. your Gruve and
-- Sippy employees never see it. Seeds the seven platforms into platform_health.
--
-- Idempotent: safe to re-run. Adjust the email if your login differs.

do $$
declare
  v_owner   uuid;
  v_biz     uuid;
begin
  select id into v_owner from public.users where email = 'aise@gruve.events' limit 1;
  if v_owner is null then
    raise notice 'No user found for aise@gruve.events — sign up/log in once, then re-run this seed.';
    return;
  end if;

  -- Create the workspace if it doesn't exist yet.
  select id into v_biz from public.businesses where slug = 'aise' limit 1;
  if v_biz is null then
    insert into public.businesses (name, slug, owner_id)
    values ('Aise', 'aise', v_owner)
    returning id into v_biz;
    raise notice 'Created workspace "Aise" (%).', v_biz;
  end if;

  -- Seed platform health rows (kind: inbound|content|both).
  insert into public.platform_health (business_id, platform, kind, handle)
  values
    (v_biz, 'Behance',  'both',    null),
    (v_biz, 'Dribbble', 'both',    null),
    (v_biz, 'Upwork',   'inbound', null),
    (v_biz, 'Contra',   'both',    null),
    (v_biz, 'Fiverr',   'inbound', null),
    (v_biz, 'Twitter',  'content', null),
    (v_biz, 'LinkedIn', 'content', null)
  on conflict (business_id, platform) do nothing;
end $$;
