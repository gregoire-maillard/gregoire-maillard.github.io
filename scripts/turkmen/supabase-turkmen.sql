-- Daily Turkmen → accounts (ACCT-TK). Supabase → SQL Editor → New query → paste → Run. Safe to run again.
--
-- Daily Turkmen signs in to the same Supabase project as Daily Turkish (assets/js/turkmen-account.js), so one account
-- works on both sites. The tables are the multi-language ones of scripts/turkish/supabase-v2-multilang.sql: the person
-- in public.profiles (shared), the progress in public.enrollments with lang = 'tk' (next to the Turkish 'tr' row),
-- activity_days, item_stats and feedback likewise per language. All they need is the language itself:
insert into public.languages (code, name) values ('tk', 'Turkmen') on conflict (code) do nothing;

-- Also, once, in the dashboard (not SQL):
--   Authentication › URL Configuration › Redirect URLs: add
--     https://dailyturkmen.app/**
--     https://gregoiremaillard.com/turkmen/**
--   so the emailed links (confirm email, reset password, sign-in link) can bring learners back to Daily Turkmen.
--   Without them, Supabase sends those links to the Site URL (Daily Turkish) instead.
--
-- To see the Turkmen learners:
--   select p.display_name, u.email, e.xp, e.lessons_done, e.words_learned, e.level, e.last_active_at
--   from public.enrollments e join public.profiles p using (user_id) join auth.users u on u.id = e.user_id
--   where e.lang = 'tk' order by e.last_active_at desc nulls last;
