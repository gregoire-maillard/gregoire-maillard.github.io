-- Run ONLY after the new site code (enrollments) has been live for a day. Copies anything written
-- to the old columns in between, then removes them from profiles.
insert into public.enrollments (user_id, lang, course, cards, settings, rev, xp, lessons_done, words_learned, level, updated_at)
select user_id, 'tr', course, cards, settings, rev, xp, lessons_done, words_learned, level, updated_at
from public.profiles where course is not null or cards is not null
on conflict (user_id, lang) do update set
  course = excluded.course, cards = excluded.cards, settings = excluded.settings, rev = excluded.rev,
  xp = excluded.xp, lessons_done = excluded.lessons_done, words_learned = excluded.words_learned,
  level = excluded.level, updated_at = excluded.updated_at
where public.enrollments.updated_at < excluded.updated_at;

alter table public.profiles
  drop column if exists course, drop column if exists cards, drop column if exists settings,
  drop column if exists xp, drop column if exists lessons_done, drop column if exists words_learned,
  drop column if exists level, drop column if exists rev;
