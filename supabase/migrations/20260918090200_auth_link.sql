-- Admins sign in with Supabase Auth (spec §78) while still being ordinary players
-- in every other respect. This links the two by email the moment an auth user is
-- created, so inviting an organiser is a single step in the Supabase dashboard.

create or replace function public.link_auth_user_to_player()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players
     set auth_user_id = new.id
   where auth_user_id is null
     and email is not null
     and lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.link_auth_user_to_player();

-- Existing auth users, for a database that is set up the other way round.
update public.players p
   set auth_user_id = u.id
  from auth.users u
 where p.auth_user_id is null
   and p.email is not null
   and lower(p.email) = lower(u.email);
