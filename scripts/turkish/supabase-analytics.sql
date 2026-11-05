-- Daily Turkish: who signs up, who comes back. Supabase → SQL Editor → New query → paste → Run.
-- Run it AFTER supabase-v2-multilang.sql (it reads public.enrollments). Safe to run again.
--
-- Everything lives in a private "analytics" schema: the website and the app can't read it
-- (only you, in the dashboard). Nothing new is collected: a day counts as "active" when the
-- learner's own progress already logs XP, new cards or reviews for it (course.xp.days,
-- cards.days), plus public.activity_days once the site writes it. So past activity counts too.
-- Days are the learner's own local days. Only people with an account are counted: visitors
-- without one are in Google Analytics.
--
-- Then read it with:
--   select * from analytics.summary;              -- the headline numbers, per language
--   select * from analytics.weekly limit 12;      -- new vs returning, week by week
--   select * from analytics.retention limit 12;   -- of each week's sign-ups, how many came back

create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

-- One row per person, language and day they studied.
create or replace view analytics.active_days as
select e.user_id, e.lang, d.day::date as day
from public.enrollments e
cross join lateral (
  select k as day from jsonb_object_keys(case when jsonb_typeof(e.course -> 'xp' -> 'days') = 'object'
                                              then e.course -> 'xp' -> 'days' else '{}'::jsonb end) k
  union
  select k from jsonb_object_keys(case when jsonb_typeof(e.cards -> 'days') = 'object'
                                       then e.cards -> 'days' else '{}'::jsonb end) k
) d
where d.day ~ '^\d{4}-\d{2}-\d{2}$'
union
select user_id, lang, day from public.activity_days;

-- Accounts: when each person signed up (all languages together).
create or replace view analytics.accounts as
select u.id as user_id, u.created_at::date as signup_day, u.last_sign_in_at
from auth.users u;

-- The headline numbers. "Returning" = studied in the period and signed up before it.
create or replace view analytics.summary as
with a as (select ad.*, ac.signup_day from analytics.active_days ad join analytics.accounts ac using (user_id))
select l.code as lang,
  (select count(*) from public.enrollments e where e.lang = l.code)                                        as learners_total,
  (select count(*) from public.enrollments e where e.lang = l.code and e.started_at > now() - interval '7 days')  as new_learners_7d,
  (select count(*) from public.enrollments e where e.lang = l.code and e.started_at > now() - interval '30 days') as new_learners_30d,
  (select count(distinct user_id) from a where a.lang = l.code and a.day = current_date)                    as active_today,
  (select count(distinct user_id) from a where a.lang = l.code and a.day > current_date - 7)               as active_7d,
  (select count(distinct user_id) from a where a.lang = l.code and a.day > current_date - 7
                                                and a.signup_day <= current_date - 7)                       as returning_7d,
  (select count(distinct user_id) from a where a.lang = l.code and a.day > current_date - 30)              as active_30d,
  (select count(distinct user_id) from a where a.lang = l.code and a.day > current_date - 30
                                                and a.signup_day <= current_date - 30)                      as returning_30d
from public.languages l
union all
select 'all accounts', (select count(*) from analytics.accounts),
  (select count(*) from analytics.accounts where signup_day > current_date - 7),
  (select count(*) from analytics.accounts where signup_day > current_date - 30),
  null, null, null, null, null;

-- Week by week (weeks start on Monday): new accounts, people active, and how many of those were returning.
create or replace view analytics.weekly as
with weeks as (
  select generate_series(date_trunc('week', coalesce((select min(signup_day) from analytics.accounts), current_date)),
                         date_trunc('week', current_date), interval '1 week')::date as week
),
act as (
  select distinct ad.user_id, date_trunc('week', ad.day)::date as week, ac.signup_day
  from analytics.active_days ad join analytics.accounts ac using (user_id)
)
select w.week,
  (select count(*) from analytics.accounts ac where date_trunc('week', ac.signup_day)::date = w.week) as new_accounts,
  (select count(*) from act where act.week = w.week)                                                 as active_users,
  (select count(*) from act where act.week = w.week and act.signup_day < w.week)                     as returning_users,
  (select count(*) from act where act.week = w.week and act.signup_day >= w.week)                    as new_and_active
from weeks w
order by w.week desc;

-- Retention: of the people who signed up in a week, the share who studied again
-- on a later day, in their second week, and a month on (days 28 to 55 after signing up).
create or replace view analytics.retention as
with c as (
  select ac.user_id, ac.signup_day, date_trunc('week', ac.signup_day)::date as cohort,
    bool_or(ad.day > ac.signup_day)                                          as came_back,
    bool_or(ad.day between ac.signup_day + 7 and ac.signup_day + 13)         as week_2,
    bool_or(ad.day between ac.signup_day + 28 and ac.signup_day + 55)        as month_2
  from analytics.accounts ac left join analytics.active_days ad using (user_id)
  group by ac.user_id, ac.signup_day
)
select cohort as signup_week, count(*) as signed_up,
  round(100.0 * count(*) filter (where came_back) / count(*)) as came_back_pct,
  case when max(signup_day) + 13 <= current_date then round(100.0 * count(*) filter (where week_2) / count(*)) end  as week_2_pct,
  case when max(signup_day) + 55 <= current_date then round(100.0 * count(*) filter (where month_2) / count(*)) end as month_2_pct
from c
group by cohort
order by cohort desc;
