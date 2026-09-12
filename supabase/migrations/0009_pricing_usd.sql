-- Switch the editable display price from INR to USD.
alter table public.pricing_config
  add column pro_price_usd numeric(10,2) check (pro_price_usd >= 0);

-- ~1999 INR at the time this was set, converted to a clean USD price point.
update public.pricing_config set pro_price_usd = 24 where id = 1;

alter table public.pricing_config
  alter column pro_price_usd set not null,
  alter column pro_price_usd set default 24;

alter table public.pricing_config drop column pro_price_inr;

-- Column-level grants aren't affected by add/drop column on an existing
-- table (the table-level select grant to authenticated/anon from 0008
-- already covers it), so no grant changes needed here.
