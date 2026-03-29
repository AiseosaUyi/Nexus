'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Node, NodeType, CreateNodePayload, Block, BlockType } from '@nexus/api/schema';

/**
 * Updates a node's Yjs binary snapshot for real-time synchronization.
 */
export async function updateYjsSnapshot(nodeId: string, snapshot: number[]) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('nodes')
    .update({ 
      yjs_snapshot: Uint8Array.from(snapshot),
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', nodeId);

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
        title: payload.title || 'Untitled',
        position: nextPosition,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(`[BACKEND] Error creating node for user ${user.id}:`, error);
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
  updates: Partial<Pick<Node, 'title' | 'icon' | 'parent_id' | 'position' | 'is_archived'>>
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
