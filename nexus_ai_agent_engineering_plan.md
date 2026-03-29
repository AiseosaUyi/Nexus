
# Nexus — AI-Agent Engineering Plan

This document breaks the Nexus product specification into **atomic engineering tasks** so AI coding agents can implement the system sequentially.

Stack assumptions:
- Frontend: Next.js (React + TypeScript)
- Backend/Auth/DB/Storage: Supabase
- Editor: Tiptap
- Hosting: Vercel

---

# Phase 1 — Project Initialization

## Step 1 — Initialize Monorepo

**Objective**
Create the root project structure.

**Files to Create**
```
/nexus
/package.json
/tsconfig.json
/apps/web
/packages/ui
/packages/editor
/packages/api
/services
/database
```

**Functions**
None.

**Dependencies**
Node.js

**Expected Output**
Base repository structure created.

---

## Step 2 — Initialize Next.js App

**Objective**
Create the frontend application.

**Files**
```
/apps/web/package.json
/apps/web/next.config.js
/apps/web/pages/index.tsx
/apps/web/pages/_app.tsx
```

**Dependencies**
```
next
react
react-dom
typescript
tailwindcss
```

**Expected Output**
Local dev server renders “Nexus”.

---

## Step 3 — Configure Styling

**Objective**
Add TailwindCSS styling.

**Files**
```
/apps/web/tailwind.config.js
/apps/web/styles/globals.css
```

**Dependencies**
```
tailwindcss
postcss
autoprefixer
```

**Expected Output**
Styled UI components render.

---

## Step 4 — Setup Supabase Client

**Objective**
Connect the app to Supabase.

**Files**
```
/apps/web/lib/supabaseClient.ts
```

**Functions**
```
createSupabaseClient()
```

**Dependencies**
```
@supabase/supabase-js
```

**Expected Output**
App can connect to Supabase.

---

# Phase 2 — Database Foundation

## Step 5 — Users Table

**Objective**
Store user accounts.

**Files**
```
/database/migrations/create_users.sql
```

**Schema**
```
users
id uuid primary key
email text
name text
created_at timestamp
```

**Expected Output**
Users table exists.

---

## Step 6 — Businesses Table

**Objective**
Support multi-workspace environments.

**Files**
```
/database/migrations/create_businesses.sql
```

**Schema**
```
businesses
id uuid
name text
owner_id uuid
created_at timestamp
```

**Expected Output**
Businesses table created.

---

## Step 7 — Business Members

**Objective**
Team collaboration.

**Files**
```
/database/migrations/create_business_members.sql
```

**Schema**
```
business_members
id uuid
business_id uuid
user_id uuid
role text
```

**Expected Output**
Team membership system created.

---

## Step 8 — Node Table

**Objective**
Create hierarchical content structure.

**Files**
```
/database/migrations/create_nodes.sql
```

**Schema**
```
nodes
id uuid
business_id uuid
parent_id uuid
type text
title text
created_by uuid
created_at timestamp
updated_at timestamp
```

**Expected Output**
Nodes represent folders/documents/calendar items.

---

## Step 9 — Blocks Table

**Objective**
Store document blocks.

**Files**
```
/database/migrations/create_blocks.sql
```

**Schema**
```
blocks
id uuid
node_id uuid
type text
content jsonb
position int
created_at timestamp
```

**Expected Output**
Documents can contain ordered blocks.

---

## Step 10 — Assets Table

**Objective**
Store uploaded files.

**Files**
```
/database/migrations/create_assets.sql
```

**Schema**
```
assets
id uuid
business_id uuid
file_url text
file_type text
size int
uploaded_by uuid
created_at timestamp
```

**Expected Output**
File storage metadata table created.

---

# Phase 3 — Authentication

## Step 11 — Signup

**Objective**
Allow users to create accounts.

**Files**
```
/apps/web/pages/auth/signup.tsx
```

**Functions**
```
signUpUser()
```

**Expected Output**
User account created via Supabase Auth.

---

## Step 12 — Login

**Objective**
Allow user authentication.

**Files**
```
/apps/web/pages/auth/login.tsx
```

**Functions**
```
loginUser()
logoutUser()
```

**Expected Output**
Users can sign in/out.

