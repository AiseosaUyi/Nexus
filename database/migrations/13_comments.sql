-- 13_comments.sql
-- Implements a selection-based comment system with thread support and mentions.

-- Comment Threads (maps to a Tiptap 'Comment' mark)
create table if not exists public.comment_threads (
  id           uuid primary key default gen_random_uuid(),
  node_id      uuid not null references public.nodes (id) on delete cascade,
  is_resolved  boolean not null default false,
  created_at   timestamp with time zone default now() not null,
  updated_at   timestamp with time zone default now() not null
);

-- Individual Comments within a thread
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references public.comment_threads (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  content      jsonb not null, -- Stores rich text or tiptap-like JSON with mentions
  created_at   timestamp with time zone default now() not null,
  updated_at   timestamp with time zone default now() not null
);

-- Indexes for performance
create index if not exists idx_comment_threads_node_id on public.comment_threads (node_id);
create index if not exists idx_comments_thread_id on public.comments (thread_id);

-- Row Level Security
alter table public.comment_threads enable row level security;
alter table public.comments enable row level security;

-- Policies for Threads
create policy "Users can view threads on accessible nodes"
  on public.comment_threads for select
  using (
    exists (
      select 1 from public.nodes n
      where n.id = node_id
    )
  );

create policy "Users can create threads on accessible nodes"
  on public.comment_threads for insert
  with check (
    exists (
      select 1 from public.nodes n
      where n.id = node_id
    )
  );

create policy "Users can resolve their own threads or if they are admin"
  on public.comment_threads for update
  using (
     exists (
      select 1 from public.nodes n
      where n.id = node_id
    )
  );

-- Policies for Individual Comments
create policy "Users can view comments on accessible threads"
  on public.comments for select
  using (
    exists (
      select 1 from public.comment_threads ct
      where ct.id = thread_id
    )
  );

create policy "Users can post comments on accessible threads"
  on public.comments for insert
  with check (
    exists (
      select 1 from public.comment_threads ct
      where ct.id = thread_id
    )
  );

create policy "Users can edit/delete their own comments"
  on public.comments for all
  using (auth.uid() = user_id);

-- Realtime enablement
alter publication supabase_realtime add table public.comment_threads;
alter publication supabase_realtime add table public.comments;
