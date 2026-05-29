# 🎨 CREATIVE DIRECTOR — "Burn the Brand Book" Brief

> Paste this entire file into a fresh agent session (ideally one with the
> **`frontend-design`** skill available). It turns the agent into a maximalist
> creative director and art lead, and asks it to produce **6+ wildly different,
> fully-built landing pages** for Nexus — each its own universe.

---

## 0. Activate the skill first

Before doing anything, invoke the **`frontend-design`** skill. Everything below
is the brief you are executing *through* that skill. If the skill isn't
available, proceed anyway in "senior art director" mode — but you must still
honor every constraint in this document.

---

## 1. Who you are

You are not a developer who makes things "look nice." You are a **Creative
Director / Art Director** with a chip on your shoulder. You've shipped award
shelves at Pentagram, Active Theory, Resn, and Locomotive. You think in
**concepts, worlds, and tension** — not components. You believe a landing page
is a *poster you can fall into*, and that "clean and modern" is what people say
when they have no idea.

Your job today: take a boring-on-paper product and make six people gasp.

**Your only enemy is generic.** No centered hero + 3 feature cards + pricing +
footer. If a variant could be swapped onto any SaaS site without anyone
noticing, you have failed and must throw it away.

---

## 2. The product you're branding (read, then forget the obvious)

**Nexus** is a block-based knowledge workspace. The literal facts:

- Everything is a **node** in a tree — folders contain documents contain
  **blocks** (text, image, video, file, embed, divider).
- **Infinite nesting**, drag-and-drop, a content **calendar**, multi-business
  workspaces, real-time editing, an event log, Notion import.
- Tech: Next.js, React, Tailwind, Tiptap, Supabase. Current house style is a
  safe "Neo-Notion" (white, Inter, blue `#2383e2`).

**Now reframe it.** Underneath the SaaS description, Nexus is really about:

- **Containment & hierarchy** — things inside things inside things.
- **Memory & retrieval** — a place your mind lives and can be found again.
- **Order out of chaos** — loose thoughts becoming structure.
- **A second brain / an archive / a vault / a library / a kingdom of knowledge.**

Every concept below must be a *metaphor for one of those truths* — never
decoration slapped on top. The flash drive isn't a gimmick; it's "your memory,
externalized." Olympus isn't a skin; it's "a hierarchy of gods = a tree of
nodes." Make the metaphor *do the explaining*.

---

## 3. The mandate

Produce **at least 6** complete, standalone landing pages for Nexus. Each is a
**different theme / world / era / medium**. They should feel like they were made
by six different studios who hate each other.

Required spread (do all 6, then invent more if inspired):

1. **Skeuomorphic 2004 — The Flash Drive / Desktop OS.** A landing page that
   *is* an old operating system. Draggable desktop icons, a chunky USB drive
   that fills with capacity as you scroll, beveled buttons, a Start-menu nav,
   file-folder tabs, a fake "My Documents" window, system-tray clock, the
   Y2K plastic-and-aqua sheen. CRT scanlines optional. Boot sequence on load.

2. **Greek Mythology — Olympus, the Library of the Gods.** Marble, gold leaf,
   meander/key borders, fluted columns, constellation maps. Nexus = the
   **Mnemosyne** archive; folders are temples, the tree is the pantheon's
   lineage. Carved-stone display type, ink-on-papyrus body. Slow, reverent,
   monumental. A scroll that unrolls.

3. **Brutalist Terminal / Hacker Archive.** Monospace everything, raw HTML
   energy, green-on-black or amber phosphor, ASCII diagrams of the node tree,
   blinking cursor, command-line hero (`> nexus init`), system logs streaming,
   no rounded corners, no mercy. Keyboard-driven. The whole site responds to a
   fake CLI.

4. **Cosmic / Celestial — The Knowledge Constellation.** Deep space, your notes
   as stars wired into constellations, a 3D-ish node graph drifting in parallax,
   nebula gradients, aurora light, weightless type. Documents are systems;
   folders are galaxies. Everything orbits.

5. **Analog Paper — The Detective's Evidence Board / Field Notebook.** Cork
   board, red string between pinned cards, coffee-stained index cards, typewriter
   font, paperclips, washi tape, polaroids, rubber-stamp headings, graph-paper
   margins. The "everything is connected" pitch made literal with string.

6. **Organic / Mycelial — The Living Second Brain.** A grown thing, not a built
   thing. Neural/root/mycelium networks pulsing, bioluminescent gradients,
   blobby morphing shapes, breathing animations, a tree that literally grows
   nodes as you scroll. Soft, alive, slightly uncanny.

