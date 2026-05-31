export const DOC_CONTENT: Record<string, string> = {
  'what-is-nexus': `
<p>Nexus is a collaborative knowledge workspace — a single, structured home for everything your team writes, plans, and knows. It replaces the patchwork of scattered Google Docs, abandoned Notion wikis, and Slack threads that most teams end up with.</p>

<h2>The core idea</h2>
<p>Everything in Nexus is a <strong>node</strong> — a document, a folder, or a calendar entry. Nodes live in a tree. You can nest them as deep as you like, move them freely, and find anything through search. There's no separate "file system" vs "database" vs "page" distinction to learn. One model, all the way down.</p>

<h2>Who it's for</h2>
<p>Nexus is built for teams who want a knowledge base they can actually trust. If your current setup involves:</p>
<ul>
  <li>Docs that nobody updates because nobody knows they exist</li>
  <li>A Notion workspace that's grown into a maze</li>
  <li>New hires who spend their first weeks just trying to find things</li>
  <li>Important decisions buried in Slack threads</li>
</ul>
<p>Nexus is designed to solve that. The structure is opinionated enough to stay organized, but flexible enough to fit how your team actually works.</p>

<h2>What you can do</h2>
<ul>
  <li><strong>Write</strong> — a focused block editor with slash commands, tables, code blocks, callouts, and more</li>
  <li><strong>Organize</strong> — nest pages and folders into teamspaces, drag to reorder, link between pages</li>
  <li><strong>Collaborate</strong> — real-time editing with live cursors, inline comments, and @mentions</li>
  <li><strong>Plan</strong> — attach any page to a date on the built-in content calendar</li>
  <li><strong>Import</strong> — bring in existing docs from Notion or paste Markdown directly</li>
</ul>

<h2>What makes it different</h2>
<p>Most knowledge tools treat organization as a user problem — you figure out the structure, maintain it, and clean it up when it collapses. Nexus treats structure as a product responsibility. The tree is always visible. Pages have clear homes. The workspace grows with your team instead of against it.</p>
`,

  'quick-start': `
<p>You'll have a working workspace in under five minutes. Here's how.</p>

<h2>1. Create your workspace</h2>
<p>After signing up, you'll be prompted to create a workspace. Give it a name — this is usually your company or team name. You can create multiple workspaces later if you need them.</p>

<h2>2. Create your first page</h2>
<p>Click the <strong>+</strong> button in the sidebar, or press <kbd>Ctrl+N</kbd> (<kbd>Cmd+N</kbd> on Mac). A new untitled document will open in the editor. Click the title area and give it a name.</p>

<h2>3. Write something</h2>
<p>The editor works like any block editor. Click anywhere to start typing. To add a new type of block — a heading, a list, a code block — type <kbd>/</kbd> to open the slash command menu and pick what you want.</p>

<h2>4. Organise with the sidebar</h2>
<p>Your pages appear in the left sidebar. You can:</p>
<ul>
  <li>Drag pages to reorder them</li>
  <li>Nest pages under other pages by dragging one onto another</li>
  <li>Create folders to group related content</li>
</ul>

<h2>5. Invite your team</h2>
<p>Go to <strong>Settings → Members</strong> and paste in email addresses. They'll receive an invitation link. You can set them as Admin, Editor, or Viewer — see <a href="/docs/roles-and-permissions">Roles & permissions</a> for details.</p>

<h2>6. Import existing content (optional)</h2>
<p>If you're moving from Notion, paste any Notion page URL into the import dialog (the arrow icon in the toolbar) and Nexus will pull it in as native blocks. See <a href="/docs/import-notion">Import from Notion</a> for a full walkthrough.</p>

<h2>Next steps</h2>
<ul>
  <li><a href="/docs/writing-with-blocks">Learn the editor</a></li>
  <li><a href="/docs/the-node-tree">Understand the node tree</a></li>
  <li><a href="/docs/teamspaces">Set up teamspaces</a></li>
</ul>
`,

  'core-concepts': `
<p>Nexus is built around a small set of concepts. Once you understand them, the rest of the product follows naturally.</p>

<h2>Nodes</h2>
<p>Everything in Nexus is a <strong>node</strong>. A node is one of three types:</p>
<ul>
  <li><strong>Document</strong> — a page with a block editor. This is where you write.</li>
  <li><strong>Folder</strong> — a container for other nodes. No editor content, just structure.</li>
  <li><strong>Calendar entry</strong> — a document with a date attached. It appears on the content calendar.</li>
</ul>
<p>All three types share the same tree structure. You can nest any node inside any other. A folder can contain documents, other folders, and calendar entries, all mixed together.</p>

<h2>The tree</h2>
<p>Nodes are organized into a single hierarchy — the <strong>node tree</strong> — visible in the left sidebar. Your whole workspace lives in this tree. There's no separate file system or database to switch between.</p>
<p>Each node has a <strong>parent</strong> (except top-level nodes, which sit directly in a teamspace). Moving a node is as simple as dragging it to a new parent.</p>

<h2>Teamspaces</h2>
<p>A <strong>teamspace</strong> is a top-level section of your workspace — like a department or a project area. The sidebar is organised by teamspace. Every node belongs to exactly one teamspace.</p>
<p>Teamspaces don't restrict access — all workspace members can see all teamspaces. They're purely organisational.</p>

<h2>Workspace</h2>
<p>A <strong>workspace</strong> (also called a business) is the top-level container. It has members, settings, and a shared node tree. Most teams only need one workspace. You can create multiple workspaces if you have separate organisations or clients that need complete separation.</p>

<h2>Title vs name</h2>
<p>Each node has two text fields: a <strong>title</strong> and a <strong>name</strong>. The title is the document heading — the large text at the top of the editor. The name is the label shown in the sidebar. By default they're the same. When you edit the title in the sidebar, the name becomes independent (shown with an edit icon). This lets you have a long descriptive document title and a short sidebar label.</p>

<h2>Blocks</h2>
<p>Document content is made of <strong>blocks</strong> — paragraphs, headings, lists, code blocks, images, tables, and more. Each block is an independent unit. You can drag blocks to reorder them, convert one type to another, or delete individual blocks without affecting the rest of the document.</p>
`,

  'writing-with-blocks': `
<p>The Nexus editor is a block-based rich text editor. Every piece of content — a paragraph, a heading, a checklist item — is its own block.</p>

<h2>Basic editing</h2>
<p>Click anywhere in a document to place your cursor and start typing. Pressing <kbd>Enter</kbd> creates a new paragraph block. Pressing <kbd>Backspace</kbd> at the start of an empty block deletes it.</p>

<h2>Formatting text</h2>
<p>Select any text to see the formatting toolbar. From there you can:</p>
<ul>
  <li><strong>Bold</strong> — <kbd>Ctrl+B</kbd> / <kbd>Cmd+B</kbd></li>
  <li><em>Italic</em> — <kbd>Ctrl+I</kbd> / <kbd>Cmd+I</kbd></li>
  <li><code>Inline code</code> — <kbd>Ctrl+E</kbd> / <kbd>Cmd+E</kbd></li>
  <li>Links — <kbd>Ctrl+K</kbd> / <kbd>Cmd+K</kbd></li>
  <li>Strikethrough, highlight, and more from the toolbar</li>
</ul>

<h2>Block types</h2>
<p>Nexus supports the following block types:</p>
<ul>
  <li><strong>Paragraph</strong> — default text block</li>
  <li><strong>Headings</strong> — H1, H2, H3 (type <code># </code>, <code>## </code>, <code>### </code>)</li>
  <li><strong>Bulleted list</strong> — type <code>- </code> or <code>* </code></li>
  <li><strong>Numbered list</strong> — type <code>1. </code></li>
  <li><strong>Task list</strong> — checkboxes, type <code>[] </code></li>
  <li><strong>Code block</strong> — syntax-highlighted, type <code>&#96;&#96;&#96;</code></li>
  <li><strong>Quote</strong> — type <code>&gt; </code></li>
  <li><strong>Callout</strong> — highlighted box for notes or warnings</li>
  <li><strong>Divider</strong> — horizontal rule, type <code>---</code></li>
  <li><strong>Table</strong> — see below</li>
  <li><strong>Image, Audio, File</strong> — upload or embed</li>
</ul>

<h2>Tables</h2>
<p>Type <kbd>/table</kbd> to insert a table. Click any cell to edit. Use <kbd>Tab</kbd> to move between cells. Right-click a row or column to add, delete, or merge cells.</p>

<h2>Drag to reorder</h2>
<p>Hover over any block to see the drag handle (⠿) on the left. Drag it to move the block to a new position in the document.</p>

<h2>Markdown shortcuts</h2>
<p>The editor recognises common Markdown shortcuts as you type:</p>
<ul>
  <li><code># </code> → H1 heading</li>
  <li><code>- </code> or <code>* </code> → bulleted list</li>
  <li><code>1. </code> → numbered list</li>
  <li><code>[] </code> → task list</li>
  <li><code>&gt; </code> → quote block</li>
  <li><code>---</code> → divider</li>
  <li><code>&#96;&#96;&#96;</code> → code block</li>
  <li><code>**bold**</code> → bold</li>
  <li><code>*italic*</code> → italic</li>
</ul>
`,

  'slash-commands': `
<p>The slash command menu gives you fast access to every block type without leaving the keyboard. Type <kbd>/</kbd> anywhere in the editor to open it.</p>

<h2>Using the menu</h2>
<p>Type <kbd>/</kbd> to open the menu. Start typing to filter — <kbd>/head</kbd> will show heading options, <kbd>/code</kbd> will show code blocks, and so on. Press <kbd>↑</kbd> / <kbd>↓</kbd> to navigate and <kbd>Enter</kbd> to select. Press <kbd>Escape</kbd> to close the menu without selecting.</p>

<h2>Available commands</h2>
<table>
  <thead><tr><th>Command</th><th>What it creates</th></tr></thead>
  <tbody>
    <tr><td><code>/h1</code> or <code>/heading 1</code></td><td>Large heading</td></tr>
    <tr><td><code>/h2</code> or <code>/heading 2</code></td><td>Medium heading</td></tr>
    <tr><td><code>/h3</code> or <code>/heading 3</code></td><td>Small heading</td></tr>
    <tr><td><code>/bullet</code> or <code>/list</code></td><td>Bulleted list</td></tr>
    <tr><td><code>/numbered</code> or <code>/ordered</code></td><td>Numbered list</td></tr>
    <tr><td><code>/todo</code> or <code>/task</code></td><td>Checkbox list</td></tr>
    <tr><td><code>/code</code></td><td>Code block</td></tr>
    <tr><td><code>/quote</code></td><td>Blockquote</td></tr>
    <tr><td><code>/callout</code></td><td>Callout box</td></tr>
    <tr><td><code>/divider</code> or <code>/hr</code></td><td>Horizontal rule</td></tr>
    <tr><td><code>/table</code></td><td>Table</td></tr>
    <tr><td><code>/image</code></td><td>Image upload</td></tr>
    <tr><td><code>/file</code></td><td>File attachment</td></tr>
    <tr><td><code>/audio</code></td><td>Audio player</td></tr>
    <tr><td><code>/details</code></td><td>Collapsible section</td></tr>
    <tr><td><code>/page</code></td><td>Link to another Nexus page</td></tr>
  </tbody>
</table>

<h2>AI commands</h2>
<p>With an OpenAI key configured, additional AI commands appear in the slash menu:</p>
<ul>
  <li><code>/ask</code> — ask a question and get an answer inserted as text</li>
  <li><code>/improve</code> — rewrite selected text</li>
  <li><code>/summarise</code> — summarise selected content</li>
</ul>
`,

  'tables-and-media': `
<h2>Tables</h2>
<p>Insert a table with <kbd>/table</kbd>. The default is a 3×3 grid; you can resize it immediately by hovering over column and row borders and dragging.</p>

<h3>Editing table content</h3>
<ul>
  <li>Click any cell to edit it. The cell supports all inline formatting (bold, italic, code, links).</li>
  <li>Press <kbd>Tab</kbd> to move to the next cell, <kbd>Shift+Tab</kbd> to move back.</li>
  <li>Press <kbd>Tab</kbd> in the last cell of the last row to add a new row.</li>
</ul>

<h3>Adding and removing rows/columns</h3>
<p>Hover over a row or column header to see the <strong>+</strong> button. Click it to add a row or column adjacent to that one. To delete, click the row/column header and select <strong>Delete row</strong> or <strong>Delete column</strong> from the menu.</p>

<h2>Images</h2>
<p>Insert an image with <kbd>/image</kbd> or by dragging an image file directly into the editor. Supported formats: JPG, PNG, GIF, WebP, SVG.</p>
<p>After inserting, click the image to resize it by dragging the corner handles. Images are stored in your workspace's file storage.</p>

<h2>File attachments</h2>
<p>Insert a file attachment with <kbd>/file</kbd>. Any file type is supported. The attachment appears as a download link in the document. Team members with access to the workspace can download it.</p>

<h2>Audio</h2>
<p>Insert an audio player with <kbd>/audio</kbd>. Supported formats: MP3, WAV, OGG, M4A. The player renders inline in the document.</p>

<h2>Embeds</h2>
<p>Paste a URL on a blank line and Nexus will offer to convert it to an embed where supported. YouTube and Loom links render as inline players.</p>
`,

  'ai-assist': `
<p>Nexus includes an AI writing assistant powered by your connected AI provider. It helps you write, edit, and transform content without leaving the editor.</p>

<h2>The AI bubble menu</h2>
<p>Select any text in the editor to see the AI button (sparkle icon) appear in the formatting toolbar. Click it to open the AI prompt bar above the selected text.</p>

<h2>What you can ask</h2>
<ul>
  <li><strong>Improve writing</strong> — fix grammar, improve clarity, tighten prose</li>
  <li><strong>Simplify</strong> — make text shorter and easier to read</li>
  <li><strong>Expand</strong> — add more detail to a short passage</li>
  <li><strong>Summarise</strong> — condense a long section into a few sentences</li>
  <li><strong>Change tone</strong> — make it more formal, more casual, or more direct</li>
  <li><strong>Translate</strong> — convert to another language</li>
  <li><strong>Custom prompt</strong> — type anything and the AI will follow your instruction</li>
</ul>

<h2>Accepting and rejecting changes</h2>
<p>When the AI responds, the suggested text appears below the prompt bar. You can:</p>
<ul>
  <li><strong>Replace</strong> — replace your selected text with the AI output</li>
  <li><strong>Insert below</strong> — keep your original and add the AI output underneath</li>
  <li><strong>Try again</strong> — generate a new response</li>
  <li><strong>Discard</strong> — close without making any changes</li>
</ul>

<h2>Setup</h2>
<p>AI features require an <code>OPENAI_API_KEY</code> environment variable to be set in your deployment. Workspace admins can see whether AI is enabled in Settings → Workspace. If the AI button doesn't appear in the toolbar, AI is not configured for your workspace.</p>
`,

  'the-node-tree': `
<p>The node tree is the sidebar on the left side of your workspace. It's the single navigable map of everything in your team's knowledge base.</p>

<h2>Structure</h2>
<p>The tree is organised into <strong>teamspaces</strong> at the top level. Within each teamspace, nodes can be nested as deep as you like. A typical structure might look like:</p>
<ul>
  <li>Marketing (teamspace)
    <ul>
      <li>Brand (folder)
        <ul>
          <li>Brand Voice (document)</li>
          <li>Logo Guidelines (document)</li>
        </ul>
      </li>
      <li>Content Calendar (calendar)</li>
      <li>Launch Plan (document)</li>
    </ul>
  </li>
</ul>

<h2>Creating nodes</h2>
<p>To add a new page, click the <strong>+</strong> button next to a teamspace or folder in the sidebar. To create a page nested inside another, hover over the parent page and click the <strong>+</strong> that appears next to it.</p>
<p>You can also create a new page from inside the editor using <kbd>Ctrl+N</kbd> / <kbd>Cmd+N</kbd>.</p>

<h2>Reordering</h2>
<p>Drag any node by its handle to reorder it within its parent. Drop it onto another node to nest it inside that node. The tree updates immediately for all collaborators.</p>

<h2>Renaming</h2>
<p>Double-click any node in the sidebar to rename it. This changes the sidebar label (the "name") independently from the document title. If you want them to stay in sync, edit the title inside the document — the sidebar name will update automatically unless you've customised it.</p>

<h2>Deleting</h2>
<p>Right-click any node and select <strong>Delete</strong>. This deletes the node and all its children. There is currently no trash — deletion is permanent. If you want to archive something, move it to an "Archive" folder instead.</p>

<h2>Search</h2>
<p>Press <kbd>Ctrl+K</kbd> / <kbd>Cmd+K</kbd> to open the search modal. It searches across all document titles in your workspace. Full-text content search is coming in a future release.</p>
`,

  'teamspaces': `
<p>Teamspaces are the top-level sections of your workspace. They work like departments or project areas — a way to group related content and give the sidebar a clear shape.</p>

<h2>Creating a teamspace</h2>
<p>Click the <strong>Add teamspace</strong> button at the bottom of the sidebar, or go to <strong>Settings → Teamspaces</strong>. Give it a name. The teamspace appears immediately in the sidebar for all workspace members.</p>

<h2>Organising with teamspaces</h2>
<p>There's no strict rule for how to organise teamspaces. Common patterns:</p>
<ul>
  <li><strong>By department</strong> — Engineering, Marketing, Design, Product, Operations</li>
  <li><strong>By project</strong> — useful for agencies or project-based work</li>
  <li><strong>By type</strong> — Handbook, Projects, Archive</li>
</ul>
<p>Start simple. You can always add more teamspaces or move content between them as your workspace grows.</p>

<h2>Moving nodes between teamspaces</h2>
<p>Drag a node from one teamspace to another in the sidebar. All child nodes move with it.</p>

<h2>What teamspaces are not</h2>
<p>Teamspaces do not control access. All members of a workspace can see all teamspaces. If you need content that only some members can see, that's done through per-page sharing (see <a href="/docs/sharing">Sharing pages</a>). Teamspaces are purely organisational.</p>

<h2>Renaming and deleting</h2>
<p>Right-click a teamspace in the sidebar to rename or delete it. Deleting a teamspace deletes all nodes inside it — this is permanent. Move any content you want to keep to another teamspace first.</p>
`,

  'moving-and-nesting': `
<h2>Moving a node</h2>
<p>Drag any node in the sidebar by its handle (the grip dots that appear on hover). Drop it in a new position to reorder, or drop it onto another node to nest it as a child.</p>
<p>To move a node to a different teamspace, drag it all the way to the teamspace header and drop it there. It will become a top-level node in that teamspace.</p>

<h2>Nesting depth</h2>
<p>There's no limit to how deeply you can nest nodes. In practice, most teams find 3–4 levels is comfortable to navigate. The sidebar indents each level by 22px, so very deep trees can get narrow on smaller screens.</p>

<h2>Reordering</h2>
<p>Within any parent, drag nodes up or down to set their order. The order is preserved across all collaborators — it's stored server-side, not based on your local view.</p>

<h2>Moving multiple nodes</h2>
<p>Currently nodes are moved one at a time. To move a group of pages, move their shared parent — all children move with it.</p>

<h2>Breadcrumb navigation</h2>
<p>At the top of every document, the breadcrumb shows the path from the workspace root to the current page. Click any part of the breadcrumb to navigate up the tree.</p>
`,

  'content-calendar': `
<p>The content calendar gives your team a timeline view of all calendar entries — documents with a date attached.</p>

<h2>Creating a calendar entry</h2>
<p>There are two ways:</p>
<ol>
  <li>Open the calendar view and click a date. A new document is created with that date set.</li>
  <li>Open any existing document and set a date in the page header. The document becomes a calendar entry and appears on the calendar.</li>
</ol>

<h2>The calendar view</h2>
<p>Go to <strong>Calendar</strong> in the sidebar to see the monthly view. Each entry appears on its assigned date. Click any entry to open the full document. Use the month navigation arrows to move forward or back.</p>

<h2>Calendar entries are just documents</h2>
<p>A calendar entry is a normal document node with a date field. It lives in the node tree like any other page — you can nest things inside it, add collaborators, leave comments. The only difference is it also appears on the calendar.</p>

<h2>Use cases</h2>
<ul>
  <li><strong>Editorial calendar</strong> — schedule blog posts, social content, newsletters</li>
  <li><strong>Release planning</strong> — attach a release notes doc to a ship date</li>
  <li><strong>Sprint planning</strong> — mark sprint start and end docs with dates</li>
  <li><strong>Meeting notes</strong> — date your meeting notes for a chronological record</li>
</ul>

<h2>Removing a date</h2>
<p>Open the document and click the date in the page header. Select <strong>Remove date</strong>. The document stays in the node tree but no longer appears on the calendar.</p>
`,

  'live-editing': `
<p>Nexus supports real-time collaborative editing. Multiple people can edit the same document simultaneously and see each other's changes instantly.</p>

<h2>How it works</h2>
<p>Nexus uses <strong>CRDTs</strong> (Conflict-free Replicated Data Types) under the hood. This means simultaneous edits always merge correctly — there's no "last write wins" problem, and you'll never lose someone else's changes. Document state is also stored locally and synced in the background, so you can keep writing even if your connection is briefly interrupted.</p>

<h2>Presence indicators</h2>
<p>When collaborators are viewing the same document, their avatars appear in the top-right corner of the page. Each collaborator gets a coloured cursor. When they're actively typing, you'll see their cursor move through the document in real time.</p>

<h2>Offline editing</h2>
<p>If you lose your connection, you can keep writing. Your changes are queued locally and sync when you reconnect. No spinner, no blocked input — the editor stays usable.</p>

<h2>Conflict-free merging</h2>
<p>Because of CRDT semantics, there are no merge conflicts in Nexus. If two people edit the same sentence simultaneously, both edits are preserved in a sensible combined form. In practice, the presence indicators help people naturally work in different sections of a document, so conflicts are rare.</p>

<h2>Limitations</h2>
<p>Live editing requires both users to be in the same workspace and have at least Editor access to the document. Viewers see the current saved state but don't see live cursors.</p>
`,

  'comments': `
<p>Comments let your team leave feedback and have discussions directly on specific parts of a document, without interrupting the text.</p>

<h2>Adding a comment</h2>
<p>Select any text in the editor. A comment icon (<strong>💬</strong>) appears in the floating toolbar. Click it to open the comment composer. Type your comment and press <kbd>Enter</kbd> or click <strong>Post</strong>.</p>
<p>The selected text is highlighted in the document. A comment marker appears in the right margin. Click the marker to expand the comment thread.</p>

<h2>Replying</h2>
<p>Open a comment thread and type in the reply field at the bottom. All replies are threaded under the original comment.</p>

<h2>Mentions</h2>
<p>Type <kbd>@</kbd> in a comment to mention a workspace member. They'll receive a notification. Mentions in comments display the user's name inline.</p>

<h2>Resolving comments</h2>
<p>When a discussion is done, click <strong>Resolve</strong> on the comment thread. Resolved comments are hidden from the default view but can be shown by toggling <strong>Show resolved</strong> in the comments sidebar. The document text highlight is removed when the comment is resolved.</p>

<h2>Comments sidebar</h2>
<p>Click the comment count in the page header to open the comments sidebar. This shows all open comment threads on the current document in one place. Click any thread to scroll to that part of the document.</p>

<h2>Editing and deleting comments</h2>
<p>Click the three-dot menu on any comment you authored to edit or delete it. Admins can delete any comment.</p>
`,

  'roles-and-permissions': `
<p>Nexus has three workspace-level roles. Every member of a workspace has exactly one role.</p>

<h2>Roles</h2>

<h3>Admin</h3>
<p>Admins have full access to everything in the workspace:</p>
<ul>
  <li>Create, edit, and delete any node</li>
  <li>Invite and remove members</li>
  <li>Change member roles</li>
  <li>Manage workspace settings</li>
  <li>Delete the workspace</li>
</ul>

<h3>Editor</h3>
<p>Editors can work freely with content but cannot manage the workspace itself:</p>
<ul>
  <li>Create, edit, and delete their own nodes</li>
  <li>Edit documents they have access to</li>
  <li>Leave comments on any document</li>
  <li>Cannot change workspace settings or manage members</li>
</ul>

<h3>Viewer</h3>
<p>Viewers have read-only access:</p>
<ul>
  <li>Read all documents in the workspace</li>
  <li>Cannot edit content</li>
  <li>Cannot leave comments</li>
  <li>Cannot create new pages</li>
</ul>

<h2>Changing roles</h2>
<p>Go to <strong>Settings → Members</strong>. Click the role badge next to any member's name to change it. Only Admins can change roles.</p>

<h2>Removing members</h2>
<p>In <strong>Settings → Members</strong>, click the three-dot menu next to a member and select <strong>Remove from workspace</strong>. Their content remains. Only Admins can remove members.</p>

<h2>Per-page sharing</h2>
<p>You can also share individual pages with people outside your workspace. See <a href="/docs/sharing">Sharing pages</a> for details.</p>
`,

  'sharing': `
<p>By default, documents are visible to all members of your workspace. You can also share individual pages with people outside your workspace, or restrict access to specific documents.</p>

<h2>Sharing with a link</h2>
<p>Open any document. In the top-right toolbar, click <strong>Share</strong>. Enable <strong>Share with link</strong>. Anyone with the link can view the document — they don't need a Nexus account.</p>
<p>You can set the shared access level:</p>
<ul>
  <li><strong>View only</strong> — read-only access, no commenting</li>
  <li><strong>Can comment</strong> — view and leave comments</li>
  <li><strong>Can edit</strong> — full editor access for anyone with the link</li>
</ul>

<h2>Requesting access</h2>
<p>If someone visits a page link and doesn't have access, they see a request form. They can submit their name and email. The workspace admin receives the request and can approve or deny it from the Share panel.</p>

<h2>Revoking access</h2>
<p>Open the Share panel and toggle off <strong>Share with link</strong>. Existing link holders lose access immediately.</p>

<h2>Copying the link</h2>
<p>The share link is shown in the Share panel. Click <strong>Copy link</strong> to copy it to your clipboard.</p>
`,

  'members-and-invites': `
<h2>Inviting members</h2>
<p>Go to <strong>Settings → Members</strong> (click your workspace name in the top-left, then <strong>Settings</strong>). Click <strong>Invite member</strong>, enter the email address, and choose a role. Click <strong>Send invite</strong>.</p>
<p>An invite link is generated. Nexus shows you the link to copy and share. An email is also sent if your workspace has email configured.</p>
<p>Invite links expire after 7 days. You can generate a new invite from the same settings page.</p>

<h2>Pending invitations</h2>
<p>Pending invites appear in the Members list with a "Pending" badge. Click the three-dot menu to copy the invite link again or cancel the invitation.</p>

<h2>Accepting an invitation</h2>
<p>When a recipient opens the invite link, they're taken to an acceptance page. If they already have a Nexus account, they can accept immediately. If not, they can create an account and then accept.</p>

<h2>Member limits</h2>
<p>The free plan supports one workspace with unlimited pages. Paid plans support additional members and workspaces — see the <a href="/#pricing">pricing page</a> for current limits.</p>

<h2>Removing members</h2>
<p>In <strong>Settings → Members</strong>, click the three-dot menu next to a member and select <strong>Remove from workspace</strong>. Their contributions to documents remain. Only Admins can remove members.</p>
`,

  'workspace-settings': `
<h2>Accessing settings</h2>
<p>Click your workspace name in the top-left corner of the sidebar, then click <strong>Settings</strong>. This opens the workspace settings panel.</p>

<h2>General settings</h2>
<ul>
  <li><strong>Workspace name</strong> — the display name shown in the sidebar and in emails</li>
  <li><strong>Workspace slug</strong> — the URL identifier for your workspace (e.g. <code>app.usenexus.app/w/your-slug</code>). Changing this updates all workspace URLs.</li>
</ul>

<h2>Members</h2>
<p>See the full list of workspace members, their roles, and join dates. Invite new members, change roles, or remove members from here. See <a href="/docs/members-and-invites">Members & invites</a> for a full walkthrough.</p>

<h2>Billing</h2>
<p>View your current plan, usage, and manage your subscription. Available on paid plans.</p>

<h2>Danger zone</h2>
<p>At the bottom of settings is the <strong>Danger zone</strong>. This includes workspace deletion. Deleting a workspace permanently deletes all nodes, members, and data. This action cannot be undone.</p>
`,

  'import-notion': `
<p>Nexus can import any public Notion page directly — your pages arrive as native Nexus blocks, ready to edit immediately.</p>

<h2>How to import</h2>
<ol>
  <li>In Notion, open the page you want to import. Make sure it's set to <strong>Public</strong> (or share it as a web page).</li>
  <li>Copy the page URL from your browser's address bar.</li>
  <li>In Nexus, open the page where you want the import to land, or navigate to the folder you want to import into.</li>
  <li>Click the <strong>Import</strong> icon in the toolbar (the download arrow), or right-click a folder in the sidebar and select <strong>Import</strong>.</li>
  <li>Paste the Notion URL into the field and click <strong>Import</strong>.</li>
</ol>
<p>Nexus fetches the page and converts it to a Nexus document. Sub-pages are imported as nested nodes.</p>

<h2>What imports cleanly</h2>
<ul>
  <li>Paragraphs, headings (H1–H3)</li>
  <li>Bulleted and numbered lists</li>
  <li>Checkboxes and task lists</li>
  <li>Code blocks (syntax-highlighted)</li>
  <li>Blockquotes</li>
  <li>Tables</li>
  <li>Images (embedded by URL)</li>
  <li>Inline formatting: bold, italic, inline code, links</li>
  <li>Nested sub-pages (imported as child nodes)</li>
</ul>

<h2>What doesn't import</h2>
<ul>
  <li>Notion databases (tables with properties, filters, views) — arrive as static text exports</li>
  <li>Synced blocks — arrive as static copies of their content at import time</li>
  <li>Notion formulas, rollups, and relations</li>
  <li>Comments from Notion</li>
</ul>

<h2>Tips for a smooth migration</h2>
<ul>
  <li>Import section by section rather than everything at once. Start with your most-used pages.</li>
  <li>Use the import as an opportunity to clean up. Move what's worth keeping, archive what isn't.</li>
  <li>Notion database content can be exported as CSV from Notion, then referenced from a Nexus page.</li>
</ul>
`,

  'import-google-docs': `
<p>To import from Google Docs, export or copy the content and paste it into Nexus.</p>

<h2>Option 1: Paste directly</h2>
<ol>
  <li>Open your Google Doc and select all the content (<kbd>Ctrl+A</kbd> / <kbd>Cmd+A</kbd>).</li>
  <li>Copy it (<kbd>Ctrl+C</kbd> / <kbd>Cmd+C</kbd>).</li>
  <li>Open a new Nexus document and paste (<kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd>).</li>
</ol>
<p>Nexus will try to preserve headings, lists, bold, italic, and links from the clipboard. Complex formatting (tables, footnotes, images) may not transfer perfectly.</p>

<h2>Option 2: Export as HTML</h2>
<ol>
  <li>In Google Docs, go to <strong>File → Download → Web page (.html, zipped)</strong>.</li>
  <li>Unzip the file.</li>
  <li>Open the HTML file in a browser.</li>
  <li>Select all and copy the rendered content.</li>
  <li>Paste into a Nexus document.</li>
</ol>
<p>This preserves more formatting, including tables and inline styles.</p>

<h2>Option 3: Export as Markdown</h2>
<p>Use a browser extension or Google Workspace add-on to export your Google Doc as Markdown, then paste the Markdown into the Nexus import dialog. See <a href="/docs/import-markdown">Import Markdown</a> for details.</p>
`,

  'import-markdown': `
<p>Nexus can import plain Markdown and convert it to native blocks.</p>

<h2>Pasting Markdown</h2>
<p>Copy Markdown text from any source and paste it directly into the Nexus editor. Nexus detects common Markdown syntax and converts it as you paste:</p>
<ul>
  <li><code># Heading</code> → H1, H2, H3</li>
  <li><code>- item</code> → bulleted list</li>
  <li><code>1. item</code> → numbered list</li>
  <li><code>- [ ] task</code> → task list</li>
  <li><code>&gt; quote</code> → blockquote</li>
  <li><code>&#96;&#96;&#96;code&#96;&#96;&#96;</code> → code block</li>
  <li><code>**bold**</code>, <code>*italic*</code> → inline formatting</li>
  <li><code>[link](url)</code> → hyperlink</li>
</ul>

<h2>Using the import dialog</h2>
<p>For larger Markdown files, use the import dialog instead of pasting:</p>
<ol>
  <li>Click the <strong>Import</strong> icon in the toolbar.</li>
  <li>Select <strong>Markdown</strong> as the source type.</li>
  <li>Paste your Markdown or upload a <code>.md</code> file.</li>
  <li>Click <strong>Import</strong>. Nexus creates a new document with the converted content.</li>
</ol>

<h2>Frontmatter</h2>
<p>If your Markdown has YAML frontmatter (the <code>---</code> block at the top), it's stripped and not shown in the document. The <code>title</code> field, if present, is used as the document title.</p>
`,
};
