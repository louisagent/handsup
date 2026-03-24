-- Function to look up a user's email by their username
-- Uses SECURITY DEFINER to access auth.users with elevated privileges
-- Only returns email if the username exists — doesn't expose anything else
create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select au.email into v_email
  from auth.users au
  inner join public.profiles p on p.id = au.id
  where lower(p.username) = lower(p_username)
  limit 1;
  
  return v_email; -- returns null if not found
end;
$$;

-- Grant execute to anon and authenticated roles
grant execute on function public.get_email_by_username(text) to anon, authenticated;
