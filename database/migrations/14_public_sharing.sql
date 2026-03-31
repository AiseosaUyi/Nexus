-- 14_public_sharing.sql
-- Adds public sharing support: is_public flag and public_slug for pretty URLs.

ALTER TABLE public.nodes
  ADD COLUMN IF NOT EXISTS is_public  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text;

-- Fast lookup by slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_public_slug
  ON public.nodes (public_slug)
  WHERE public_slug IS NOT NULL;

-- Fast filter for public listing / anon access
CREATE INDEX IF NOT EXISTS idx_nodes_is_public
  ON public.nodes (is_public)
  WHERE is_public = true;

-- Allow anyone (including the anon role) to read a node marked public.
-- The existing "Business members can view nodes" policy continues to apply for
-- authenticated workspace members; this policy adds anonymous access on top.
CREATE POLICY "Public nodes are viewable by everyone"
  ON public.nodes FOR SELECT
  USING (is_public = true);

-- Allow the anon role to read blocks that belong to a public node.
CREATE POLICY "Blocks of public nodes are viewable by everyone"
  ON public.blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      WHERE n.id = node_id
        AND n.is_public = true
    )
  );
