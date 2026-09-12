-- js-game-engine cloud backend (custom auth until Supabase Auth migration)

create table if not exists cloud_users (
  id uuid primary key,
  display_name text not null,
  password_hash text not null,
  salt text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists cloud_users_display_name_lower_idx
  on cloud_users (lower(display_name));

create table if not exists cloud_sessions (
  token text primary key,
  user_id uuid not null references cloud_users(id) on delete cascade,
  display_name text not null,
  expires_at timestamptz not null
);

create index if not exists cloud_sessions_user_id_idx on cloud_sessions(user_id);
create index if not exists cloud_sessions_expires_at_idx on cloud_sessions(expires_at);

create table if not exists cloud_projects (
  user_id uuid not null references cloud_users(id) on delete cascade,
  id uuid not null,
  name text not null,
  updated_at bigint not null,
  storage_path text not null,
  primary key (user_id, id)
);

create index if not exists cloud_projects_user_updated_idx
  on cloud_projects(user_id, updated_at desc);

create table if not exists cloud_shares (
  token uuid primary key,
  owner_id uuid not null references cloud_users(id) on delete cascade,
  owner_display_name text not null,
  project_id uuid not null,
  project_name text not null,
  created_at bigint not null,
  updated_at bigint not null,
  unique (owner_id, project_id)
);

create table if not exists published_games (
  publish_id uuid primary key,
  user_id uuid references cloud_users(id) on delete set null,
  title text,
  is_public boolean not null default false,
  updated_at bigint not null
);

create index if not exists published_games_public_updated_idx
  on published_games(is_public, updated_at desc)
  where is_public = true;

insert into storage.buckets (id, name, public)
values
  ('project-archives', 'project-archives', false),
  ('published-games', 'published-games', false)
on conflict (id) do nothing;
