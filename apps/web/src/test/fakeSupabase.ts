// Minimal in-memory stand-in for the Supabase query builder, enough for
// lib/docs/content.ts: select/insert/update/delete with eq/is/in filters,
// order, limit, single/maybeSingle, plus rpc and realtime channel stubs.
// Filters are really applied, so tenant-scoping bugs show up as wrong rows.

type Row = Record<string, any>;

export interface FakeDb {
  tables: Record<string, Row[]>;
  rpcCalls: Array<{ fn: string; args: any }>;
  from: (table: string) => any;
  rpc: (fn: string, args: any) => Promise<{ data: null; error: null }>;
  channel: () => any;
  removeChannel: () => Promise<void>;
}

export function createFakeDb(seed: Record<string, Row[]> = {}): FakeDb {
  const tables: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map((r) => ({ ...r }));
  let idCounter = 0;
  const rpcCalls: Array<{ fn: string; args: any }> = [];

  function builder(table: string) {
    const rows = (tables[table] ??= []);
    const filters: Array<(r: Row) => boolean> = [];
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: any;
    let orderBy: { col: string; asc: boolean } | null = null;
    let limitN: number | null = null;
    let returning = false;

    const run = () => {
      if (op === 'insert') {
        const inserted = (Array.isArray(payload) ? payload : [payload]).map((p: Row) => ({ id: p.id ?? `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`, ...p }));
        rows.push(...inserted);
        return { data: returning ? inserted : null, error: null };
      }
      let matched = rows.filter((r) => filters.every((f) => f(r)));
      if (op === 'update') {
        for (const r of matched) Object.assign(r, payload);
        return { data: returning ? matched.map((r) => ({ ...r })) : null, error: null };
      }
      if (op === 'delete') {
        tables[table] = rows.filter((r) => !matched.includes(r));
        return { data: null, error: null };
      }
      if (orderBy) {
        const { col, asc } = orderBy;
        matched = [...matched].sort((a, b) => (a[col] === b[col] ? 0 : (a[col] < b[col] ? -1 : 1) * (asc ? 1 : -1)));
      }
      if (limitN !== null) matched = matched.slice(0, limitN);
      return { data: matched.map((r) => ({ ...r })), error: null };
    };

    const q: any = {
      select: () => {
        if (op !== 'select') returning = true;
        return q;
      },
      insert: (v: any) => ((op = 'insert'), (payload = v), q),
      update: (v: any) => ((op = 'update'), (payload = v), q),
      delete: () => ((op = 'delete'), q),
      eq: (c: string, v: any) => (filters.push((r) => r[c] === v), q),
      is: (c: string, v: any) => (filters.push((r) => (r[c] ?? null) === v), q),
      in: (c: string, vs: any[]) => (filters.push((r) => vs.includes(r[c])), q),
      order: (col: string, o?: { ascending?: boolean }) => ((orderBy = { col, asc: o?.ascending !== false }), q),
      limit: (n: number) => ((limitN = n), q),
      maybeSingle: async () => {
        const { data } = run();
        return { data: (data as Row[] | null)?.[0] ?? null, error: null };
      },
      single: async () => {
        const { data } = run();
        const row = (data as Row[] | null)?.[0];
        return row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } };
      },
      then: (resolve: any, reject: any) => Promise.resolve(run()).then(resolve, reject),
    };
    return q;
  }

  return {
    tables,
    rpcCalls,
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: any) => {
      rpcCalls.push({ fn, args });
      if (fn === 'save_yjs_snapshot') {
        const node = (tables.nodes ?? []).find((n) => n.id === args.p_node_id);
        if (node) node.yjs_snapshot = '\\x' + args.p_snapshot_hex;
      }
      return { data: null, error: null };
    },
    channel: () => ({ subscribe: (cb: (s: string) => void) => cb('SUBSCRIBED'), send: async () => undefined }),
    removeChannel: async () => undefined,
  };
}
