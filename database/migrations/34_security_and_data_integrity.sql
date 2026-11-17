-- 34_security_and_data_integrity.sql
-- Fixes from the 2026-11-17 audit. Every statement is idempotent and none
-- deletes user data. Safe to re-run.
--
--  1. businesses   — owner can SELECT their own row. createBusiness() does
--                    INSERT ... RETURNING; RETURNING must pass the SELECT
--                    policy, but the owner's business_members row is only
--                    added by the AFTER INSERT trigger, so workspace
--                    creation failed with "new row violates row-level
--                    security policy for table businesses".
--  2. comments     — the original 13_comments "edit/delete their own
--                    comments" policy was FOR ALL, which also granted
--                    INSERT into ANY thread (cross-workspace). Split into
--                    UPDATE + DELETE only.
--  3. accept_invitation — must be accepted by the invited email address.
--  4. node_shares  — only workspace EDITOR/ADMIN may create/change/remove
--                    shares (a VIEWER could previously self-grant 'edit');
--                    permission values are constrained.
--  5. nodes        — a shared guest (edit share, not a workspace editor) may
--                    edit page content/title only; moving, publishing,
--                    archiving or re-owning a page is blocked.
--  6. save_yjs_snapshot — raises instead of silently updating 0 rows when
--                    RLS blocks the write (saves used to "succeed" silently).
--  7. replace_node_blocks — atomic delete+insert of a node's derived block
--                    rows. The editor's old upsert had no ids and inserted a
--                    full duplicate copy of the document on every sync.
--  8. Realtime     — RLS on realtime.messages so private `node:<id>`
--                    channels only reach workspace members / shared users.
--  9. Indexes      — node_shares lookup by (node_id, lower(email)).

begin;

-- 1 ──────────────────────────────────────────────────────────────────────
drop policy if exists "Owner can view their business" on public.businesses;
create policy "Owner can view their business"
  on public.businesses for select
  using (businesses.owner_id = (select auth.uid()));

-- 2 ──────────────────────────────────────────────────────────────────────
drop policy if exists "Users can edit/delete their own comments" on public.comments;
drop policy if exists "Users can update their own comments" on public.comments;
drop policy if exists "Users can delete their own comments" on public.comments;

create policy "Users can update their own comments"
  on public.comments for update
  using (comments.user_id = (select auth.uid()))
  with check (comments.user_id = (select auth.uid()));

create policy "Users can delete their own comments"
  on public.comments for delete
  using (comments.user_id = (select auth.uid()));

