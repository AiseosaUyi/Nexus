export interface DocItem {
  slug: string;
  title: string;
}

export interface DocSection {
  title: string;
  slug: string;
  items: DocItem[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    title: 'Getting started',
    slug: 'getting-started',
    items: [
      { slug: 'what-is-nexus', title: 'What is Nexus?' },
      { slug: 'quick-start', title: 'Quick start' },
      { slug: 'core-concepts', title: 'Core concepts' },
    ],
  },
  {
    title: 'The editor',
    slug: 'editor',
    items: [
      { slug: 'writing-with-blocks', title: 'Writing with blocks' },
      { slug: 'slash-commands', title: 'Slash commands' },
      { slug: 'tables-and-media', title: 'Tables & media' },
      { slug: 'ai-assist', title: 'AI assist' },
    ],
  },
  {
    title: 'Organization',
    slug: 'organization',
    items: [
      { slug: 'the-node-tree', title: 'The node tree' },
      { slug: 'teamspaces', title: 'Teamspaces' },
      { slug: 'moving-and-nesting', title: 'Moving & nesting' },
      { slug: 'content-calendar', title: 'Content calendar' },
    ],
  },
  {
    title: 'Collaboration',
    slug: 'collaboration',
    items: [
      { slug: 'live-editing', title: 'Live editing' },
      { slug: 'comments', title: 'Comments & mentions' },
      { slug: 'roles-and-permissions', title: 'Roles & permissions' },
      { slug: 'sharing', title: 'Sharing pages' },
    ],
  },
  {
    title: 'Import & export',
    slug: 'import-export',
    items: [
      { slug: 'import-notion', title: 'Import from Notion' },
      { slug: 'import-google-docs', title: 'Import from Google Docs' },
      { slug: 'import-markdown', title: 'Import Markdown' },
    ],
  },
  {
    title: 'Workspace settings',
    slug: 'settings',
    items: [
      { slug: 'members-and-invites', title: 'Members & invites' },
      { slug: 'workspace-settings', title: 'Workspace settings' },
    ],
  },
];

export function getAllDocSlugs(): string[] {
  return DOC_SECTIONS.flatMap((s) => s.items.map((i) => i.slug));
}

export function findDocItem(slug: string): { section: DocSection; item: DocItem } | undefined {
  for (const section of DOC_SECTIONS) {
    const item = section.items.find((i) => i.slug === slug);
    if (item) return { section, item };
  }
}
