'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Node, NodeType, CreateNodePayload, Block, BlockType, Teamspace } from '@nexus/api/schema';

/**
 * Updates a node's Yjs binary snapshot for real-time synchronization.
 * Uses an RPC function with PostgreSQL decode() to bypass PostgREST bytea encoding issues.
 */
export async function updateYjsSnapshot(nodeId: string, snapshot: number[]) {
  const supabase = await createClient();

  const hexString = Buffer.from(snapshot).toString('hex');

  const { error } = await supabase.rpc('save_yjs_snapshot', {
    p_node_id: nodeId,
    p_snapshot_hex: hexString,
  });

  if (error) {
    console.error(`[BACKEND] Error updating Yjs snapshot for node ${nodeId}:`, error);
    return { error: error.message };
  }

  console.log(`[BACKEND] Yjs snapshot updated for node ${nodeId} (${snapshot.length} bytes)`);
  return { success: true };
}

/**
 * Creates a new node (folder or document) within a business workspace.
 */
export async function createNode(payload: {
  business_id: string;
  type: NodeType;
  parent_id?: string | null;
  teamspace_id?: string | null;
  title?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get the current max position for siblings to place the new node at the bottom
  const { data: siblings, error: positionError } = await supabase
    .from('nodes')
    .select('position')
    .eq('business_id', payload.business_id)
    .eq('parent_id', payload.parent_id || null)
    .order('position', { ascending: false })
    .limit(1);

  if (positionError) {
    console.error('Error fetching sibling positions:', positionError);
  }

  const nextPosition = (siblings?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('nodes')
    .insert([
      {
        business_id: payload.business_id,
        type: payload.type,
        parent_id: payload.parent_id || null,
        teamspace_id: payload.teamspace_id || null,
        title: payload.title || 'Untitled',
        name: payload.title || 'Untitled', // Sync name by default
        is_name_custom: false,
        position: nextPosition,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(`[BACKEND] Error creating node for user ${user.id}:`, error);
    if (error.message.includes("teamspace_id")) {
      return { 
        error: "Database column 'teamspace_id' missing. Please run: database/migrations/10_teamspaces.sql" 
      };
    }
    if (error.message.includes("is_name_custom")) {
      return { 
        error: "Database column 'is_name_custom' missing. Please run: database/migrations/12_add_custom_name_to_nodes.sql" 
      };
    }
    return { error: error.message };
  }

  console.log(`[BACKEND] Node created successfully: ${data.id} (Type: ${data.type}, Business: ${data.business_id})`);
  revalidatePath('/', 'layout');
  return { data };
}

/**
 * Updates a node's properties (title, icon, parent_id, position).
 */
export async function updateNode(
  nodeId: string,
  updates: Partial<Pick<Node, 'title' | 'name' | 'is_name_custom' | 'icon' | 'parent_id' | 'position' | 'is_archived' | 'teamspace_id' | 'is_public' | 'public_slug'>>
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('nodes')
    .update(updates)
    .eq('id', nodeId)
    .select()
    .single();

  if (error) {
    console.error(`[BACKEND] Error updating node ${nodeId}:`, error);
    return { error: error.message };
  }

  console.log(`[BACKEND] Node updated successfully: ${nodeId} (Updates: ${Object.keys(updates).join(', ')})`);
  revalidatePath('/', 'layout');
  return { data };
}

/**
 * Permanently deletes a node.
 * Note: RLS policies and foreign key constraints (CASCADE) handle child nodes.
 */
export async function deleteNode(nodeId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('nodes')
    .delete()
    .eq('id', nodeId);

  if (error) {
    console.error(`[BACKEND] Error deleting node ${nodeId}:`, error);
    return { error: error.message };
  }

  console.log(`[BACKEND] Node deleted successfully: ${nodeId}`);
  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Duplicates a node.
 */
export async function duplicateNode(nodeId: string) {
  const supabase = await createClient();

  const { data: original, error: fetchError } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', nodeId)
    .single();

  if (fetchError || !original) {
    console.error(`[BACKEND] Error fetching original node for duplication:`, fetchError);
    return { error: 'Node not found' };
  }

  const { data, error } = await supabase
    .from('nodes')
    .insert([
      {
        business_id: original.business_id,
        type: original.type,
        parent_id: original.parent_id,
        title: `${original.title} (Copy)`,
        icon: original.icon,
        position: original.position + 1, // Place it right after
        created_by: original.created_by,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(`[BACKEND] Error duplicating node:`, error);
    return { error: error.message };
  }

  console.log(`[BACKEND] Node duplicated successfully: ${data.id} from ${nodeId}`);
  revalidatePath('/', 'layout');
  return { data };
}

/**
 * Syncs a set of blocks for a specific node.
 */
export async function syncBlocks(nodeId: string, blocks: { id?: string; type: BlockType; content: any; position: number }[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const blocksToUpsert = blocks.map(block => ({
    ...block,
    node_id: nodeId,
    id: block.id || undefined,
  }));

  const { data, error: upsertError } = await supabase
    .from('blocks')
    .upsert(blocksToUpsert, { onConflict: 'id' })
    .select();

  if (upsertError) {
    console.error(`[BACKEND] Error syncing blocks:`, upsertError);
    return { error: upsertError.message };
  }

  // Optional: Cleanup logic can be added here if needed

  console.log(`[BACKEND] Synced ${blocks.length} blocks for node ${nodeId}`);
  await supabase.from('nodes').update({ updated_at: new Date().toISOString() }).eq('id', nodeId);
  
  return { data };
}

/**
 * Fetches all blocks for a specific node.
 */
export async function getBlocks(nodeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('node_id', nodeId)
    .order('position', { ascending: true });

  if (error) {
    console.error(`[BACKEND] Error fetching blocks:`, error);
    return [];
  }

  return data as Block[];
}

/**
 * Fetches all non-archived nodes for a specific business.
 */
export async function getUserNodes(businessId: string) {
  const supabase = await createClient();

  const startTime = Date.now();
  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_archived', false)
    .order('position', { ascending: true });

  const duration = Date.now() - startTime;

  if (error) {
    console.error(`[BACKEND] Error fetching nodes:`, error);
    return [];
  }

  if (duration > 500) {
    console.warn(`[PERFORMANCE] getUserNodes slow query alert: ${duration}ms`);
  }

  return data as Node[];
}

/**
 * Creates a new teamspace within a business.
 */
export async function createTeamspace(payload: {
  business_id: string;
  name: string;
  icon?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get next position
  const { data: siblings } = await supabase
    .from('teamspaces')
    .select('position')
    .eq('business_id', payload.business_id)
    .order('position', { ascending: false })
    .limit(1);
  
  const nextPosition = (siblings?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('teamspaces')
    .insert([{
      business_id: payload.business_id,
      name: payload.name,
      icon: payload.icon || null,
      position: nextPosition,
      created_by: user.id
    }])
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { data };
}

/**
 * Fetches all teamspaces for a business.
 */
export async function getTeamspaces(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('teamspaces')
    .select('*')
    .eq('business_id', businessId)
    .order('position', { ascending: true });

  if (error) return [];
  return data as Teamspace[];
}

/**
 * Updates a teamspace.
 */
export async function updateTeamspace(id: string, updates: Partial<Teamspace>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('teamspaces')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { data };
}

/**
 * Deletes a teamspace.
 */
export async function deleteTeamspace(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('teamspaces').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Toggles public sharing for a node.
 * When enabling, sets is_public = true.
 * When disabling, sets is_public = false.
 */
export async function toggleNodePublic(nodeId: string, isPublic: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Generate a slug when publishing; clear it when unpublishing.
  const public_slug = isPublic ? nodeId : null;

  const { data, error } = await supabase
    .from('nodes')
    .update({ is_public: isPublic, public_slug })
    .eq('id', nodeId)
    .select('id, is_public, public_slug')
    .single();

  if (error) {
    console.error(`[BACKEND] Error toggling public for node ${nodeId}:`, error);
    return { error: error.message };
  }

  console.log(`[BACKEND] Node ${nodeId} is_public set to ${isPublic}`);
  revalidatePath('/', 'layout');
  return { data };
}

// ─── Share Actions ──────────────────────────────────────────────────────────

export async function getNodeShares(nodeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('node_shares')
    .select('*')
    .eq('node_id', nodeId)
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [] };
}

export async function inviteToNode(nodeId: string, email: string, permission: string = 'view') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('node_shares')
    .upsert(
      { node_id: nodeId, email: email.toLowerCase().trim(), permission, invited_by: user.id },
      { onConflict: 'node_id,email' }
    )
    .select()
    .single();

  if (error) {
    console.error('[Share] Error inviting:', error);
    return { error: error.message };
  }

  // Send page share email via Resend
  try {
    const { sendPageShareEmail } = await import('@/lib/email');
    const { data: node } = await supabase.from('nodes').select('title').eq('id', nodeId).single();
    const inviterName = user.user_metadata?.full_name || user.email || 'Someone';
    const pageTitle = node?.title || 'Untitled';
    const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${nodeId}`;

    await sendPageShareEmail({
      to: email.toLowerCase().trim(),
      inviterName,
      pageTitle,
      pageUrl,
    });
  } catch (emailErr) {
    console.error('[Share] Email send failed (share still created):', emailErr);
  }

  return { data };
}

export async function removeNodeShare(nodeId: string, email: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('node_shares')
    .delete()
    .eq('node_id', nodeId)
    .eq('email', email);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateNodeSharePermission(nodeId: string, email: string, permission: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('node_shares')
    .update({ permission })
    .eq('node_id', nodeId)
    .eq('email', email);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getAccessRequests(nodeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .eq('node_id', nodeId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [] };
}

export async function resolveAccessRequest(requestId: string, approve: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const status = approve ? 'approved' : 'denied';
  const { data, error } = await supabase
    .from('access_requests')
    .update({ status, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('*, node_id')
    .single();

  if (error) return { error: error.message };

  // If approved, auto-create a share with view permission
  if (approve && data) {
    await supabase
      .from('node_shares')
      .upsert(
        { node_id: data.node_id, email: data.requester_email, permission: 'view', invited_by: user.id },
        { onConflict: 'node_id,email' }
      );
  }

  return { data };
}

// ─── Comment Actions ─────────────────────────────────────────────────────────

export async function createCommentThread(nodeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comment_threads')
    .insert({ node_id: nodeId })
    .select()
    .single();

  if (error) {
    console.error('[Comment] Error creating thread:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function addComment(threadId: string, content: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { data: null, error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('comments')
    .insert({
      thread_id: threadId,
      user_id: user.id,
      content
    })
    .select()
    .single();

  if (error) {
    console.error('[Comment] Error adding comment:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getCommentsForNode(nodeId: string) {
  const supabase = await createClient();
  const { data: threads, error: threadError } = await supabase
    .from('comment_threads')
    .select('*, comments(*)')
    .eq('node_id', nodeId);

  if (threadError) {
    console.error('[Comment] Error fetching threads:', threadError);
    return { data: [], error: threadError.message };
  }

  // Manually fetch user info for comments (Supabase join can be tricky with auth.users)
  const userIds = Array.from(new Set(threads.flatMap(t => t.comments.map((c: any) => c.user_id))));
  const { data: users } = await supabase.from('users').select('id, full_name, avatar_url').in('id', userIds);
  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));

  const data = threads.map(t => ({
    ...t,
    comments: t.comments.map((c: any) => ({
      ...c,
      author: userMap[c.user_id] || { full_name: 'Unknown User' }
    })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }));

  return { data, error: null };
}

export async function getTeamMembers(businessId: string) {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from('business_members')
    .select('user_id, role, users:user_id(id, full_name, email)')
    .eq('business_id', businessId);

  if (error) {
    console.error('[Comment] Error fetching members:', error);
    return { data: [], error: error.message };
  }

  return {
    data: members.map((m: any) => ({
      id: m.users.id,
      name: m.users.full_name || m.users.email?.split('@')[0] || 'Unknown',
      email: m.users.email
    })),
    error: null
  };
}

// ─── Calendar Actions ─────────────────────────────────────────────────────────

/**
 * Fetches all calendar entries for a business in a given month.
 * Returns entries joined with their linked node (title, icon).
 */
export async function getCalendarEntries(businessId: string, year: number, month: number) {
  const supabase = await createClient();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('calendar_entries')
    .select('*, node:nodes(id, title, icon, type)')
    .eq('business_id', businessId)
    .gte('publish_date', startDate)
    .lte('publish_date', endDate)
    .order('publish_date', { ascending: true });

  if (error) {
    console.error('[Calendar] Error fetching entries:', error);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

/**
 * Creates a new document node and links it to a calendar entry on the given date.
 */
export async function createCalendarEntry(payload: {
  business_id: string;
  title: string;
  publish_date: string; // 'YYYY-MM-DD'
  teamspace_id?: string | null;
  status?: 'draft' | 'scheduled' | 'published' | 'cancelled';
  platform?: string | null;
  notes?: string | null;
  properties?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  try {
    // Step 1 – create the backing document node
    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .insert({
        business_id: payload.business_id,
        type: 'document',
        title: payload.title || 'Untitled',
        name: payload.title || 'Untitled',
        is_name_custom: false,
        position: 0,
        created_by: user.id,
        teamspace_id: payload.teamspace_id ?? null,
      })
      .select('id, title, icon, type')
      .single();

    if (nodeError || !node) {
      console.error('[Calendar] Error creating node:', nodeError);
      return { error: nodeError?.message ?? 'Failed to create backing page node' };
    }

    // Step 2 – create the calendar entry linked to the new node
    const { data: entry, error: entryError } = await supabase
      .from('calendar_entries')
      .insert({
        node_id: node.id,
        business_id: payload.business_id,
        publish_date: payload.publish_date,
        status: payload.status ?? 'draft',
        platform: payload.platform ?? null,
        notes: payload.notes ?? null,
        properties: payload.properties ?? {},
      })
      .select('*, node:nodes(id, title, icon, type)')
      .single();

    if (entryError || !entry) {
      console.error('[Calendar] Error creating calendar entry:', entryError);
      // Clean up the node if entry creation fails to prevent orphaned nodes
      await supabase.from('nodes').delete().eq('id', node.id);
      return { error: entryError?.message ?? 'Failed to create calendar entry' };
    }

    console.log(`[Calendar] Entry created: ${entry.id} → node ${node.id}`);
    revalidatePath('/', 'layout');
    return { data: entry };
  } catch (err: any) {
    console.error('[Calendar] Unexpected error during creation:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}


/**
 * Updates fields of a calendar entry (status, platform, notes, publish_date, properties).
 */
export async function updateCalendarEntry(
  id: string,
  updates: {
    publish_date?: string;
    status?: 'draft' | 'scheduled' | 'published' | 'cancelled';
    platform?: string | null;
    notes?: string | null;
    properties?: Record<string, unknown>;
  }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('calendar_entries')
    .update(updates)
    .eq('id', id)
    .select('*, node:nodes(id, title, icon, type)')
    .single();

  if (error) {
    console.error('[Calendar] Error updating entry:', error);
    return { error: error.message };
  }
  return { data };
}

/**
 * Deletes a calendar entry (does NOT delete the backing node).
 */
export async function deleteCalendarEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('calendar_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Calendar] Error deleting entry:', error);
    return { error: error.message };
  }
  return { success: true };
}

/**
 * Fetches a calendar entry by its node ID to determine if it's a calendar-type page.
 */
export async function getCalendarEntryByNodeId(nodeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('calendar_entries')
    .select('id, publish_date')
    .eq('node_id', nodeId)
    .maybeSingle();

  if (error) return null;
  return data;
}

// ─── Import Actions ───────────────────────────────────────────────────────────

/**
 * Extracts a Notion page ID from a public Notion URL and fetches block data
 * via Notion's internal /api/v3/loadPageChunk endpoint.
 *
 * This is the CRITICAL path for Notion imports — modern Notion pages are
 * JS-rendered SPAs with no server-side content, so this API call is the only
 * way to get the actual page content. We retry up to 2 times on failure.
 */
async function fetchNotionViaApi(
  url: string,
  convertRecordMapToHtml: (recordMap: any) => { title: string; html: string }
): Promise<{ title: string; html: string } | null> {
  // Extract the 32-char hex page ID from the URL (last segment after the final dash)
  const idMatch = url.match(/([a-f0-9]{32})\s*$/i)
    || url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (!idMatch) return null;

  const rawId = idMatch[1].replace(/-/g, '');
  const pageId = `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`;

  // Derive the API base from the URL (works for both notion.site and notion.so)
  const urlObj = new URL(url);
  const apiUrl = `${urlObj.origin}/api/v3/loadPageChunk`;

  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      // Use a generous timeout (15s) — Notion's API can be slow from some regions
      const timeoutId = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: { id: pageId },
          limit: 100,
          cursor: { stack: [] },
          chunkNumber: 0,
          verticalColumns: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[Import] Notion API returned ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        if (attempt < MAX_RETRIES) continue;
        return null;
      }

      const data = await response.json();
      const recordMap = data?.recordMap;
      if (!recordMap?.block) {
        console.warn(`[Import] Notion API returned no blocks (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        if (attempt < MAX_RETRIES) continue;
        return null;
      }

      const result = convertRecordMapToHtml(recordMap);
      if (result.title && result.title !== 'Imported Page') return result;
      if (result.html && result.html.length > 50) return result;

      return null;
    } catch (e) {
      console.error(`[Import] Notion API attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, e);
      if (attempt < MAX_RETRIES) continue;
      return null;
    }
  }

  return null;
}

/**
 * Fetches a web page server-side (avoids CORS) and returns the cleaned HTML
 * along with the page title. The client parses the HTML into Tiptap JSON.
 */
export async function importFromURL(url: string): Promise<{
  title: string;
  html: string;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Nexus/1.0; +https://nexus.so)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { title: '', html: '', error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const raw = await response.text();

    // Initial title extraction from HTML (fallback)
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch
      ? titleMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 200)
      : 'Imported Page';

    // Special handling for Notion links
    let html = '';
    const isNotion = url.includes('notion.site') || url.includes('notion.so');

    if (isNotion) {
      const { parseNotionPage, convertRecordMapToHtml } = await import('@/lib/notion-parser');
      const result = parseNotionPage(raw);
      const hasBodyContent = result.html.replace(/<h1>[\s\S]*?<\/h1>/, '').trim().length > 20;
      const parsedSuccessfully = result.title && result.title !== 'Imported Page' && hasBodyContent;
      console.log('[Import] parseNotionPage result:', { title: result.title, htmlLen: result.html.length, hasBodyContent, parsedSuccessfully });
      if (parsedSuccessfully) {
        // Parser found the Notion data structure with actual content — trust its output.
        title = result.title;
        html = result.html;
      } else {
        // SSR data not found or insufficient (modern Notion pages are JS-only).
        // Try Notion's internal API to fetch the block data directly.
        console.log('[Import] Falling through to fetchNotionViaApi for URL:', url);
        const apiResult = await fetchNotionViaApi(url, convertRecordMapToHtml);
        console.log('[Import] fetchNotionViaApi result:', apiResult ? { title: apiResult.title, htmlLen: apiResult.html.length, hasOl: apiResult.html.includes('<ol>'), hasUl: apiResult.html.includes('<ul>') } : 'null');
        if (apiResult) {
          title = apiResult.title;
          html = apiResult.html;
        } else {
          // All Notion strategies failed. Modern Notion pages are JS-rendered
          // SPAs — the raw HTML contains NO visible content (just an empty
          // React shell). Stripping scripts from this produces garbage with no
          // headings, lists, or paragraphs. Return an explicit error so the
          // user can use the Paste or File import instead.
          console.error('[Import] All Notion import strategies failed for URL:', url);
          return {
            title: '',
            html: '',
            error:
              'Could not extract content from this Notion page. ' +
              'Notion pages are JavaScript-rendered and may not be accessible from all servers. ' +
              'Try exporting the page as Markdown from Notion and uploading the file instead.',
          };
        }
      }
    } else {
      // Strip heavyweight noise before sending to client for generic pages
      html = raw
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    }

    return { title, html, error: undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Import] importFromURL error:', message);
    return { title: '', html: '', error: message };
  }
}
