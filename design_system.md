# Nexus Design System & Structure

This document outlines the core styling, structure, and design principles for the Nexus project. This serves as the source of truth for all UI development. Do not change these styles without explicit request.

## Visual Excellence & Aesthetics
Nexus follows a "Neo-Notion" aesthetic: clean, high-contrast, and professional, with a focus on typography and subtle micro-interactions.

### Color Palette

| Name | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | `#ffffff` | `#191919` | Main page background |
| **Foreground** | `#37352f` | `#ffffff` | Primary text color |
| **Sidebar** | `#fbfbfa` | `#111111` | Navigation and side panels |
| **Border** | `rgba(55, 53, 47, 0.09)` | `rgba(255, 255, 255, 0.08)` | Subtle separators |
| **Muted** | `rgba(55, 53, 47, 0.4)` | `rgba(255, 255, 255, 0.55)` | Secondary text and icons |
| **Accent** (Blue) | `#2383e2` | `#2383e2` | Links, highlights, and primary actions |
| **CTA Background** | `#37352f` | `#ffffff` | Call to action buttons |
| **CTA Foreground** | `#ffffff` | `#111111` | Text inside CTA buttons |

### Typography
- **Sans-Serif**: `Inter`, ui-sans-serif, system-ui, sans-serif. Used for body text and general UI.
- **Display**: `Outfit`, `Inter`, sans-serif. Used for headings and brand elements.
- **Heading Styles**: 
  - `h1`: `text-7xl` or `text-[5.5rem]`, `font-black`, `tracking-tighter`, `leading-[0.9]`.
  - `h2`: `text-5xl`, `font-black`, `tracking-tight`.

### UI Components & Patterns
- **Buttons**: Rounded-xl (12px), bold text, subtle scale-on-click animations.
- **Glassmorphism**: Use `backdrop-blur-md` for fixed headers and overlays.
- **Shadows**:
  - `shadow-notion`: Subtle depth for cards.
  - `shadow-popover`: Deep, soft shadows for dropdowns and modals.
- **Spacing**: Generous whitespace (e.g., `py-32`, `px-6`) to maintain a premium feel.

### Core Structure (Homepage)
1. **Sticky Navbar**: Height 64px (`h-16`), transparent by default, blurs on scroll.
2. **Hero Section**: Centered text, large display font, animated entry (fade-in, slide-in).
3. **Feature Sections**: High-contrast alternates between background and sidebar-colored backgrounds.
4. **Mock Dashboards**: Visual demonstrations using background-colored containers and subtle borders.

## Implementation Rules
> [!IMPORTANT]
> **No Ad-hoc Styles**: Always use these CSS variables and Tailwind utilities.
> **No Placeholders**: Use `generate_image` for missing assets.
> **Consistency**: Maintain the "Neo-Notion" look across all new pages and components.
