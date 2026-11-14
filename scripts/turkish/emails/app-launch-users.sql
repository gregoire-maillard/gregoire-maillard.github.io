-- Daily Turkish: who gets the "now on iPhone" email.
-- Supabase → SQL Editor → New query → paste → Run → Export → Download CSV.
-- Read-only: it changes nothing.
--
-- KEEP THE CSV OUT OF THIS REPO. The repo is public (GitHub Pages), so a CSV of e-mail
-- addresses committed here would be published. Leave it in Downloads and delete it afterwards.
--
-- One row per learner whose email is confirmed (sign-ups that never clicked their
-- confirmation link are left out: some are typos, and they would bounce).
-- first_name is the first word of the display name they chose, empty if they didn't choose one
-- (the email then says "Merhaba arkadaşım!").
-- Only Turkish exists in public.languages today; once other courses share this database, add
--   and exists (select 1 from public.enrollments e where e.user_id = u.id and e.lang = 'tr')

select
  u.email,
  coalesce(split_part(btrim(p.display_name), ' ', 1), '') as first_name
from auth.users u
left join public.profiles p on p.user_id = u.id
where u.email is not null
  and u.email_confirmed_at is not null
  and u.deleted_at is null
  and coalesce(u.is_anonymous, false) = false
order by u.created_at;
