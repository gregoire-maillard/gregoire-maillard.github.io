-- Daily Turkish: one row per learner and language, for you to read in the dashboard.
-- Supabase → SQL Editor → New query → paste → Run. Safe to run again.
-- Run it AFTER supabase-v2-multilang.sql. It lives in the private "analytics" schema, so the
-- website and the app can't read it (it contains e-mail addresses).
--
-- Then:  select * from analytics.users;
--
-- last_lesson       id of the most recently completed lesson, e.g. a1-u03-l02 (level A1, unit 3, lesson 2)
-- lessons_completed lessons done, including ones skipped with a "Jump here" test
-- cards_played      flashcard answers given (new cards + reviews, all days)
-- cards_seen        different flashcards the learner has started
-- last_seen_at      the later of the last sign-in and the last time progress was saved

create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

create or replace view analytics.users as
select
  p.display_name                                         as name,
  u.email,
  e.lang,
  ll.lesson_id                                           as last_lesson,
  ll.completed_at                                        as last_lesson_at,
  coalesce(lc.n, 0)                                      as lessons_completed,
  coalesce(cp.n, 0)                                      as cards_played,
  coalesce(cs.n, 0)                                      as cards_seen,
  u.created_at                                           as account_created_at,
  greatest(u.last_sign_in_at, e.last_active_at)          as last_seen_at,
  p.timezone
from auth.users u
left join public.profiles p    on p.user_id = u.id
left join public.enrollments e on e.user_id = u.id
-- lessons in course.lessons, each with a "last" timestamp
left join lateral (
  select count(*) as n
  from jsonb_object_keys(case when jsonb_typeof(e.course -> 'lessons') = 'object' then e.course -> 'lessons' else '{}' end)
) lc on true
left join lateral (
  select l.key as lesson_id, (l.value ->> 'last')::timestamptz as completed_at
  from jsonb_each(case when jsonb_typeof(e.course -> 'lessons') = 'object' then e.course -> 'lessons' else '{}' end) l
  order by l.value ->> 'last' desc nulls last
  limit 1
) ll on true
-- flashcard answers per day in cards.days: {"2026-11-10": {"new": 5, "reviews": 12}, …}
left join lateral (
  select sum(coalesce((d.value ->> 'new')::int, 0) + coalesce((d.value ->> 'reviews')::int, 0)) as n
  from jsonb_each(case when jsonb_typeof(e.cards -> 'days') = 'object' then e.cards -> 'days' else '{}' end) d
) cp on true
left join lateral (
  select count(*) as n
  from jsonb_object_keys(case when jsonb_typeof(e.cards -> 'cards') = 'object' then e.cards -> 'cards' else '{}' end)
) cs on true
order by last_seen_at desc nulls last;

revoke all on analytics.users from public, anon, authenticated;
