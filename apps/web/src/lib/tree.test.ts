import { describe, it, expect } from 'vitest';
import { buildTree } from './tree';
import { Node } from '@nexus/api/schema';

describe('buildTree', () => {
  const base = { name: null, is_name_custom: false, is_public: false, public_slug: null, yjs_snapshot: null, teamspace_id: null };
  const mockNodes: Node[] = [
    {
      ...base, id: '1', business_id: 'b1', parent_id: null, type: 'folder', title: 'Folder 1',
      position: 0, is_archived: false, icon: null, cover_url: null, created_by: null,
      created_at: '', updated_at: ''
    },
    {
      ...base, id: '2', business_id: 'b1', parent_id: '1', type: 'document', title: 'Doc 1.1',
      position: 1, is_archived: false, icon: null, cover_url: null, created_by: null,
      created_at: '', updated_at: ''
    },
    {
      ...base, id: '3', business_id: 'b1', parent_id: '1', type: 'document', title: 'Doc 1.0',
      position: 0, is_archived: false, icon: null, cover_url: null, created_by: null,
      created_at: '', updated_at: ''
    },
    {
      ...base, id: '4', business_id: 'b1', parent_id: null, type: 'document', title: 'Doc 2',
      position: 1, is_archived: false, icon: null, cover_url: null, created_by: null,
      created_at: '', updated_at: ''
    },
  ];

  it('should build a hierarchical tree from flat nodes', () => {
    const tree = buildTree(mockNodes);
    
    expect(tree).toHaveLength(2); // Top level: Folder 1, Doc 2
    expect(tree[0].id).toBe('1');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[1].id).toBe('4');
  });

  it('should sort nodes and children by position', () => {
    const tree = buildTree(mockNodes);
    
    // Top level sorting
    expect(tree[0].id).toBe('1'); // position 0
    expect(tree[1].id).toBe('4'); // position 1
    
    // Nested level sorting
    expect(tree[0].children[0].id).toBe('3'); // Doc 1.0 (position 0)
    expect(tree[0].children[1].id).toBe('2'); // Doc 1.1 (position 1)
  });

  it('should return empty array if no nodes match the parentId', () => {
    const tree = buildTree(mockNodes, 'non-existent');
    expect(tree).toHaveLength(0);
  });
});
