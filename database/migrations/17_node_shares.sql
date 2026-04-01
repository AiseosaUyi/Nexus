-- Node sharing: invite by email and access requests
-- Supports permission levels and general access control.

-- Shares: tracks who has been invited to a specific node
CREATE TABLE IF NOT EXISTS public.node_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  email text NOT NULL,
  permission text NOT NULL DEFAULT 'view',  -- 'view', 'comment', 'edit', 'full'
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_node_shares_node_email UNIQUE (node_id, email)
);

-- Access requests: tracks users who requested access to a restricted node
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  requester_email text NOT NULL,
  requester_name text,
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'denied'
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT uq_access_requests_node_email UNIQUE (node_id, requester_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_node_shares_node ON public.node_shares(node_id);
CREATE INDEX IF NOT EXISTS idx_node_shares_email ON public.node_shares(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_node ON public.access_requests(node_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status) WHERE status = 'pending';

-- RLS
ALTER TABLE public.node_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Node shares: workspace members can manage shares for their nodes
CREATE POLICY "Workspace members can view node shares"
  ON public.node_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = node_shares.node_id AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert node shares"
  ON public.node_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = node_shares.node_id AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete node shares"
  ON public.node_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = node_shares.node_id AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update node shares"
  ON public.node_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = node_shares.node_id AND bm.user_id = auth.uid()
    )
  );

-- Access requests: anyone can create, workspace members can view/update
CREATE POLICY "Anyone can request access"
  ON public.access_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Workspace members can view access requests"
  ON public.access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = access_requests.node_id AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update access requests"
  ON public.access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = access_requests.node_id AND bm.user_id = auth.uid()
    )
  );

-- Shared users can view the node (extend existing node SELECT policy)
-- This allows invited users to read nodes even when is_public = false
CREATE POLICY "Shared users can view nodes"
  ON public.nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.node_shares ns
      WHERE ns.node_id = nodes.id
      AND ns.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