-- 3 ──────────────────────────────────────────────────────────────────────
create or replace function public.accept_invitation(p_token text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_invitation  public.invitations;
  v_user_id     uuid;
  v_email       text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select * into v_invitation
  from public.invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('error', 'Invitation is invalid, expired, or already used');
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if lower(trim(coalesce(v_email, ''))) <> lower(trim(v_invitation.email)) then
    return jsonb_build_object(
      'error',
      'This invitation was sent to a different email address. Sign in with the invited email to accept it.'
    );
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (v_invitation.business_id, v_user_id, v_invitation.role)
  on conflict (business_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now()
  where id = v_invitation.id;

  return jsonb_build_object(
    'success', true,
    'business_id', v_invitation.business_id,
    'role', v_invitation.role
  );
end;
$$;

-- 4 ──────────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.node_shares
    add constraint node_shares_permission_check
    check (permission in ('view', 'comment', 'edit', 'full')) not valid;
exception when duplicate_object then null;
end $$;

drop policy if exists "Workspace members can insert node shares" on public.node_shares;
drop policy if exists "Workspace members can update node shares" on public.node_shares;
drop policy if exists "Workspace members can delete node shares" on public.node_shares;
drop policy if exists "Editors and admins can insert node shares" on public.node_shares;
drop policy if exists "Editors and admins can update node shares" on public.node_shares;
drop policy if exists "Editors and admins can delete node shares" on public.node_shares;

create policy "Editors and admins can insert node shares"
  on public.node_shares for insert
  with check (
    exists (
      select 1 from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = node_shares.node_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

create policy "Editors and admins can update node shares"
  on public.node_shares for update
  using (
    exists (
      select 1 from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = node_shares.node_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('ADMIN', 'EDITOR')
    )
  )
  with check (
    exists (
      select 1 from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = node_shares.node_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

create policy "Editors and admins can delete node shares"
  on public.node_shares for delete
  using (
    exists (
      select 1 from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = node_shares.node_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- 5 ──────────────────────────────────────────────────────────────────────
create or replace function public.guard_node_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-role / internal writes (MCP server, migrations) have no auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  -- Workspace editors/admins keep full control (RLS already gates them).
  if exists (
    select 1 from public.business_members bm
    where bm.business_id = old.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('ADMIN', 'EDITOR')
  ) then
    return new;
  end if;

  -- Anyone else reaching here is a shared guest: content/title only.
  if new.business_id  is distinct from old.business_id
  or new.parent_id    is distinct from old.parent_id
  or new.teamspace_id is distinct from old.teamspace_id
  or new.type         is distinct from old.type
  or new.is_archived  is distinct from old.is_archived
  or new.is_public    is distinct from old.is_public
  or new.public_slug  is distinct from old.public_slug
  or new.created_by   is distinct from old.created_by
  then
    raise exception 'Shared guests can only edit page content'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists nodes_guard_protected_columns on public.nodes;
create trigger nodes_guard_protected_columns
  before update on public.nodes
  for each row execute function public.guard_node_protected_columns();

-- 6 ──────────────────────────────────────────────────────────────────────
create or replace function public.save_yjs_snapshot(p_node_id uuid, p_snapshot_hex text)
returns void
language plpgsql
security invoker
as $$
begin
  update public.nodes
  set yjs_snapshot = decode(p_snapshot_hex, 'hex'),
      updated_at = now()
  where id = p_node_id;

  if not found then
    raise exception 'Not allowed to save this page, or it no longer exists'
      using errcode = '42501';
  end if;
end;
$$;

grant execute on function public.save_yjs_snapshot(uuid, text) to authenticated;

-- 7 ──────────────────────────────────────────────────────────────────────
-- security invoker: the caller's RLS on blocks applies (EDITOR/ADMIN only).
-- Runs in one transaction, so a failed insert rolls back the delete.
create or replace function public.replace_node_blocks(p_node_id uuid, p_blocks jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if jsonb_typeof(p_blocks) is distinct from 'array' then
    raise exception 'p_blocks must be a JSON array' using errcode = '22023';
  end if;

  delete from public.blocks where node_id = p_node_id;

  insert into public.blocks (node_id, type, content, position)
  select
    p_node_id,
    (b->>'type')::public.block_type,
    coalesce(b->'content', '{}'::jsonb),
    coalesce((b->>'position')::int, (t.ord - 1)::int)
  from jsonb_array_elements(p_blocks) with ordinality as t(b, ord);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.replace_node_blocks(uuid, jsonb) from public, anon;
grant execute on function public.replace_node_blocks(uuid, jsonb) to authenticated;

-- 9 ──────────────────────────────────────────────────────────────────────
create index if not exists idx_node_shares_node_lower_email
  on public.node_shares (node_id, lower(email));

commit;

-- 8 ──────────────────────────────────────────────────────────────────────
-- Realtime Authorization. Kept outside the transaction above and guarded,
-- because realtime.messages only exists on projects with Realtime
-- Authorization available. Only affects channels opened with
-- { config: { private: true } } (the app's editor now does this); the
-- service-role MCP server bypasses RLS.
do $realtime$
begin
  if to_regclass('realtime.messages') is null then
    raise notice 'realtime.messages not found — skipping realtime policies';
    return;
  end if;

  execute 'drop policy if exists "Node channel: members and shared users can listen" on realtime.messages';
  execute 'drop policy if exists "Node channel: editors and edit-shares can send" on realtime.messages';

  execute $p$
    create policy "Node channel: members and shared users can listen"
      on realtime.messages for select to authenticated
      using (
        realtime.topic() like 'node:%'
        and exists (
          select 1 from public.nodes n
          where n.id::text = substring(realtime.topic() from 6)
            and (
              exists (
                select 1 from public.business_members bm
                where bm.business_id = n.business_id
                  and bm.user_id = (select auth.uid())
              )
              or public.has_node_share(n.id)
            )
        )
      )
  $p$;

  execute $p$
    create policy "Node channel: editors and edit-shares can send"
      on realtime.messages for insert to authenticated
      with check (
        realtime.topic() like 'node:%'
        and exists (
          select 1 from public.nodes n
          where n.id::text = substring(realtime.topic() from 6)
            and (
              -- Document edits (broadcast): editors/admins and edit-shares only.
              exists (
                select 1 from public.business_members bm
                where bm.business_id = n.business_id
                  and bm.user_id = (select auth.uid())
                  and bm.role in ('ADMIN', 'EDITOR')
              )
              or public.has_node_edit_share(n.id)
              -- Presence ("who's here"): anyone allowed to view the page.
              or (
                realtime.messages.extension = 'presence'
                and (
                  exists (
                    select 1 from public.business_members bm
                    where bm.business_id = n.business_id
                      and bm.user_id = (select auth.uid())
                  )
                  or public.has_node_share(n.id)
                )
              )
            )
        )
      )
  $p$;
end
$realtime$;
