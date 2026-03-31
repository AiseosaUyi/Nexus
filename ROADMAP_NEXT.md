# PROJECT ROADMAP: Next Features 🛠️

This document outlines the detailed specifications for the upcoming "Public Sharing" and "Import from Link" features.

---

## 1. Public Site Link Sharing 🌍

### Feature Objective
Allow users to generate a unique, read-only URL for any node (page or folder). This link can be shared with anyone to view the content without authentication.

### Technical Requirements
1. **Database Update**:
    - Add `is_public` (boolean, default: false) to the `public.nodes` table.
    - Add `public_slug` (uuid or slug, optional) for prettier URLs.
2. **Access Control**:
    - Update RLS on `nodes`, `blocks`, and `comments` to allow `SELECT` by `anon` role if `nodes.is_public` is true.
3. **UI Integration**:
    - **Header**: Add a "Publish" or "Share to Web" toggle in the `PageHeader.tsx` share menu.
    - **Link Generation**: Display a "Copy Public Link" button that generates a URL pointing to `/p/[node_id]`.
4. **Public Route**:
    - Create a new route `/apps/web/src/app/(public)/p/[node_id]/page.tsx`.
    - This page should render a read-only `NexusEditor`.

---

## 2. Import Content from Link 📥

### Feature Objective
Populate a Nexus document with content fetched from an external public URL (e.g., a public Notion page or a blog post).

### Technical Requirements
1. **Entry Point**:
    - Dashboard "Import Page" card (replaces the old Search card).
2. **Import Workflow**:
    - User clicks "Import Page" -> Opens a Modal.
    - User pastes a URL and selects a destination (Teamspace/Parent).
3. **Fetching & Parsing**:
    - Create a server action `importFromUrl(url: string, parentId: string)`.
    - Use `fetch` to get HTML.
    - Use a library like `turndown` or a custom parser to convert HTML elements to Tiptap JSON format.
4. **Mapping Logic**:
    - `<h1>` -> `heading` (level 1)
    - `<h2>` -> `heading` (level 2)
    - `<ul>/<li>` -> `bulletList`
    - `<input type="checkbox">` -> `taskList`
    - `<img>` -> `image` block (requires downloading and re-uploading to Supabase bucket).

---

## 3. End-to-End Test Scenario: "The Full Workflow" 🧪

### Scenario Steps
1. **Login**: Authenticate and navigate to a workspace.
2. **Create**: Click "New Page" in the sidebar.
3. **Format**:
    - Type "My Project Wiki".
    - Add a **Heading 2** and a **Heading 3**.
    - Create a **Todo List** with 3 items.
    - Create a **Bullet List**.
4. **Attach**:
    - Use the `/file` slash command or Drag-and-Drop to attach a PDF/Image.
    - *Note: Requires `assets` table and storage integration*.
5. **Collaborate**:
    - Select text and add a comment.
    - Mention a team member using `@`.
6. **Publish**:
    - Toggle "Share to Web".
    - Copy the public link and verify it opens in an incognito window.
7. **Import**:
    - Paste that public link into the "Import Page" tool.
    - Verify a **new** duplicate page is created with identical content.

---

## 4. Current Blockers (Technical)
- **Asset Uploads**: The `assets` table and Supabase storage bucket policies need configuration to support the `/file` slash command.
- **Import Parser**: Needs to handle complex Notion HTML structure (nested blocks, callouts).
