-- Daily Turkish → multi-language accounts (v2). Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again. It does NOT delete anything: the old progress columns of profiles stay until
-- supabase-v2-cleanup.sql is run, once the new site code is live.
--
-- Model:  profiles      one row per person (name, character, time zone): no language in it
--         languages     the courses that exist ('tr', later 'tk', 'az'…): adding a language = one insert
--         enrollments   one row per person per language: the progress (course, cards, settings) + stats
--         activity_days one row per person, language and day: XP, new cards, reviews (streaks, retention)
--         item_stats    one row per exercise: attempts and first-try successes, anonymous
--         feedback      "report a mistake" messages

-- 1. Languages ------------------------------------------------------------------------------------
create table if not exists public.languages (
  code       text primary key check (code ~ '^[a-z]{2,3}$'),   -- ISO 639 code
  name       text not null,
  status     text not null default 'live' check (status in ('live', 'beta', 'hidden')),
  created_at timestamptz not null default now()
);
insert into public.languages (code, name) values ('tr', 'Turkish') on conflict (code) do nothing;
alter table public.languages enable row level security;
grant select on public.languages to anon, authenticated;
drop policy if exists "languages are public" on public.languages;
create policy "languages are public" on public.languages for select to anon, authenticated using (true);

-- 2. Profiles: the person ------------------------------------------------------------------------
alter table public.profiles add column if not exists timezone  text check (char_length(timezone) <= 64);
alter table public.profiles add column if not exists ui_locale text check (ui_locale ~ '^[a-z]{2}(-[A-Z]{2})?$');
alter table public.profiles add column if not exists marketing_opt_in boolean not null default false;

-- A profile row is created with every new sign-in.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
insert into public.profiles (user_id) select id from auth.users on conflict (user_id) do nothing;

-- 3. Enrollments: the progress in one language ----------------------------------------------------
create table if not exists public.enrollments (
  user_id         uuid not null references auth.users(id) on delete cascade,
  lang            text not null references public.languages(code),
  course          jsonb,
  cards           jsonb,
  settings        jsonb,
  rev             integer not null default 1,
  xp              integer not null default 0,
  lessons_done    integer not null default 0,
  words_learned   integer not null default 0,
  level           text,
  goal            text check (goal in ('travel', 'family', 'work', 'study', 'exam', 'culture', 'other')),
  placement_level text check (placement_level in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2')),
  started_at      timestamptz not null default now(),
  last_active_at  timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (user_id, lang)
);
create index if not exists enrollments_lang_idx on public.enrollments (lang, last_active_at);
alter table public.enrollments enable row level security;
grant select, insert, update, delete on public.enrollments to authenticated;
drop policy if exists "own enrollments" on public.enrollments;
create policy "own enrollments" on public.enrollments for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Copy the Turkish progress out of profiles. Re-runnable: a newer profiles row overwrites an older copy.
insert into public.enrollments (user_id, lang, course, cards, settings, rev, xp, lessons_done, words_learned, level,
                                started_at, last_active_at, updated_at)
select user_id, 'tr', course, cards, settings, rev, xp, lessons_done, words_learned, level, created_at, updated_at, updated_at
from public.profiles
where course is not null or cards is not null
on conflict (user_id, lang) do update set
  course = excluded.course, cards = excluded.cards, settings = excluded.settings, rev = excluded.rev,
  xp = excluded.xp, lessons_done = excluded.lessons_done, words_learned = excluded.words_learned,
  level = excluded.level, last_active_at = excluded.last_active_at, updated_at = excluded.updated_at
where public.enrollments.updated_at < excluded.updated_at;

-- 4. Activity per day -----------------------------------------------------------------------------
create table if not exists public.activity_days (
  user_id   uuid not null references auth.users(id) on delete cascade,
  lang      text not null references public.languages(code),
  day       date not null,
  xp        integer not null default 0 check (xp >= 0),
  new_cards integer not null default 0 check (new_cards >= 0),
  reviews   integer not null default 0 check (reviews >= 0),
  primary key (user_id, lang, day)
);
create index if not exists activity_days_day_idx on public.activity_days (lang, day);
alter table public.activity_days enable row level security;
grant select, insert, update, delete on public.activity_days to authenticated;
drop policy if exists "own activity" on public.activity_days;
create policy "own activity" on public.activity_days for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 5. Exercise statistics (anonymous) --------------------------------------------------------------
create table if not exists public.item_stats (
  lang       text not null references public.languages(code),
  item_id    text not null check (char_length(item_id) <= 80),
  attempts   bigint not null default 0,
  correct    bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (lang, item_id)
);
alter table public.item_stats enable row level security;
revoke all on public.item_stats from anon, authenticated;   -- only through record_attempts(); read it in the dashboard

-- items: [{"id": "a1-u02-l01-e03", "ok": true}, …] (first tries only, at most 200 per call)
create or replace function public.record_attempts(p_lang text, items jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sign in first'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 200 then raise exception 'bad items'; end if;
  insert into public.item_stats as s (lang, item_id, attempts, correct)
  select p_lang, i->>'id', count(*), count(*) filter (where (i->>'ok')::boolean)
  from jsonb_array_elements(items) i
  where i->>'id' ~ '^[a-z0-9-]{1,80}$'
  group by i->>'id'
  on conflict (lang, item_id) do update set
    attempts = s.attempts + excluded.attempts, correct = s.correct + excluded.correct, updated_at = now();
end $$;
revoke execute on function public.record_attempts(text, jsonb) from public, anon;
grant execute on function public.record_attempts(text, jsonb) to authenticated;

-- 6. Feedback -------------------------------------------------------------------------------------
create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete cascade default auth.uid(),
  lang       text not null references public.languages(code),
  item_id    text check (char_length(item_id) <= 80),
  kind       text not null check (kind in ('typo', 'wrong-answer', 'audio', 'other')),
  message    text not null check (char_length(message) between 1 and 2000),
  page       text check (char_length(page) <= 200),
  status     text not null default 'new' check (status in ('new', 'fixed', 'wontfix')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
grant insert on public.feedback to authenticated;
grant select on public.feedback to authenticated;
drop policy if exists "send feedback" on public.feedback;
drop policy if exists "read own feedback" on public.feedback;
create policy "send feedback" on public.feedback for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'new');
create policy "read own feedback" on public.feedback for select to authenticated
  using ((select auth.uid()) = user_id);
