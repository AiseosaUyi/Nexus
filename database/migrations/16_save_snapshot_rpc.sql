-- 16_save_snapshot_rpc.sql
-- RPC function for saving Yjs snapshots as bytea.
-- Bypasses PostgREST JSON encoding issues with bytea columns by using
-- PostgreSQL's decode() directly.

create or replace function public.save_yjs_snapshot(p_node_id uuid, p_snapshot_hex text)
returns void
language plpgsql
security invoker
as $$
begin
  update public.nodes
  set yjs_snapshot = decode(p_snapshot_hex, 'hex'),
      updated_at = now()
  where id = p_node_id;
end;
$$;

-- Grant access to authenticated users (RLS on nodes table still applies)
grant execute on function public.save_yjs_snapshot(uuid, text) to authenticated;
