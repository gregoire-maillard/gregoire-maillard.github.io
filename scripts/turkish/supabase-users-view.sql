-- Daily Turkish: one row per learner and language, for you to read in the dashboard.
-- Supabase → SQL Editor → New query → paste → Run. Safe to run again.
-- Run it AFTER supabase-v2-multilang.sql and supabase-platforms.sql (MAIL-2: new columns). It lives in the private "analytics" schema, so the
-- website and the app can't read it (it contains e-mail addresses).
--
-- Then:  select * from analytics.users;
--
-- last_lesson       id of the most recently completed lesson, e.g. a1-u03-l02 (level A1, unit 3, lesson 2)
-- lessons_completed lessons done, including ones skipped with a "Jump here" test
-- cards_played      flashcard answers given (new cards + reviews, all days)
-- cards_seen        different flashcards the learner has started
-- last_seen_at      the later of the last sign-in and the last time progress was saved
-- signup_from       where the account was created: iPhone app · website, phone or tablet · website, computer;
--                   "website" for accounts made before the app had profiles (APP-9, 12 Nov 2026);
--                   "not recorded" for accounts made between then and the version that records it (MAIL-2)
-- used_app          true if the profile was used in the iPhone app (last_app_at), or, for app versions from
--                   before MAIL-2, if one of its current sign-ins comes from the app (see app_signin)
-- last_app_at       last time the profile was used in the app (MAIL-2 and later versions)
-- last_web_at       last time the profile was used on the website (MAIL-2 and later)

create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

drop view if exists analytics.users;
create view analytics.users as
select
  p.display_name                                         as name,
  u.email,
  case u.raw_user_meta_data ->> 'signup_platform'
    when 'ios-app'     then 'iPhone app'
    when 'web-mobile'  then 'website, phone or tablet'
    when 'web-desktop' then 'website, computer'
    else case when u.created_at < '2026-11-12' then 'website' else 'not recorded' end
  end                                                    as signup_from,
  (p.last_app_at is not null or coalesce(s.app_signin, false)) as used_app,
  p.last_app_at,
  p.last_web_at,
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
-- A current sign-in from the app: iPhone or iPad web views that aren't Safari or another browser's in-app view.
-- Only sign-ins still active count (Supabase deletes them on sign-out), so this is a lower bound.
left join lateral (
  select bool_or(ss.user_agent ~ '(iPhone|iPad)' and ss.user_agent !~ '(Safari|CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|GSA|Snapchat|LinkedInApp|Twitter|YahooMobile|Line/)') as app_signin
  from auth.sessions ss
  where ss.user_id = u.id
) s on true
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
