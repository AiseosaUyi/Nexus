import { Node, NodeWithChildren } from '@nexus/api/schema';

/**
 * Transforms a flat array of nodes into a recursive tree structure.
 * Complexity: O(n) using a Map for lookups.
 */
export function buildTree(nodes: Node[], parentId: string | null = null): NodeWithChildren[] {
  const nodeMap = new Map<string, NodeWithChildren>();
  const tree: NodeWithChildren[] = [];

  // First pass: create NodeWithChildren objects and put them in the map
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Second pass: connect children to parents
  nodes.forEach(node => {
    const nodeWithChildren = nodeMap.get(node.id)!;
    if (node.parent_id === parentId) {
      tree.push(nodeWithChildren);
    } else if (node.parent_id) {
      const parent = nodeMap.get(node.parent_id);
      if (parent) {
        parent.children.push(nodeWithChildren);
      }
    }
  });

  // Third pass: sort children by position
  nodeMap.forEach(node => {
    node.children.sort((a, b) => a.position - b.position);
  });

  return tree.sort((a, b) => a.position - b.position);
}
