-- Optional scheduled re-scans (weekly/monthly), gated to paid plans at the API layer.
create type public.scan_frequency as enum ('none', 'weekly', 'monthly');

alter table public.targets
  add column scan_frequency public.scan_frequency not null default 'none';
