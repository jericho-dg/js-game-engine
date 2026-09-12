-- Supabase Auth: replace custom cloud_users/cloud_sessions with auth.users + profiles.
-- Run after 001_cloud_backend.sql. Existing cloud_users data is not migrated.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Repoint foreign keys from cloud_users to auth.users
alter table if exists cloud_projects
  drop constraint if exists cloud_projects_user_id_fkey;
alter table if exists cloud_projects
  add constraint cloud_projects_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists cloud_shares
  drop constraint if exists cloud_shares_owner_id_fkey;
alter table if exists cloud_shares
  add constraint cloud_shares_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete cascade;

alter table if exists published_games
  drop constraint if exists published_games_user_id_fkey;
alter table if exists published_games
  add constraint published_games_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

drop table if exists cloud_sessions;
drop table if exists cloud_users;
