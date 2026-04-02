-- 18_get_invitation_details.sql
-- Function to securely fetch invitation details via token bypass for the landing page.

create or replace function public.get_invitation_by_token(p_token text)
returns table (
  id uuid,
  email text,
  role public.member_role,
  business_id uuid,
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone,
  business_name text,
  business_slug text
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select 
    i.id, i.email, i.role, i.business_id, i.accepted_at, i.expires_at,
    b.name as business_name, b.slug as business_slug
  from public.invitations i
  join public.businesses b on b.id = i.business_id
  where i.token = p_token;
end;
$$;
