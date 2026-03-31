-- 12_add_custom_name_to_nodes.sql
-- Adds support for 'Rename Override' and consistent display names in the sidebar.

-- Add name column (customizable sidebar label)
alter table public.nodes add column if not exists name text;

-- Add is_name_custom flag (to detach sidebar label from page title)
alter table public.nodes add column if not exists is_name_custom boolean not null default false;

-- Mirror title to name for existing nodes so migration is non-destructive
update public.nodes set name = title where name is null;
