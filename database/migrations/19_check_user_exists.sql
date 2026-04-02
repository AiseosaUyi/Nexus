-- 19_check_user_exists.sql
-- Function to safely check if a user with a given email already has a Nexus account.
-- Used to toggle between Login and Signup modes in the invitation flow.

create or replace function public.check_user_exists(p_email text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  return exists (
    select 1 
    from public.users 
    where email = lower(p_email)
  );
end;
$$;
