
# Nexus — Advanced System Architecture Specification

## 1. System Philosophy
Nexus is designed as a **block-based knowledge system**.

Every document is composed of **ordered blocks**, and every workspace object lives inside a **hierarchical tree structure**.

Key principles:
- everything is a node
- documents are block containers
- folders are tree nodes
- businesses isolate data boundaries
- blocks render documents
- events power future collaboration

---

## 2. Core Domain Model

The system revolves around five core entities:

- Account
- Business
- Node
- Block
- Asset

### Node Types

A node can represent:
- folder
- document
- calendar item

This simplifies the database design and improves scalability.

---

## 3. Page Tree Architecture

Instead of separate tables for folders and documents, Nexus uses a **unified tree structure**.

Structure:

Business
 └ Node
     ├ Folder
     │  ├ Document
     │  └ Document
     └ Folder
         └ Document

Benefits:
- infinite nesting
- drag and drop restructuring
- consistent hierarchy

### Node Schema

| field | type | description |
|-----|-----|-----|
| id | uuid | primary key |
| business_id | uuid | workspace owner |
| parent_id | uuid | parent node |
| type | enum | folder, document, calendar |
| title | text | node title |
| created_by | uuid | creator |
| created_at | timestamp | creation time |
| updated_at | timestamp | last edit |

Indexes:
- index (business_id)
- index (parent_id)

---

## 4. Block Editor Architecture

Documents are composed of blocks.

Example:

Document
 ├ Heading Block
 ├ Paragraph Block
 ├ Image Block
 ├ Video Block
 └ Attachment Block

Blocks are ordered.

### Block Schema

| field | type |
|-----|-----|
| id | uuid |
| node_id | uuid |
| type | enum |
| content | jsonb |
| position | int |
| created_at | timestamp |

Example block content:

```json
{
  "text": "Welcome to the product documentation",
  "styles": ["bold"]
}
```

Supported block types:

- paragraph
- heading
- list
- image
- video
- file
- embed
- divider

---

## 5. Asset Storage System

Assets represent uploaded files.

Examples:
- images
- documents
- attachments
- videos

### Asset Schema

| field | type |
|-----|-----|
| id | uuid |
| business_id | uuid |
| file_url | text |
| file_type | text |
| size | int |
| uploaded_by | uuid |
| created_at | timestamp |

---

## 6. Content Calendar Architecture

Calendar items are stored as nodes with metadata.

Example:
Node (type: calendar)

### CalendarEntry Schema

| field | type |
|-----|-----|
| id | uuid |
| node_id | uuid |
| publish_date | date |
| platform | text |
| status | enum |
| notes | text |

This allows linking a calendar entry directly to a document.

---

## 7. Permission System

Permissions operate at the business level.

Roles:

- ADMIN
- EDITOR
- VIEWER

### BusinessMember Schema

| field | type |
|-----|-----|
| id | uuid |
| business_id | uuid |
| user_id | uuid |
| role | enum |

Future extension:
- node-level permissions

---

## 8. Event Driven Architecture

To support collaboration and automation, Nexus records system events.

### Event Schema

| field | type |
|-----|-----|
| id | uuid |
| business_id | uuid |
| actor_id | uuid |
| event_type | text |
| payload | jsonb |
| created_at | timestamp |

Example events:

- DOCUMENT_CREATED
- BLOCK_ADDED
- BLOCK_UPDATED
- FOLDER_MOVED
- CALENDAR_ENTRY_CREATED

Benefits:
- audit logs
- realtime updates
- automation triggers
- analytics

---

## 9. Notion Import Architecture

Importer process:

User provides URL  
↓  
Fetch HTML  
↓  
Parse DOM  
↓  
Convert elements → Nexus blocks  
↓  
Create document  

Example mapping:

| HTML | Nexus Block |
|----|----|
| h1 | heading |
| p | paragraph |
| img | image |
| ul | list |
| iframe | embed |

---

## 10. Real-Time Editing

Realtime collaboration uses WebSockets or realtime subscriptions.

Broadcast events:

- block_updated
- block_added
- cursor_position
- document_saved

---

## 11. API Design

### Create Node

POST /nodes

Request:

```json
{
  "type": "document",
  "title": "Marketing Plan",
  "parent_id": "folder_id"
}
```

### Get Node Tree

GET /nodes/tree

### Add Block

POST /blocks

### Update Block

PATCH /blocks/{id}

### Upload Asset

POST /assets

### Create Calendar Entry

POST /calendar

Error format:

```json
{
  "error_code": "string",
  "message": "string"
}
```

---

## 12. Recommended Technology Stack

Frontend:
- Next.js
- React
- TypeScript
- TailwindCSS

Editor:
- Tiptap

Backend:
- Supabase

Hosting:
- Vercel

Parsing:
- Cheerio

---

## 13. Monorepo Structure

nexus
 ├ apps
 │   └ web
 ├ packages
 │   ├ editor
 │   ├ ui
 │   └ api
 ├ services
 │   ├ importer
 │   ├ events
 │   └ calendar
 ├ database
 │   └ migrations
 └ infra

---

## 14. Performance Optimization

Important optimizations:

Tree caching  
Load sidebar nodes with caching.

Block pagination  
Load blocks lazily for large documents.

Asset CDN  
Serve files via CDN.

Edge rendering  
Use edge functions where possible.

---

## 15. Scaling Strategy

To scale to large teams:

Step 1 – Service separation
- Document Service
- Calendar Service
- Import Service

Step 2 – Queue workers
- Redis
- BullMQ

Step 3 – Collaborative editing using CRDT systems

Step 4 – Move heavy processing into microservices

---

## 16. Critical System Constraints

The system must support:

- thousands of blocks per document
- deeply nested folders
- thousands of documents per workspace

Architecture must avoid:

- deep recursive queries
- slow tree rendering
- loading entire documents unnecessarily

---

## 17. Estimated Development Complexity

With AI coding agents:

Estimated build time:
20–35 hours

Human engineering equivalent:
3–4 weeks
