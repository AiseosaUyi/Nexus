-- 09_invitations.sql
-- Email-based invitation system for workspace team management.

create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  email        text not null,
  role         public.member_role not null default 'EDITOR',
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by   uuid references public.users (id) on delete set null,
  accepted_at  timestamp with time zone,
  expires_at   timestamp with time zone not null default (now() + interval '7 days'),
  created_at   timestamp with time zone default now() not null,

  -- Prevent duplicate pending invitations for the same email in the same workspace
  unique (business_id, email)
);

-- Indexes
create index if not exists idx_invitations_business_id on public.invitations (business_id);
create index if not exists idx_invitations_email       on public.invitations (email);
create index if not exists idx_invitations_token       on public.invitations (token);

-- Row Level Security
alter table public.invitations enable row level security;

-- Admins of a business can view all invitations for that business.
create policy "Admins can view workspace invitations"
  on public.invitations for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- Admins of a business can create invitations.
create policy "Admins can create invitations"
  on public.invitations for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- Admins can delete (revoke) invitations.
create policy "Admins can revoke invitations"
  on public.invitations for delete
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- The system (service role) can update invitations when accepting.
-- Any authenticated user can accept their own invitation via token lookup.
-- We enable this via a separate SECURITY DEFINER function so no RLS bypass is needed.

-- ─── Helper Function: Accept Invitation ───────────────────────────────────────
-- Called by the client when a user clicks an invitation link.
-- Validates token, checks expiry, creates the membership, and marks accepted.
create or replace function public.accept_invitation(p_token text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_invitation  public.invitations;
  v_user_id     uuid;
begin
  -- Get the current user
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- Fetch and validate the invitation
  select * into v_invitation
  from public.invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    return jsonb_build_object('error', 'Invitation is invalid, expired, or already used');
  end if;

  -- Add the user to the workspace as a member
  insert into public.business_members (business_id, user_id, role)
  values (v_invitation.business_id, v_user_id, v_invitation.role)
  on conflict (business_id, user_id) do nothing;

  -- Mark invitation as accepted
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