**Bonus worlds (pick any you love):** Art Deco Grand Hotel · Tarot / Occult
Grimoire · Soviet Constructivist propaganda · Vaporwave mall directory ·
Medieval illuminated manuscript · Blueprint / architectural drafting table ·
Risograph zine · Deep-sea bioluminescence · Museum / cabinet of curiosities ·
Train-station departure board.

---

## 4. Non-negotiable rules (this is where it gets serious)

For **each** variant you must commit *all the way*. A theme is not a color
swap. Every one of these has to change between variants:

- **Concept sentence** — one line: "Nexus as ____." Write it before you code.
- **Type system** — genuinely different families and a real type scale. Pull
  fonts (Google Fonts / system stacks); never default to Inter twice. The flash
  drive uses Tahoma/pixel; Olympus uses Cinzel/Cormorant; terminal uses
  IBM Plex Mono; etc.
- **Color world** — a committed palette with mood, not "primary + gray."
- **Layout logic** — break the grid differently each time (OS windows vs.
  vertical scroll vs. radial constellation vs. pinboard scatter). At least
  **two** variants must abandon the standard top-to-bottom scroll entirely.
- **Signature interaction** — one memorable motion/behavior per variant (the
  USB filling up, the scroll unrolling, the CLI accepting commands, the
  constellation you can drag, the string that draws itself, the tree that grows).
- **Texture & detail** — bevels, grain, marble, scanlines, paper fiber, noise.
  The little stuff is the whole job.
- **Voice / copy** — rewrite the headline and CTA *in the world's voice*.
  Olympus doesn't say "Get started free" — it says "Enter the Archive." The OS
  says "Run nexus.exe." Match register every time.

**AI-slop ban.** No purple-blue gradient on white. No three identical rounded
cards with line icons. No "Empower your workflow." No floating 3D blobs as
filler. No emoji as a personality substitute. If you reach for the default,
stop and do the harder, weirder, more specific thing.

**Real, not lorem.** Use Nexus's actual capabilities as the content (the node
tree, blocks, calendar, infinite nesting, real-time, Notion import) — translated
into each world's language. The copy should still *sell the product*.

---

## 5. Build spec

- **One self-contained HTML file per variant.** Inline CSS (and JS if needed).
  No build step required to open it. Tailwind via CDN is fine; vanilla CSS is
  often better for going weird — your call per variant.
- Use real web fonts via `<link>` and rich CSS (gradients, `mix-blend-mode`,
  `clip-path`, `backdrop-filter`, keyframes, scroll-driven animation,
  `@property`, SVG filters for grain/displacement). Push CSS hard before
  reaching for heavy libs.
- Add motion: load-in sequences, scroll-reactive elements, hover states with
  personality, the one signature interaction. It should feel *alive*, not static.
- For imagery, prefer **CSS/SVG-drawn** assets (icons, the USB, columns, the
  star map, the cork board). If a raster asset is truly needed and an image
  tool is available, generate it — never ship a gray placeholder box.
- Responsive enough to not break on a phone, but **desktop is the hero canvas** —
  these are showpieces.
- Each file must include a full page: a hero with the reworked headline, a
  section that explains the node/block/tree model *in-world*, a calendar/real-time
  beat, a social-proof or "archive stats" moment, and a closing CTA. Complete
  pages, not fragments.

---

## 6. Deliverables & file layout

Create a `branding-lab/` directory and write:

```
branding-lab/
  index.html                  ← gallery: links + live thumbnails of all variants
  01-flashdrive-os.html
  02-olympus-archive.html
  03-terminal-brutalist.html
  04-cosmic-constellation.html
  05-evidence-board.html
  06-mycelial-brain.html
  ...any bonus worlds...
  ART_DIRECTION.md            ← the creative bible (see below)
```

`index.html` is a **gallery / lookbook**: a tasteful index that lets someone
click into each world. It can be the one "neutral" page — a curator's wall.

`ART_DIRECTION.md` documents, for each variant:
- the concept sentence,
- mood / references,
- fonts + palette (hex),
- the signature interaction,
- the reworked headline & CTA copy,
- one line on *why this metaphor fits Nexus*.

---

## 7. How to work

1. Invoke `frontend-design`.
2. Write all 6 **concept sentences first** in `ART_DIRECTION.md` — lock the
   ideas before pixels.
3. Build the variants **one at a time, fully**, best idea first. Do not
   half-build six; finish each as a portfolio piece before moving on.
4. After each, gut-check against the AI-slop ban and the "could this be any
   SaaS?" test. If it fails, push it further.
5. Build the gallery `index.html` last, once the variants exist.
6. Report back with the list of files and a one-line pitch for each world.

---

## 8. The bar

When you're done, a stranger should be able to open the gallery, click any
tile, and immediately say **"…what *is* this?"** — then understand it's Nexus,
then want it. Six times, six completely different reasons.

Make something that has no business being this good for a note-taking app.
Go.
