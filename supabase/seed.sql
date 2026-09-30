-- Minimal sample content for a fresh Supabase project (supabase db reset runs this automatically).

insert into public.coupons (id, kind, title, description, fine_print, expires_on, single_use, tracker_goal, tracker_unit, sort_order) values
  ('c-free-app', 'free-app', 'Free App with Entrée', 'Any starter up to $12 free with the purchase of an entrée.', 'One per table. Dine-in only.', current_date + 30, true, null, null, 1),
  ('c-kids', 'kids-meal', 'Free Kids Meal with Entrée', 'One free kids meal per adult entrée purchased.', 'Kids 12 & under. Dine-in only.', current_date + 30, true, null, null, 2),
  ('c-wings', 'wings-bogo', 'Buy 10 Wings, Get 10 Free', 'Order 10 wings in any flavor, get 10 more on us.', 'Equal or lesser value.', current_date + 30, true, null, null, 3),
  ('c-half-apps', 'half-apps', 'Half-Off Apps Club', 'Check in during 5 happy hours to unlock a half-off starters voucher.', 'Dine-in only.', current_date + 60, false, 5, 'happy hour visits', 4);

with p as (
  insert into public.polls (category, question, featured, closes_at)
  values ('debates', 'Wings: ranch or blue cheese?', true, now() + interval '7 days')
  returning id
)
insert into public.poll_options (poll_id, label, emoji, sort_order)
select p.id, o.label, o.emoji, o.sort_order
from p, (values ('Ranch', '🥛', 1), ('Blue Cheese', '🧀', 2), ('Naked, like a pro', '💪', 3)) as o(label, emoji, sort_order);

insert into public.flash_deals (deal_date, title, description, fine_print)
select d::date, '$3 Drafts', 'Any 16 oz domestic draft for $3 until 7 PM.', 'Dine-in only. Limit 3 per guest.'
from generate_series(current_date, current_date + 6, interval '1 day') as d;