---

# Phase 4 — Workspace System

## Step 13 — Create Business

**Files**
```
/apps/web/components/business/CreateBusinessModal.tsx
```

**Functions**
```
createBusiness()
```

**Expected Output**
User can create a workspace.

---

## Step 14 — Business Switcher

**Files**
```
/apps/web/components/business/BusinessSwitcher.tsx
```

**Functions**
```
getUserBusinesses()
switchBusiness()
```

**Expected Output**
User switches between businesses.

---

# Phase 5 — Folder & Page System

## Step 15 — Sidebar Tree

**Files**
```
/apps/web/components/sidebar/Sidebar.tsx
```

**Functions**
```
fetchNodeTree()
renderNodeTree()
```

**Expected Output**
Sidebar displays folder/document tree.

---

## Step 16 — Create Folder

**Files**
```
/apps/web/components/sidebar/CreateFolder.tsx
```

**Functions**
```
createFolder()
```

**Expected Output**
Folder added to hierarchy.

---

## Step 17 — Create Document

**Files**
```
/apps/web/components/sidebar/CreateDocument.tsx
```

**Functions**
```
createDocument()
```

**Expected Output**
Document node created.

---

# Phase 6 — Document Editor

## Step 18 — Install Editor

**Dependencies**
```
@tiptap/react
@tiptap/starter-kit
```

**Files**
```
/packages/editor/NexusEditor.tsx
```

**Expected Output**
Editor loads successfully.

---

## Step 19 — Load Blocks

**Functions**
```
loadBlocks()
renderBlocks()
```

**Expected Output**
Document blocks render.

---

## Step 20 — Save Blocks

**Functions**
```
saveBlock()
updateBlock()
deleteBlock()
```

**Expected Output**
Editor auto-saves changes.

---

# Phase 7 — File Upload

## Step 21 — Upload System

**Files**
```
/apps/web/components/uploads/FileUploader.tsx
```

**Functions**
```
uploadFile()
getFileUrl()
```

**Expected Output**
Images and files uploaded.

---

# Phase 8 — Content Calendar

## Step 22 — Calendar Schema

**Files**
```
/database/migrations/create_calendar_entries.sql
```

**Schema**
```
calendar_entries
id uuid
node_id uuid
publish_date date
platform text
status text
notes text
```

**Expected Output**
Calendar entries stored.

---

## Step 23 — Calendar UI

**Files**
```
/apps/web/components/calendar/CalendarView.tsx
```

**Functions**
```
fetchCalendarEntries()
renderCalendar()
```

**Expected Output**
Monthly calendar view displayed.

---

## Step 24 — Create Entry

**Functions**
```
createCalendarEntry()
updateCalendarEntry()
```

**Expected Output**
Entries appear on calendar.

---

# Phase 9 — Notion Importer

## Step 25 — HTML Parser

**Dependencies**
```
cheerio
```

**Files**
```
/services/importer/notionParser.ts
```

**Functions**
```
fetchPageHTML()
parseHTML()
convertToBlocks()
```

**Expected Output**
HTML converted into Nexus blocks.

---

## Step 26 — Import Document

**Functions**
```
importNotionDocument()
createBlocksFromImport()
```

**Expected Output**
Imported document created.

---

# Phase 10 — Team Management

## Step 27 — Invite Users

**Files**
```
/apps/web/components/team/InviteUserModal.tsx
```

**Functions**
```
inviteUser()
assignRole()
```

**Expected Output**
Users invited to workspace.

---

## Step 28 — Remove Users

**Functions**
```
removeUser()
updateUserRole()
```

**Expected Output**
Admins manage team.

---

# Phase 11 — Realtime Updates

## Step 29 — Realtime Blocks

**Functions**
```
subscribeToBlockChanges()
broadcastBlockUpdate()
```

**Expected Output**
Live editing updates across users.

---

# Phase 12 — Deployment

## Step 30 — Deploy System

**Steps**
- Deploy frontend to Vercel
- Configure Supabase backend
- Add environment variables

**Expected Output**
Live Nexus application.

---

# Estimated Development Time

AI agents:
```
25–40 hours
```

Human engineering team:
```
4–6 weeks
```
