# DATABASE GUIDE: Nexus Schema & RLS 🏛️

This document describes the final state of the Supabase (PostgreSQL) database for Nexus.

---

## 1. Core Entity Relationship Diagram (ERD)

### 📂 Workspaces & Hierarchy
- `businesses`: The top-level workspace containers.
- `teamspaces`: Section headers/containers within a business (General, Marketing, Engineering).
- `nodes`: The universal "Page/Folder" entity. 
    - `parent_id` (uuid): Recursive link for nesting.
    - `teamspace_id` (uuid): Link to the root section.
    - `is_name_custom` (boolean): If `true`, the sidebar label (`name`) is detached from the page title.

### 👥 Authentication & Membership
- `users`: Extends `auth.users` with metadata.
- `business_members`: Links users to businesses with roles (`ADMIN`, `EDITOR`, `VIEWER`).

### 💬 Collaboration
- `comment_threads`: Groups discussions by a specific document range (Tiptap `threadId`).
- `comments`: Individual rich-text messages with authors and timestamps.

---

## 2. Table Definitions (Latest)

### `public.nodes` (Updated)
| column | type | description |
|---|---|---|
| id | uuid | Primary Key |
| business_id | uuid | FK to businesses |
| parent_id | uuid | FK to nodes (Recursive) |
| teamspace_id | uuid | FK to teamspaces |
| title | text | H1/Page Title |
| name | text | Sidebar Label (Rename Override) |
| is_name_custom | boolean | UI Flag for custom sidebar label |
| content | jsonb | Tiptap JSON or Yjs state binary |

### `public.teamspaces` (New)
| column | type | description |
|---|---|---|
| id | uuid | Primary Key |
| name | text | "Marketing", "Engineering", etc. |
| icon | text | Section Emoji |
| position | int | Ordering logic |

---

## 3. Required SQL Migrations
The following files in `database/migrations/` **must** be applied for the current codebase to function:
1. **`10_teamspaces.sql`**: Adds the `teamspaces` table and the `teamspace_id` column to `nodes`.
2. **`12_add_custom_name_to_nodes.sql`**: Adds the `name` and `is_name_custom` columns.
3. **`13_comments.sql`**: Adds the comment infrastructure.

---

## 4. Row Level Security (RLS) Policies
- **Nodes**: Viewable by any `business_member`. Editable by `ADMIN/EDITOR`.
- **Teamspaces**: Managed by `ADMIN/EDITOR`.
- **Comments**: Viewable by thread-access holders. Editable **only by the author** (`auth.uid() = user_id`).
- **Realtime**: `comment_threads` and `comments` must be added to the `supabase_realtime` publication for live discussion syncing.
