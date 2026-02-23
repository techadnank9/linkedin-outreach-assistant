create extension if not exists pgcrypto;

create table if not exists candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  linkedin_url text,
  name text,
  headline text,
  summary text,
  location text,
  email text,
  phone text,
  highest_education text,
  years_of_experience numeric,
  skills_list text[] default '{}',
  achievements text[] default '{}',
  skills text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists target_profiles (
  id uuid primary key default gen_random_uuid(),
  linkedin_url text,
  name text,
  role text,
  company text,
  focus_areas text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists draft_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid references candidate_profiles(id) on delete set null,
  target_profile_id uuid references target_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists email_variants (
  id uuid primary key default gen_random_uuid(),
  draft_session_id uuid not null references draft_sessions(id) on delete cascade,
  tone text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists outcome_events (
  id uuid primary key default gen_random_uuid(),
  draft_session_id uuid not null references draft_sessions(id) on delete cascade,
  status text not null check (status in ('sent', 'replied', 'interview')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists manual_scraped_profiles (
  id uuid primary key default gen_random_uuid(),
  linkedin_url text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidate_added_skills (
  id uuid primary key default gen_random_uuid(),
  linkedin_url text not null,
  skill text not null,
  created_at timestamptz not null default now(),
  unique (linkedin_url, skill)
);
