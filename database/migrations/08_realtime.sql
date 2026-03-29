-- 08_realtime.sql
-- Enable Realtime for nodes and blocks table to support collaborative editing

-- Enable Realtime for the 'nodes' and 'blocks' tables
begin;
  -- Remove existing publication if it exists to avoid errors
  drop publication if exists supabase_realtime;
  
  -- Create the publication with the tables we want to track
  create publication supabase_realtime for table nodes, blocks;
commit;

-- Add a column to store the Yjs binary snapshot for CRDT-based synchronization
alter table public.nodes add column if not exists yjs_snapshot bytea;

-- Add a comment to the new column
comment on column public.nodes.yjs_snapshot is 'Stores the Yjs binary document state for collaborative editing.';
