export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: { name: string; initials: string; role: string };
  readTime: number;
  tags: string[];
  body: string;
  character: 'c-write' | 'c-girl' | 'c-jump' | 'c-wave' | 'c-team';
  cardColor: string;
}

const POSTS: BlogPost[] = [
  {
    slug: 'why-your-team-wiki-is-always-out-of-date',
    title: 'Why your team wiki is always out of date — and what to do about it',
    excerpt: "Every team builds a wiki. Every team stops trusting it. Here's why that keeps happening, and a different way to think about it.",
    date: '2025-05-12',
    author: { name: 'Ayo Reeves', initials: 'AR', role: 'Co-founder' },
    readTime: 6,
    tags: ['Knowledge management', 'Teams'],
    character: 'c-write' as const,
    cardColor: 'radial-gradient(ellipse at 70% 80%, #c08a3e33, #b14e2c22 60%, transparent)',
    body: `
<p>The problem isn't that your team is lazy about documentation. The problem is that most wikis are designed as filing cabinets — you put something in, it sits there, and nothing reminds you it exists until someone complains it's wrong.</p>

<h2>The decay is structural</h2>
<p>A wiki document has no relationship to the work it describes. It lives in one place; the actual decisions, tickets, and changes happen somewhere else. So when a product changes — and products always change — the wiki document stays frozen in the past.</p>
<p>No one is responsible. No one is reminded. The wiki quietly becomes a museum.</p>

<h2>Most "fixes" make it worse</h2>
<p>The usual response is a documentation sprint: a week where the whole team "catches up." This feels productive. It isn't. Six weeks later you're back to the same state, except now everyone is more cynical about the process.</p>
<p>Another common fix is governance — an owner for each page, a quarterly review process, a Notion template with a "last reviewed" field. This works in organizations that have the dedicated headcount to enforce it. Most don't.</p>

<h2>What actually works: tighter coupling</h2>
<p>The wikis that stay fresh share one trait: they are physically close to the work they describe. A doc that lives in the same place as the PR, the sprint board, and the Slack thread about the decision has a fighting chance of getting updated.</p>
<p>Nexus is built around this idea. Every document is a node in a tree that mirrors how your organization actually thinks — not a flat list of files, but a living structure that grows with you. When a project changes, the docs that live inside it are one click away. Ownership is obvious. Context is immediate.</p>
<p>We're also building tools to surface staleness automatically — a document that hasn't been touched in six months and references a product you shipped two years ago should tell you that. Not aggressively. Calmly, with enough context to decide whether to update it or archive it.</p>

<h2>The practical advice</h2>
<p>While we finish those features, the best thing you can do is reduce distance. Fewer, better-placed documents beat comprehensive, sprawling ones. A three-paragraph page that lives exactly where your team works will outlast a thorough knowledge base that no one has bookmarked.</p>
<p>Put documentation where the work is. The rest tends to follow.</p>
    `.trim(),
  },
  {
    slug: 'one-tree-to-rule-them-all',
    title: 'One tree to rule them all: the case for a unified node model',
    excerpt: 'Most tools separate "documents" from "folders" from "databases." We think that distinction causes more problems than it solves.',
    date: '2025-04-28',
    author: { name: 'Ayo Reeves', initials: 'AR', role: 'Co-founder' },
    readTime: 5,
    tags: ['Product', 'Design'],
    character: 'c-girl' as const,
    cardColor: 'radial-gradient(ellipse at 70% 80%, #b14e2c2e, #c08a3e1a 60%, transparent)',
    body: `
<p>When you open a typical knowledge tool, you're immediately asked to make a choice: is this a page? A database? A folder? A doc?</p>
<p>These distinctions feel meaningful at first. They become friction fast.</p>

<h2>The container problem</h2>
<p>Notion popularized the idea that everything can be a database, and then a page inside that database, and then a database inside that page. It's clever. It's also how you end up with a workspace where finding anything requires knowing whether the thing you want is a "linked database view" or a "table inline block" or a "full-page database child."</p>
<p>Google Drive goes the other way — everything is a file inside a folder. Clean, familiar, and completely useless for structured information. A drive full of Google Docs is just a slightly more organized desktop.</p>

<h2>A simpler model: nodes all the way down</h2>
<p>In Nexus, there's one concept: a node. A node has a type — document, folder, or calendar entry — and it can contain other nodes. That's it.</p>
<p>A folder isn't a special container. It's a node that happens not to have editor content. A calendar entry isn't a separate system. It's a document node with a date attached. Moving something from a folder into a teamspace isn't a migration. It's changing a parent pointer.</p>
<p>This sounds like an implementation detail. In practice, it changes how you think about your workspace. You don't need to decide whether a "Launch Plan" is a document or a database. You just create it, nest everything that belongs to it inside it, and move on.</p>

<h2>Why this matters for teams</h2>
<p>The biggest cost of complex tool models isn't learning time — it's organizational friction. When every new piece of information requires a decision about what type of thing it is, people stop documenting. They default to the path of least resistance: a Slack message or a Drive doc that nobody will find in six months.</p>
<p>A simpler model means your team can capture first and organize later. The tree accommodates both the quick scratch note and the carefully structured project brief. They're the same kind of thing; they just live in different places.</p>
    `.trim(),
  },
  {
    slug: 'content-calendar-in-the-same-workspace',
    title: 'Your content calendar belongs inside your knowledge base',
    excerpt: 'Running content planning in a separate tool from your actual content creates a gap that causes delays, missed context, and extra coordination work.',
    date: '2025-04-10',
    author: { name: 'Priya Iyer', initials: 'PI', role: 'Head of Product' },
    readTime: 4,
    tags: ['Content', 'Workflow'],
    character: 'c-jump' as const,
    cardColor: 'radial-gradient(ellipse at 70% 80%, #5e715226, #c08a3e1a 60%, transparent)',
    body: `
<p>Content teams have a calendar problem. The calendar is in Airtable. The briefs are in Google Docs. The published posts are on the website. The performance data is in Notion. The conversations about what to write next are in Slack.</p>
<p>These are four or five different systems, and at least as many mental context-switches per day. Something always falls through.</p>

<h2>The coordination tax</h2>
<p>Every boundary between tools is a place where information can get lost. When a brief lives in a different tool than the calendar entry it belongs to, updating one doesn't update the other. When the strategy document that explains why you're writing something lives somewhere else entirely, new team members spend their first weeks excavating history rather than contributing.</p>
<p>We built Nexus's content calendar for this reason. Every calendar entry is a document node with a date. When you plan a post, you're not creating a card that links to a doc — you're creating the doc, right there on the timeline. Everything that belongs to it — the brief, the outline, the draft, the feedback — lives inside it as nested nodes.</p>

<h2>What changes</h2>
<p>The visible change is obvious: one fewer tool to open. The deeper change is harder to describe. When planning and execution happen in the same place, the calendar isn't just a schedule — it becomes the living record of your content work. You can look at any week from last quarter and see exactly what you published, what the brief said, and what conversation happened around it.</p>
<p>That institutional memory turns out to be surprisingly valuable. New writers can onboard by reading past work in context. Strategy conversations get anchored to the actual content rather than floating in Slack threads. The calendar earns trust because it's always accurate.</p>
<p>Try collapsing your content stack into one place. You might find you don't miss the others.</p>
    `.trim(),
  },
  {
    slug: 'real-time-collaboration-without-chaos',
    title: 'Real-time collaboration without the chaos',
    excerpt: "Live editing is easy to demo. Making it feel calm for a team that writes together every day is harder. Here's how we approached it.",
    date: '2025-03-19',
    author: { name: 'Marcus Olin', initials: 'MO', role: 'Engineering' },
    readTime: 7,
    tags: ['Engineering', 'Collaboration'],
    character: 'c-wave' as const,
    cardColor: 'radial-gradient(ellipse at 70% 80%, #5e715230, #b14e2c18 60%, transparent)',
    body: `
<p>Live collaboration in text editors is one of those features that's impressive for thirty seconds and then quietly stressful for the next six months.</p>
<p>You've experienced this. You open a doc to finish an important paragraph. Your cursor is there. Another cursor materializes from somewhere. You both start typing. The text merges in ways that require immediate repair. You close the tab and go back to emailing drafts.</p>

<h2>The cursor isn't the problem</h2>
<p>The problem isn't live editing itself — it's the absence of social context. In a physical room, you can see who's working on what section. You can say "I've got the intro" and there's no ambiguity. In a real-time editor, two people reaching for the same paragraph have no signal that they're about to collide until they already have.</p>
<p>Nexus uses Yjs under the hood for CRDT-based real-time sync. CRDTs handle the mathematical merge problem cleanly: two simultaneous edits can be combined without a server deciding which one wins. But CRDTs don't solve the social problem.</p>

<h2>What we added</h2>
<p>We show each user's cursor and selection with their avatar. When someone is actively typing in a block, that block gets a subtle presence indicator. These are small signals, but they're enough to shift behavior. People naturally spread out. If you see someone in the intro, you start on the third section.</p>
<p>We also think about offline and slow connections differently. Rather than pretending everything is always live, Nexus degrades gracefully: your edits are queued locally and sync when your connection recovers. You never lose work, and you're never stuck staring at a spinner while you write.</p>

<h2>The design constraint</h2>
<p>The hardest constraint we gave ourselves: collaboration should feel calm. Not exciting. Not impressive. Calm. The best version of real-time editing is one where you stop thinking about the technology and focus on the writing.</p>
<p>We're still working toward that standard. But that's the bar we're aiming for.</p>
    `.trim(),
  },
  {
    slug: 'import-your-notion-workspace',
    title: 'How to bring your Notion workspace into Nexus in under an hour',
    excerpt: 'A practical walkthrough of the import flow — what moves cleanly, what to watch for, and how to handle edge cases.',
    date: '2025-03-03',
    author: { name: 'Priya Iyer', initials: 'PI', role: 'Head of Product' },
    readTime: 5,
    tags: ['How-to', 'Import'],
    character: 'c-team' as const,
    cardColor: 'radial-gradient(ellipse at 70% 80%, #c08a3e28, #5e715220 60%, transparent)',
    body: `
<p>The biggest reason teams don't switch knowledge tools isn't price or features — it's the cost of moving years of documentation. We've tried to make that cost as low as possible.</p>

<h2>What imports cleanly</h2>
<p>Paste any Notion page URL into the Nexus import dialog and it arrives as a native Nexus document. Paragraphs, headings, bullet and numbered lists, checkboxes, code blocks, quotes, tables, and images all transfer. Inline formatting — bold, italic, code, links — comes through as you'd expect.</p>
<p>Nested pages work too. If a Notion page has sub-pages, Nexus creates child nodes for each one, preserving the hierarchy. You can import a top-level Notion section and get the full tree in one pass.</p>

<h2>What to watch for</h2>
<p>A few Notion-specific constructs don't have a direct Nexus equivalent yet. Databases with filtered views, rollup properties, and relation columns don't import — these are structured data features we're building toward. If you rely heavily on Notion databases, you'll want to export those separately as CSV while you're transitioning.</p>
<p>Synced blocks also don't carry over — they arrive as static copies of their content at import time, which is usually what you want anyway.</p>

<h2>The practical workflow</h2>
<p>For most teams, the simplest approach is to import section by section rather than all at once. Start with your most-used pages — the docs your team touches every week. Get comfortable with the Nexus structure. Then import older reference material in batches.</p>
<p>Don't try to recreate your Notion structure exactly in Nexus. Use the import as an opportunity to clean up. Move things that belong together into the same teamspace. Archive pages that haven't been touched in a year. A fresh structure in Nexus is often worth more than a faithful copy of the old one.</p>
<p>The goal isn't to have Notion in a different interface. It's to have a workspace that works the way you actually think.</p>
    `.trim(),
  },
];

export function getPosts(): BlogPost[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
