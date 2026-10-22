-- Turkish course: online profiles. Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again: it only adds what's missing.

-- 1. One row per learner: their name and character, their progress (the same three parts the browser
--    keeps), and a few summary numbers you can query (xp, lessons_done, words_learned, level).
create table if not exists public.profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text check (char_length(display_name) between 1 and 40),
  course        jsonb,
  cards         jsonb,
  settings      jsonb,
  xp            integer not null default 0,
  lessons_done  integer not null default 0,
  words_learned integer not null default 0,
  level         text,
  rev           integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- The character picked on the profile page (added 22 Oct 2026).
alter table public.profiles add column if not exists avatar text
  check (avatar in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2'));

-- 2. Row-level security: each learner can only see and change their own row.
alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "delete own profile" on public.profiles;
create policy "read own profile"   on public.profiles for select
  to authenticated using ((select auth.uid()) = user_id);
create policy "insert own profile" on public.profiles for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "update own profile" on public.profiles for update
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own profile" on public.profiles for delete
  to authenticated using ((select auth.uid()) = user_id);

-- 3. "Delete my profile" button: removes the learner's sign-in, which also deletes their row.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 4. The test table from the first setup isn't used any more (it was empty).
drop table if exists public.progress;
