-- 15_calendar_properties.sql
-- Extend calendar_entries with a flexible properties JSONB column for custom fields.

alter table public.calendar_entries
  add column if not exists properties jsonb default '{}' not null;
